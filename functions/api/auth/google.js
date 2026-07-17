
import {
  json,
  randomHex,
  sha256,
  sessionCookie
} from "../../_shared/auth.js";
import { enforceRateLimit } from "../../_shared/security.js";

const encoder = new TextEncoder();

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ error: 'D1 binding "DB" is not configured.' }, 503);
  }

  if (!env.GOOGLE_CLIENT_ID) {
    return json({ error: "GOOGLE_CLIENT_ID is not configured." }, 503);
  }

  await enforceRateLimit(request, env, "auth-google", 10, 300);

  const body = await request.json().catch(() => ({}));
  const credential = String(body.credential || "").trim();
  if (!credential) return json({ error: "Google credential is missing." }, 400);

  const claims = await verifyGoogleIdToken(credential, env.GOOGLE_CLIENT_ID);

  if (!claims.email || claims.email_verified !== true) {
    return json({ error: "Google did not provide a verified email address." }, 401);
  }

  const email = claims.email.toLowerCase().slice(0, 254);
  const displayName = String(claims.name || email.split("@")[0]).slice(0, 60);
  const now = Date.now();

  let user = await env.DB.prepare(`
    SELECT id, email, display_name AS displayName, role,
      CASE WHEN plan_expires_at > 0 AND plan_expires_at < ? THEN 'free' ELSE plan END AS plan
    FROM users
    WHERE email = ?
  `).bind(Date.now(), email).first();

  if (!user) {
    const id = crypto.randomUUID();
    const placeholderSalt = randomHex(16);
    const placeholderHash = `google:${claims.sub}:${randomHex(16)}`;

    await env.DB.prepare(`
      INSERT INTO users
        (id, email, password_hash, salt, display_name, role, plan, email_verified, created_at)
      VALUES
        (?, ?, ?, ?, ?, 'user', 'free', 1, ?)
    `).bind(
      id,
      email,
      placeholderHash,
      placeholderSalt,
      displayName,
      now
    ).run();

    user = {
      id,
      email,
      displayName,
      role: "user",
      plan: "free"
    };
  } else if (displayName && user.displayName !== displayName) {
    await env.DB.prepare(`
      UPDATE users SET display_name = ? WHERE id = ?
    `).bind(displayName, user.id).run();
    user.displayName = displayName;
  }

  await env.DB.prepare("UPDATE users SET email_verified=1 WHERE id=?").bind(user.id).run();

  const token = randomHex(32);
  await env.DB.prepare(`
    INSERT INTO sessions
      (id, user_id, token_hash, ip, country, device, expires_at, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    user.id,
    await sha256(token),
    request.headers.get("CF-Connecting-IP") || "",
    request.headers.get("CF-IPCountry") || "",
    (request.headers.get("User-Agent") || "").slice(0, 500),
    now + 30 * 86400000,
    now
  ).run();

  return json(
    { message: "Signed in with Google.", user },
    200,
    { "Set-Cookie": sessionCookie(token) }
  );
}

async function verifyGoogleIdToken(token, clientId) {
  const parts = token.split(".");
  if (parts.length !== 3) throw unauthorized("Invalid Google ID token.");

  const header = JSON.parse(decodeBase64UrlText(parts[0]));
  const payload = JSON.parse(decodeBase64UrlText(parts[1]));

  if (header.alg !== "RS256" || !header.kid) {
    throw unauthorized("Unsupported Google token signature.");
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    headers: { "Accept": "application/json" }
  });
  if (!response.ok) throw unauthorized("Google signing keys could not be loaded.");

  const jwks = await response.json();
  const jwk = jwks.keys?.find(key => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw unauthorized("Google signing key was not found.");

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedData = encoder.encode(`${parts[0]}.${parts[1]}`);
  const signature = decodeBase64UrlBytes(parts[2]);

  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature,
    signedData
  );

  if (!validSignature) throw unauthorized("Google token signature is invalid.");

  const nowSeconds = Math.floor(Date.now() / 1000);
  const validIssuer =
    payload.iss === "https://accounts.google.com" ||
    payload.iss === "accounts.google.com";

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

  if (!validIssuer) throw unauthorized("Google token issuer is invalid.");
  if (!audiences.includes(clientId)) throw unauthorized("Google token audience is invalid.");
  if (audiences.length > 1 && payload.azp !== clientId) throw unauthorized("Google token authorized party is invalid.");
  if (!payload.exp || Number(payload.exp) <= nowSeconds) throw unauthorized("Google token has expired.");
  if (payload.iat && Number(payload.iat) > nowSeconds + 60) throw unauthorized("Google token issue time is invalid.");
  if (payload.nbf && Number(payload.nbf) > nowSeconds + 60) throw unauthorized("Google token is not active yet.");

  return payload;
}

function decodeBase64UrlText(value) {
  return new TextDecoder().decode(decodeBase64UrlBytes(value));
}

function decodeBase64UrlBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function unauthorized(message) {
  const error = new Error(message);
  error.status = 401;
  return error;
}
