import { requireAdmin } from "../../../_lib/auth.js";
const jsonError = (error, status = 400) => Response.json({ error }, { status });
export async function onRequestDelete({ request, env, params }) {
  if (!await requireAdmin(request, env)) return jsonError("Sesión vencida. Volvé a iniciar sesión.", 401);
  const id = String(params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Identificador inválido.");
  const article = await env.DB.prepare("SELECT pdf_key FROM articles WHERE id = ?").bind(id).first();
  if (!article) return jsonError("La publicación no existe.", 404);
  await env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
  if (article.pdf_key) await env.PDFS.delete(article.pdf_key);
  return Response.json({ ok: true });
}