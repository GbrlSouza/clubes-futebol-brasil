const API = "/api/clubs";

document.addEventListener("DOMContentLoaded", () => {
  initFilters();
  loadClubs();
  document
    .getElementById("searchBtn")
    .addEventListener("click", () => loadClubs());
  document.getElementById("searchInput").addEventListener("keyup", (e) => {
    if (e.key === "Enter") loadClubs();
  });
  document.getElementById("filterState").addEventListener("change", loadClubs);
  document
    .getElementById("filterDivision")
    .addEventListener("change", loadClubs);
  document.getElementById("filterStatus").addEventListener("change", loadClubs);
  document.getElementById("sortSelect").addEventListener("change", loadClubs);
  document.getElementById("clearFilters").addEventListener("click", () => {
    document.getElementById("filterState").value = "";
    document.getElementById("filterDivision").value = "";
    document.getElementById("filterStatus").value = "";
    document.getElementById("searchInput").value = "";
    document.getElementById("sortSelect").value = "";
    loadClubs();
  });
});

async function initFilters() {
  // populate states and divisions from existing data
  const res = await fetch(API);
  const clubs = await res.json();
  const states = new Set();
  const divisions = new Set();
  clubs.forEach((c) => {
    if (c.location && c.location.state) states.add(c.location.state);
    if (c.competition && c.competition.national_division)
      divisions.add(c.competition.national_division);
  });
  const stateSel = document.getElementById("filterState");
  states.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    stateSel.appendChild(opt);
  });
  const divSel = document.getElementById("filterDivision");
  divisions.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    divSel.appendChild(opt);
  });
}

async function loadClubs() {
  const q = document.getElementById("searchInput").value.trim();
  const state = document.getElementById("filterState").value;
  const division = document.getElementById("filterDivision").value;
  const status = document.getElementById("filterStatus").value;
  const sort = document.getElementById("sortSelect").value;

  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (state) params.append("state", state);
  if (division) params.append("national_division", division);
  if (status) params.append("status", status);
  if (sort) params.append("sort", sort);

  const res = await fetch(`${API}?${params.toString()}`);
  const clubs = await res.json();
  renderCards(clubs);
  renderTimeline(clubs);
}

function renderCards(clubs) {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";
  if (!clubs.length) {
    container.innerHTML =
      '<div class="col-12"><div class="alert alert-info">Nenhum clube encontrado.</div></div>';
    return;
  }
  clubs.forEach((club) => {
    const col = document.createElement("div");
    col.className = "col-sm-6 col-md-4 col-lg-3";
    const card = document.createElement("div");
    card.className = "card card-club h-100";
    const imgSrc =
      club.media && club.media.badge
        ? club.media.badge
        : "/public/default-badge.png";
    card.innerHTML = `
      <div class="card-body d-flex flex-column">
        <div class="d-flex align-items-center gap-3 mb-2">
          <img src="${imgSrc}" alt="${club.short_name}" class="img-thumbnail" style="width:64px;height:64px;object-fit:contain;">
          <div>
            <h5 class="card-title mb-0">${escapeHtml(club.short_name)}</h5>
            <small class="text-muted">${escapeHtml(club.location.city || "")} / ${escapeHtml(club.location.state || "")}</small>
          </div>
        </div>
        <p class="mb-2 text-truncate">${escapeHtml(club.full_name)}</p>
        <div class="mt-auto d-flex justify-content-between align-items-center">
          <div>
            <small class="text-muted">${escapeHtml(club.competition.national_division || "")}</small>
          </div>
          <div>
            <a href="/club.html?id=${club.id}" class="btn btn-sm btn-outline-primary">Ver</a>
            <a href="/form.html?id=${club.id}" class="btn btn-sm btn-outline-secondary">Editar</a>
            <button class="btn btn-sm btn-danger" onclick="confirmDelete(${club.id}, '${escapeJs(club.short_name)}')">Excluir</button>
          </div>
        </div>
      </div>
    `;
    col.appendChild(card);
    container.appendChild(col);
  });
}

function renderTimeline(clubs) {
  const container = document.getElementById("timeline");
  container.innerHTML = "";
  // timeline from newest to oldest by founded
  const sorted = clubs
    .slice()
    .sort((a, b) => (b.founded || 0) - (a.founded || 0));
  sorted.forEach((c) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `
      <h6>${escapeHtml(c.short_name)} <small class="text-muted">(${c.founded || "—"})</small></h6>
      <p class="mb-1">${escapeHtml(c.full_name)}</p>
      <small class="text-muted">${escapeHtml(c.location.city || "")} / ${escapeHtml(c.location.state || "")} • ${escapeHtml(c.competition.national_division || "")}</small>
    `;
    container.appendChild(item);
  });
}

function confirmDelete(id, name) {
  if (
    !confirm(`Confirma exclusão do clube "${name}"? Esta ação é irreversível.`)
  )
    return;
  fetch(`/api/clubs/${id}`, { method: "DELETE" })
    .then((r) => r.json())
    .then(() => loadClubs())
    .catch((err) => alert("Erro ao excluir"));
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
function escapeJs(s) {
  if (!s) return "";
  return s.replace(/'/g, "\\'");
}
