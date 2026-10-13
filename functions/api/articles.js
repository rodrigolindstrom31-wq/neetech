export async function onRequestGet({ env }) {
  try {
    const { results = [] } = await env.DB.prepare(
      "SELECT id, title, authors, category, year, abstract, keywords, pdf_key, created_at FROM articles ORDER BY created_at DESC"
    ).all();
    return Response.json(results.map(article => ({ ...article, pdfUrl: `/api/pdf/${encodeURIComponent(article.id)}` })), {
      headers: { "Cache-Control": "public, max-age=60" }
    });
  } catch (error) {
    return Response.json({ error: "El repositorio aún no está configurado." }, { status: 503 });
  }
}