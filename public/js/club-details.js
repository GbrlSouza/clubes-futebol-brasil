const API = "/api/clubs";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) {
    document.getElementById("clubContainer").innerHTML =
      '<div class="alert alert-warning">ID do clube não informado.</div>';
    return;
  }
  loadDetails(id);
});

async function loadDetails(id) {
  const res = await fetch(`${API}/${id}`);
  if (!res.ok) {
    document.getElementById("clubContainer").innerHTML =
      '<div class="alert alert-danger">Clube não encontrado.</div>';
    return;
  }
  const c = await res.json();
  renderClub(c);
}

function renderClub(c) {
  const container = document.getElementById("clubContainer");
  container.innerHTML = `
    <div class="row">
      <div class="col-md-4">
        <div class="card mb-3">
          <div class="card-body text-center">
            <img src="${c.media.badge || "/public/default-badge.png"}" alt="badge" class="img-fluid mb-2" style="max-height:180px; object-fit:contain;">
            <h3>${escapeHtml(c.short_name)}</h3>
            <p class="text-muted">${escapeHtml(c.full_name)}</p>
            <p><strong>${c.location.city || ""}</strong> / ${c.location.state || ""}</p>
            <p><small class="text-muted">Divisão: ${c.competition.national_division || "—"}</small></p>
            <div class="d-grid gap-2">
              <a href="/form.html?id=${c.id}" class="btn btn-outline-secondary">Editar</a>
              <button class="btn btn-danger" onclick="deleteClub(${c.id})">Excluir</button>
              <a class="btn btn-outline-primary" href="/">Voltar</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h6>Estádio</h6>
            <p>${escapeHtml(c.stadium.name || "")} <br><small class="text-muted">Capacidade: ${c.stadium.capacity || "—"}</small></p>
            ${c.media.stadium_image ? `<img src="${c.media.stadium_image}" class="img-fluid" alt="estadio">` : ""}
          </div>
        </div>
      </div>

      <div class="col-md-8">
        <div class="card mb-3">
          <div class="card-body">
            <h5>Identidade</h5>
            <p><strong>Cores:</strong> ${(c.identity.colors || []).join(", ")}</p>
            <p><strong>Apelidos:</strong> ${(c.identity.nickname || []).join(", ")}</p>
            <div class="d-flex gap-2 flex-wrap">
              ${(c.identity.mascot || []).map((m) => `<img src="${m}" style="max-width:120px; object-fit:cover" class="img-thumbnail">`).join("")}
            </div>
            <hr>
            <h6>Uniformes</h6>
            <div class="d-flex gap-2 flex-wrap">
              ${(c.identity.uniform || []).map((u) => `<img src="${u}" style="max-width:120px; object-fit:cover" class="img-thumbnail">`).join("")}
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-body">
            <h5>História</h5>
            <p><strong>Primeiro título:</strong> ${c.history.first_title_year || "—"}</p>
            <p><strong>Títulos internacionais:</strong> ${(c.history.titles.international || []).join(", ") || "—"}</p>
            <p><strong>Títulos nacionais:</strong> ${(c.history.titles.national || []).join(", ") || "—"}</p>
            <p><strong>Títulos estaduais:</strong> ${(c.history.titles.state || []).join(", ") || "—"}</p>
            <p><strong>Rivais:</strong> ${(c.history.rivals || []).join(", ") || "—"}</p>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h5>Links</h5>
            <p><a href="${c.links.official_website || "#"}" target="_blank">${c.links.official_website || "—"}</a></p>
            <p>
              ${c.links.social && c.links.social.instagram ? `<a href="${c.links.social.instagram}" target="_blank" class="me-2">Instagram</a>` : ""}
              ${c.links.social && c.links.social.twitter ? `<a href="${c.links.social.twitter}" target="_blank" class="me-2">Twitter</a>` : ""}
              ${c.links.social && c.links.social.facebook ? `<a href="${c.links.social.facebook}" target="_blank" class="me-2">Facebook</a>` : ""}
              ${c.links.social && c.links.social.youtube ? `<a href="${c.links.social.youtube}" target="_blank" class="me-2">YouTube</a>` : ""}
            </p>
            <p class="text-muted"><small>Fonte: ${escapeHtml(c.metadata.source || "—")}</small></p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function deleteClub(id) {
  if (!confirm("Confirma exclusão deste clube?")) return;
  fetch(`/api/clubs/${id}`, { method: "DELETE" })
    .then((r) => r.json())
    .then(() => (window.location.href = "/"))
    .catch(() => alert("Erro ao excluir"));
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m];
  });
}
