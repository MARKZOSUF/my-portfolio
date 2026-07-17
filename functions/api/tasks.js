import { json, logUsage, requireUser } from "../_shared/auth.js";
import { enforceChatAccess, enforceRateLimit } from "../_shared/security.js";

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const EXTERNAL_DELIVERY = new Set(["telegram", "discord", "slack"]);

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  try {
    const user = await requireUser(request, env);
    const result = await env.DB.prepare(
      "SELECT id,name,type,schedule,next_run AS nextRun,prompt,delivery,enabled,last_run AS lastRun,created_at AS createdAt FROM tasks WHERE user_id=? ORDER BY next_run"
    ).bind(user.id).all();
    return json({ tasks: (result.results || []).map(item => ({ ...item, enabled: Boolean(item.enabled) })) });
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  try {
    const user = await requireUser(request, env);
    await enforceRateLimit(request, env, "task-write", 30, 3600);
    const body = await request.json().catch(() => ({}));
    if (body.action === "save" && body.task?.id) return saveTask(body.task, user, env);
    if (body.action === "run" && body.task?.id) return runTask(body.task.id, user, request, env);
    return json({ error: "Invalid task action." }, 400);
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}

async function saveTask(task, user, env) {
  const type = ["reminder", "research", "news", "project"].includes(task.type) ? task.type : "reminder";
  const schedule = ["once", "daily", "weekly"].includes(task.schedule) ? task.schedule : "once";
  const delivery = ["notification", "email", "telegram", "discord", "slack"].includes(task.delivery) ? task.delivery : "notification";
  if (EXTERNAL_DELIVERY.has(delivery) && user.role !== "admin") {
    return json({ error: "External webhook delivery is restricted to the administrator." }, 403);
  }
  const nextRun = Number(task.nextRun || Date.now());
  if (!Number.isFinite(nextRun) || nextRun > Date.now() + 5 * 365 * 86400000) return json({ error: "Invalid task date." }, 400);
  const existing = await env.DB.prepare("SELECT id FROM tasks WHERE id=? AND user_id=?").bind(String(task.id), user.id).first();
  if (!existing) {
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM tasks WHERE user_id=?").bind(user.id).first();
    if (Number(count?.total || 0) >= 25) return json({ error: "A maximum of 25 scheduled tasks is allowed per account." }, 409);
  }
  await env.DB.prepare(`
    INSERT INTO tasks(id,user_id,name,type,schedule,next_run,prompt,delivery,enabled,last_run,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,schedule=excluded.schedule,
      next_run=excluded.next_run,prompt=excluded.prompt,delivery=excluded.delivery,enabled=excluded.enabled,
      last_run=excluded.last_run WHERE user_id=excluded.user_id
  `).bind(
    String(task.id).slice(0, 100), user.id, String(task.name || "Task").slice(0, 100), type, schedule,
    nextRun, String(task.prompt || "").slice(0, 10000), delivery, task.enabled ? 1 : 0,
    Number(task.lastRun || 0), Number(task.createdAt || Date.now())
  ).run();
  return json({ saved: true });
}

async function runTask(taskId, user, request, env) {
  if (!env.AI) return json({ error: "Workers AI binding is required." }, 503);
  await enforceRateLimit(request, env, "task-run", 5, 300);
  await enforceChatAccess(request, env, 1000);
  const task = await env.DB.prepare("SELECT id,prompt FROM tasks WHERE id=? AND user_id=?").bind(String(taskId), user.id).first();
  if (!task) return json({ error: "Task not found." }, 404);
  const model = env.CF_MODEL_TASKS || MODEL;
  const result = await env.AI.run(model, {
    messages: [
      { role: "system", content: "Complete the saved scheduled AI task. Be concise, accurate and useful." },
      { role: "user", content: task.prompt }
    ],
    max_tokens: 1200
  });
  const answer = String(result?.response || result?.result || "Task completed.").slice(0, 30000);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO task_runs(id,task_id,user_id,result,status,created_at) VALUES(?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), task.id, user.id, answer, "completed", Date.now()),
    env.DB.prepare("UPDATE tasks SET last_run=? WHERE id=? AND user_id=?").bind(Date.now(), task.id, user.id)
  ]);
  await logUsage(env, {
    userId: user.id, ip: request.headers.get("CF-Connecting-IP"), feature: "task-run", model,
    inputChars: task.prompt.length, outputChars: answer.length
  });
  return json({ result: answer });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  try {
    const user = await requireUser(request, env);
    const id = new URL(request.url).searchParams.get("id");
    await env.DB.prepare("DELETE FROM tasks WHERE id=? AND user_id=?").bind(id, user.id).run();
    return json({ deleted: true });
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}
