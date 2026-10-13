const $ = (s) => document.querySelector(s);
const state = { articles: [] };
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function renderArticles() {
  const term = $("#search").value.trim().toLocaleLowerCase("es");
  const category = $("#category").value;
  const filtered = state.articles.filter(a => {
    const searchable = [a.title,a.authors,a.category,a.abstract,a.keywords].join(" ").toLocaleLowerCase("es");
    return (!term || searchable.includes(term)) && (!category || a.category === category);
  });
  $("#result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "investigación encontrada" : "investigaciones encontradas"}`;
  $("#articles").innerHTML = filtered.map(a => `<article class="article-card">
    <div class="card-top"><span class="category-pill">${escapeHTML(a.category)}</span><span class="pdf-tag">PDF ↗</span></div>
    <h3>${escapeHTML(a.title)}</h3><p class="article-authors">${escapeHTML(a.authors)}</p>
    <p class="article-abstract">${escapeHTML(a.abstract)}</p>
    <div class="card-bottom"><span class="article-year">${escapeHTML(a.year)} · Artículo académico</span><a class="pdf-link" href="${escapeHTML(a.pdfUrl)}" target="_blank" rel="noopener">Leer PDF ↗</a></div>
  </article>`).join("");
  $("#empty").hidden = filtered.length > 0;
  $("#articles").hidden = filtered.length === 0;
}
async function loadArticles() {
  try {
    const response = await fetch("/api/articles");
    if (!response.ok) throw new Error("No se pudo consultar el repositorio.");
    state.articles = await response.json();
    const categories = [...new Set(state.articles.map(a => a.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    $("#category").innerHTML = '<option value="">Todas las áreas</option>' + categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
    renderArticles();
  } catch (error) {
    $("#result-count").textContent = "Biblioteca no disponible";
    $("#articles").innerHTML = '<div class="loading-card">Todavía no se pudo conectar con la biblioteca. Verificá la configuración del proyecto o volvé a intentarlo más tarde.</div>';
  }
}
$("#search").addEventListener("input", renderArticles);
$("#category").addEventListener("change", renderArticles);
$("#year").textContent = new Date().getFullYear();
loadArticles();
