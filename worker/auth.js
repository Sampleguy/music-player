// Password check, signed session cookie, login rate limit.
const DAYS = 180;
const enc = new TextEncoder();

const key = (secret) =>
  crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Same-time compare: hash both, then timingSafeEqual (lengths always match).
async function sameText(a, b) {
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  return crypto.subtle.timingSafeEqual(x, y);
}

async function makeCookie(env) {
  const exp = String(Date.now() + DAYS * 864e5);
  const sig = hex(await crypto.subtle.sign("HMAC", await key(env.SESSION_SECRET), enc.encode(exp)));
  return `session=${exp}.${sig}; Max-Age=${DAYS * 86400}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

// Missing or short secrets = locked, never open: an unset APP_PASSWORD must not mean "undefined" logs in.
const ready = (env) => env.APP_PASSWORD?.length >= 8 && env.SESSION_SECRET?.length >= 32;

export async function isLoggedIn(request, env) {
  if (!ready(env)) return false;
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)session=(\d+)\.([0-9a-f]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  const sig = new Uint8Array(m[2].match(/../g).map((h) => parseInt(h, 16)));
  return crypto.subtle.verify("HMAC", await key(env.SESSION_SECRET), sig, enc.encode(m[1]));
}

export async function login(request, env) {
  if (!ready(env)) return new Response("Not set up: APP_PASSWORD (8+ characters) and SESSION_SECRET (32+) needed", { status: 503 });
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const { success } = await env.LOGIN_LIMIT.limit({ key: ip });
  if (!success) return new Response("Too many tries. Wait 1 minute.", { status: 429 });

  const { password = "" } = await request.json().catch(() => ({}));
  if (!(await sameText(String(password), env.APP_PASSWORD))) return new Response("Wrong password", { status: 401 });

  return new Response(null, { status: 204, headers: { "Set-Cookie": await makeCookie(env) } });
}
