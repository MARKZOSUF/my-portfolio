import { json } from "../_shared/auth.js";
import { enforceRateLimit, requireAdmin } from "../_shared/security.js";

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(request, env);
    return json({ integrations: integrationStatus(env) });
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAdmin(request, env);
    await enforceRateLimit(request, env, "owner-integrations", 20, 60);
    const body = await request.json().catch(() => ({}));
    const integration = body.integration;

    if (integration === "github") return github(body, env);
    if (integration === "google") return google(body, env);
    if (integration === "microsoft") return microsoft(body, env);
    if (integration === "notion") return notion(body, env);

    const message = String(body.message || "").trim().slice(0, 4000);
    if (!message) return json({ error: "A message is required." }, 400);
    if (integration === "slack") return webhook(env.SLACK_WEBHOOK_URL, { text: message }, "Slack");
    if (integration === "discord") return webhook(env.DISCORD_WEBHOOK_URL, { content: message }, "Discord");
    if (integration === "telegram") return telegram(message, env);
    return json({ error: "Unknown integration." }, 400);
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
}

function integrationStatus(env) {
  return {
    google: Boolean(env.GOOGLE_WORKSPACE_ACCESS_TOKEN),
    github: Boolean(env.GITHUB_TOKEN),
    notion: Boolean(env.NOTION_API_KEY),
    slack: Boolean(env.SLACK_WEBHOOK_URL),
    discord: Boolean(env.DISCORD_WEBHOOK_URL),
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
    microsoft: Boolean(env.MICROSOFT_GRAPH_ACCESS_TOKEN),
    mcp: Boolean(env.MCP_ALLOWED_HOSTS)
  };
}

async function github(body, env) {
  const repo = String(body.repo || "").trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return json({ error: "Use owner/repository format." }, 400);
  const path = String(body.path || "").replace(/^\/+/, "");
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(path)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "MARKZOSUF-AI-NEXUS"
    }
  });
  const data = await response.json();
  if (!response.ok) return json({ error: data.message || "GitHub request failed." }, response.status);
  if (data.content) {
    const text = new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0)));
    return json({ name: data.name, path: data.path, text: text.slice(0, 150000), url: data.html_url });
  }
  return json({ items: (Array.isArray(data) ? data : []).slice(0, 100).map(item => ({ name: item.name, type: item.type, path: item.path, url: item.html_url })) });
}

async function google(body, env) {
  if (!env.GOOGLE_WORKSPACE_ACCESS_TOKEN) return json({ error: "Google Workspace is not configured." }, 503);
  const headers = { Authorization: `Bearer ${env.GOOGLE_WORKSPACE_ACCESS_TOKEN}` };
  let endpoint;
  if (body.service === "drive") endpoint = "https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,modifiedTime,webViewLink)";
  else if (body.service === "gmail") endpoint = "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15";
  else {
    const now = new Date().toISOString();
    endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=20&timeMin=${encodeURIComponent(now)}`;
  }
  const response = await fetch(endpoint, { headers });
  const data = await response.json();
  return response.ok ? json(data) : json({ error: data.error?.message || "Google request failed." }, response.status);
}

async function microsoft(body, env) {
  if (!env.MICROSOFT_GRAPH_ACCESS_TOKEN) return json({ error: "Microsoft Graph is not configured." }, 503);
  const headers = { Authorization: `Bearer ${env.MICROSOFT_GRAPH_ACCESS_TOKEN}`, Accept: "application/json" };
  let endpoint = "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=30";
  if (body.service === "mail") endpoint = "https://graph.microsoft.com/v1.0/me/messages?$top=15&$select=subject,from,receivedDateTime,webLink";
  if (body.service === "calendar") endpoint = "https://graph.microsoft.com/v1.0/me/events?$top=20&$select=subject,start,end,webLink";
  const response = await fetch(endpoint, { headers });
  const data = await response.json();
  return response.ok ? json(data) : json({ error: data.error?.message || "Microsoft Graph failed." }, response.status);
}

async function notion(body, env) {
  if (!env.NOTION_API_KEY) return json({ error: "Notion is not configured." }, 503);
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: JSON.stringify({ query: String(body.query || "").slice(0, 200), page_size: 25 })
  });
  const data = await response.json();
  return response.ok ? json(data) : json({ error: data.message || "Notion failed." }, response.status);
}

async function webhook(url, payload, name) {
  if (!url) return json({ error: `${name} is not configured.` }, 503);
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return response.ok ? json({ sent: true }) : json({ error: `${name} webhook failed.` }, response.status);
}

async function telegram(message, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ error: "Telegram is not configured." }, 503);
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message })
  });
  const data = await response.json();
  return response.ok && data.ok ? json({ sent: true }) : json({ error: data.description || "Telegram failed." }, response.status || 400);
}
