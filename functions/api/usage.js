import { json, getUser } from "../_shared/auth.js";
import { getSetting } from "../_shared/security.js";
export async function onRequestGet({ request, env }) {
  const user = await getUser(request, env);
  if (!user) return json({ authenticated:false, plan:"guest", used:0, limit:0, hourlyMessages:0, hourlyLimit:0 });
  if (!env.DB) return json({ error:'D1 binding "DB" is not configured.' },503);
  const now=Date.now(),day=new Date(now);day.setUTCHours(0,0,0,0);
  const [daily,hourly,row]=await env.DB.batch([
    env.DB.prepare("SELECT COALESCE(SUM(input_chars+output_chars),0) AS total FROM usage WHERE user_id=? AND created_at>=?").bind(user.id,day.getTime()),
    env.DB.prepare("SELECT COUNT(*) AS total FROM usage WHERE user_id=? AND created_at>=?").bind(user.id,now-3600000),
    env.DB.prepare("SELECT CASE WHEN plan_expires_at>0 AND plan_expires_at<? THEN 'free' ELSE plan END AS plan,token_limit AS tokenLimit,plan_expires_at AS planExpiresAt FROM users WHERE id=?").bind(now,user.id)
  ]);
  const info=row.results?.[0]||{},defaults={free:50000,student:250000,plus:500000,pro:2500000,developer:1000000},hourDefaults={free:30,student:150,plus:250,pro:500,developer:1000};
  const limit=Number(info.tokenLimit||await getSetting(env,"default_token_limit",String(defaults[info.plan]||50000)));
  const hourlyLimit=Number(await getSetting(env,`hourly_limit_${info.plan}`,String(hourDefaults[info.plan]||30)));
  return json({authenticated:true,plan:info.plan||"free",planExpiresAt:Number(info.planExpiresAt||0),used:Number(daily.results?.[0]?.total||0),limit,hourlyMessages:Number(hourly.results?.[0]?.total||0),hourlyLimit});
}
