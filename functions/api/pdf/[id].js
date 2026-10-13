export async function onRequestGet({ env, params }) {
  const id = String(params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado", { status: 404 });
  const article = await env.DB.prepare("SELECT pdf_key, title FROM articles WHERE id = ?").bind(id).first();
  if (!article) return new Response("No encontrado", { status: 404 });
  const object = await env.PDFS.get(article.pdf_key);
  if (!object) return new Response("Archivo no encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", "inline; filename=\"investigacion.pdf\"");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(object.body, { headers });
}