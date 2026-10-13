import { requireAdmin } from "../_lib/auth.js";
export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return Response.json({ error: "Sesión no válida." }, { status: 401 });
  return Response.json({ ok: true, username: admin.username });
}