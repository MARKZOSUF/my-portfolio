import { json, getUser } from "../../_shared/auth.js";
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  return json({ authenticated: Boolean(user), user: user || null, accessIdentity: Boolean(user?.accessIdentity), configured: Boolean(env.DB) });
}
