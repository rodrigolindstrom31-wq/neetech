const $ = s => document.querySelector(s);
const loginPanel = $("#login-panel"), dashboard = $("#dashboard");
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Ocurrió un error.");
  return data;
}
function message(target, text, isError = false) {
  $(target).textContent = text;
  $(target).classList.toggle("error", isError);
}
function showDashboard() { loginPanel.hidden = true; dashboard.hidden = false; refreshArticles(); }
function showLogin() { dashboard.hidden = true; loginPanel.hidden = false; }
$("#login-form").addEventListener("submit", async e => {
  e.preventDefault(); message("#login-message", "Verificando…");
  const form = new FormData(e.currentTarget);
  try {
    await api("/api/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:form.get("username"),password:form.get("password")})});
    e.currentTarget.reset(); showDashboard();
  } catch(err) { message("#login-message", err.message, true); }
});
async function refreshArticles() {
  const container = $("#admin-articles"); container.innerHTML = '<p class="muted">Cargando…</p>';
  try {
    const articles = await api("/api/admin/articles");
    if (!articles.length) { container.innerHTML = '<p class="muted">Todavía no hay investigaciones publicadas.</p>'; return; }
    container.innerHTML = articles.map(a => `<article class="admin-article"><div><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.authors)} · ${escapeHTML(a.year)} · ${escapeHTML(a.category)}</p></div><button class="delete-button" data-id="${escapeHTML(a.id)}" type="button">Eliminar</button></article>`).join("");
  } catch(err) { container.innerHTML = `<p class="form-message error">${escapeHTML(err.message)}</p>`; }
}
const escapeHTML = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
$("#admin-articles").addEventListener("click", async e => {
  const button = e.target.closest("[data-id]"); if (!button) return;
  if (!confirm("¿Eliminar esta publicación y su archivo PDF?")) return;
  button.disabled = true;
  try { await api(`/api/admin/articles/${encodeURIComponent(button.dataset.id)}`, {method:"DELETE"}); await refreshArticles(); }
  catch(err) { alert(err.message); button.disabled = false; }
});
$("#upload-form").addEventListener("submit", async e => {
  e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
  const file = data.get("pdf");
  if (!file || !file.size) { message("#upload-message","Seleccioná un archivo PDF.",true); return; }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { message("#upload-message","El archivo debe ser PDF.",true); return; }
  if (file.size > 20 * 1024 * 1024) { message("#upload-message","El PDF supera el límite de 20 MB.",true); return; }
  const payload = new FormData();
  ["title","authors","category","year","abstract","keywords"].forEach(k=>payload.append(k,data.get(k) || ""));
  payload.append("pdf",file,file.name);
  const button = form.querySelector('button[type="submit"]'); button.disabled = true; message("#upload-message","Subiendo PDF y guardando la publicación…");
  try { await api("/api/admin/articles", {method:"POST",body:payload}); form.reset(); message("#upload-message","¡Publicación creada correctamente!"); await refreshArticles(); }
  catch(err) { message("#upload-message",err.message,true); }
  finally { button.disabled = false; }
});
$("#logout").addEventListener("click", async () => {
  try { await api("/api/logout",{method:"POST"}); } catch {}
  showLogin();
});
$("#refresh").addEventListener("click", refreshArticles);
(async()=>{try{await api("/api/session");showDashboard();}catch{showLogin();}})();
