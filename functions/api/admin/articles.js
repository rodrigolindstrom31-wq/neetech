import { requireAdmin } from "../../_lib/auth.js";
const jsonError = (error, status = 400) => Response.json({ error }, { status });
const clean = (v, max) => String(v || "").trim().slice(0, max);
export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return jsonError("Sesión vencida. Volvé a iniciar sesión.", 401);
  const { results = [] } = await env.DB.prepare("SELECT id,title,authors,category,year,abstract,keywords,created_at FROM articles ORDER BY created_at DESC").all();
  return Response.json(results);
}
export async function onRequestPost({ request, env }) {
  if (!await requireAdmin(request, env)) return jsonError("Sesión vencida. Volvé a iniciar sesión.", 401);
  const type = request.headers.get("content-type") || "";
  if (!type.includes("multipart/form-data")) return jsonError("Formato de solicitud inválido.");
  let form;
  try { form = await request.formData(); } catch { return jsonError("No se pudo leer el formulario."); }
  const title = clean(form.get("title"), 220), authors = clean(form.get("authors"), 220);
  const category = clean(form.get("category"), 100), year = Number(form.get("year"));
  const abstract = clean(form.get("abstract"), 1800), keywords = clean(form.get("keywords"), 300);
  const file = form.get("pdf");
  if (!title || !authors || !category || !abstract || !Number.isInteger(year) || year < 1900 || year > 2100) return jsonError("Completá correctamente los campos obligatorios.");
  if (!file || typeof file.arrayBuffer !== "function") return jsonError("Seleccioná un archivo PDF.");
  if (file.size < 1 || file.size > 20 * 1024 * 1024) return jsonError("El PDF debe pesar entre 1 byte y 20 MB.");
  const bytes = await file.arrayBuffer();
  const signature = new Uint8Array(bytes.slice(0, 5));
  if (String.fromCharCode(...signature) !== "%PDF-") return jsonError("El archivo seleccionado no parece ser un PDF válido.");
  const id = crypto.randomUUID();
  const key = `${id}.pdf`;
  await env.PDFS.put(key, bytes, { httpMetadata: { contentType: "application/pdf", contentDisposition: `inline; filename="${id}.pdf"`, cacheControl: "private, max-age=3600" } });
  try {
    await env.DB.prepare("INSERT INTO articles (id,title,authors,category,year,abstract,keywords,pdf_key,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(id,title,authors,category,year,abstract,keywords,key,new Date().toISOString()).run();
  } catch (error) {
    await env.PDFS.delete(key);
    return jsonError("No se pudo guardar la publicación. Revisá la base de datos.", 500);
  }
  return Response.json({ ok: true, id }, { status: 201 });
}