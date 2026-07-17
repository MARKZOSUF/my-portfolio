import { json, requireUser } from "../_shared/auth.js";
export async function onRequestGet({ request, env }) {
  if (!env.DB || !env.FILES) return json({ files: [], storage: "browser", cloudConfigured: false, warning: "R2 is optional. Local browser files are still available." });
  const user = await requireUser(request, env);
  const requestedId = new URL(request.url).searchParams.get("id");
  if (requestedId) {
    const row = await env.DB.prepare(
      "SELECT name,storage_key AS storageKey,mime,size FROM files WHERE id=? AND user_id=?"
    ).bind(requestedId, user.id).first();
    if (!row) return json({ error: "File not found." }, 404);
    const object = await env.FILES.get(row.storageKey);
    if (!object) return json({ error: "Stored file is missing." }, 404);
    const safeName = String(row.name || "download").replace(/[\r\n"\\]/g, "_");
    return new Response(object.body, {
      headers: {
        "Content-Type": row.mime || "application/octet-stream",
        "Content-Length": String(row.size || object.size || 0),
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
  const result = await env.DB.prepare(`SELECT id,name,mime,size,created_at AS createdAt FROM files WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).bind(user.id).all();
  return json({ files: result.results || [] });
}
export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.FILES) return json({ error: "Cloud storage is optional and not configured. Use Upload local, or add DB and FILES bindings." }, 503);
  const user = await requireUser(request, env);
  const form = await request.formData(), file = form.get("file");
  if (!(file instanceof File)) return json({ error: "File is required." }, 400);
  if (file.size > 20*1024*1024) return json({ error: "Maximum file size is 20 MB." }, 413);
  const used = await env.DB.prepare("SELECT COALESCE(SUM(size),0) AS total FROM files WHERE user_id=?").bind(user.id).first();
  const quotas = { free: 100*1024*1024, student: 500*1024*1024, developer: 1024*1024*1024, plus: 1024*1024*1024, pro: 2*1024*1024*1024 };
  const quota = quotas[user.plan] || quotas.free;
  if (Number(used?.total || 0) + file.size > quota) return json({ error: "Cloud storage quota reached." }, 413);
  const id=crypto.randomUUID(), key=`${user.id}/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  await env.FILES.put(key,file.stream(),{httpMetadata:{contentType:file.type||"application/octet-stream"}});
  await env.DB.prepare(`INSERT INTO files(id,user_id,name,storage_key,mime,size,created_at) VALUES(?,?,?,?,?,?,?)`).bind(id,user.id,file.name.slice(0,240),key,file.type||"",file.size,Date.now()).run();
  return json({ uploaded:true, file:{id,name:file.name,size:file.size,mime:file.type} },201);
}
export async function onRequestDelete({ request, env }) {
  if (!env.DB || !env.FILES) return json({ error: "Cloud storage is optional and not configured. No cloud file was deleted." }, 503);
  const user=await requireUser(request,env), id=new URL(request.url).searchParams.get("id");
  const row=await env.DB.prepare(`SELECT storage_key AS key FROM files WHERE id=? AND user_id=?`).bind(id,user.id).first();
  if(!row)return json({error:"File not found."},404);
  await env.FILES.delete(row.key); await env.DB.prepare("DELETE FROM files WHERE id=? AND user_id=?").bind(id,user.id).run();
  return json({deleted:true});
}
