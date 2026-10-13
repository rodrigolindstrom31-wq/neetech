import { verifyPassword, createSession, cookieHeader } from "../_lib/auth.js";
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password || username.length > 100 || password.length > 500) {
    return Response.json({ error: "Ingresá usuario y contraseña." }, { status: 400 });
  }
  const admin = await env.DB.prepare("SELECT username, password_hash FROM admins WHERE username = ?").bind(username).first();
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    await new Promise(resolve => setTimeout(resolve, 350));
    return Response.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }
  const token = await createSession(username, env.SESSION_SECRET);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookieHeader(token, request.url.startsWith("https://")) } });
}