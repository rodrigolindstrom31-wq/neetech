const encoder = new TextEncoder();
const SESSION_SECONDS = 8 * 60 * 60;
function toBase64Url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}
async function sign(payload, secret) {
  const data = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${data}.${toBase64Url(await hmac(secret, data))}`;
}
function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const item = cookie.split(";").map(s => s.trim()).find(s => s.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}
export async function createSession(username, secret) {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");
  return sign({ sub: username, exp: Math.floor(Date.now()/1000) + SESSION_SECONDS }, secret);
}
export async function requireAdmin(request, env) {
  try {
    const token = getCookie(request, "uep_session").split(".");
    if (token.length !== 2 || !env.SESSION_SECRET) return null;
    const expected = await hmac(env.SESSION_SECRET, token[0]);
    const actual = fromBase64Url(token[1]);
    if (expected.length !== actual.length || !crypto.subtle.timingSafeEqual) {
      // Web Crypto in Workers doesn't expose timingSafeEqual; compare every byte instead.
      if (expected.length !== actual.length) return null;
      let diff = 0; for (let i=0;i<expected.length;i++) diff |= expected[i] ^ actual[i];
      if (diff !== 0) return null;
    } else {
      if (!crypto.subtle.timingSafeEqual(expected, actual)) return null;
    }
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(token[0])));
    if (!payload.sub || payload.exp < Math.floor(Date.now()/1000)) return null;
    return { username: payload.sub };
  } catch { return null; }
}
export function cookieHeader(token, secure, clear = false) {
  return `uep_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}
export async function verifyPassword(password, stored) {
  try {
    // Format: pbkdf2$iterations$salt_base64url$hash_base64url
    const [scheme, iterationsText, saltText, hashText] = String(stored).split("$");
    const iterations = Number(iterationsText);
    if (scheme !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;
    const salt = fromBase64Url(saltText), expected = fromBase64Url(hashText);
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, expected.length * 8));
    if (derived.length !== expected.length) return false;
    let diff = 0; for (let i=0;i<derived.length;i++) diff |= derived[i] ^ expected[i];
    return diff === 0;
  } catch { return false; }
}