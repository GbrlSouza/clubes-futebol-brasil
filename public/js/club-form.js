const API = "/api/clubs";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (id) loadClubForEdit(id);

  // previews
  document
    .getElementById("media.badge")
    .addEventListener("change", (e) =>
      previewSingle(e.target.files[0], "previewBadge"),
    );
  document
    .getElementById("media.stadium_image")
    .addEventListener("change", (e) =>
      previewSingle(e.target.files[0], "previewStadium"),
    );
  document
    .getElementById("identity.mascot")
    .addEventListener("change", (e) =>
      previewMultiple(e.target.files, "previewMascots"),
    );
  document
    .getElementById("identity.uniform")
    .addEventListener("change", (e) =>
      previewMultiple(e.target.files, "previewUniforms"),
    );

  document.getElementById("saveBtn").addEventListener("click", submitForm);
});

function previewSingle(file, imgId) {
  const img = document.getElementById(imgId);
  if (!file) {
    img.style.display = "none";
    img.src = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    img.src = e.target.result;
    img.style.display = "block";
  };
  reader.readAsDataURL(file);
}
function previewMultiple(files, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  Array.from(files).forEach((f) => {
    const reader = new FileReader();
    const img = document.createElement("img");
    img.className = "img-thumbnail";
    img.style.maxWidth = "120px";
    img.style.maxHeight = "120px";
    img.style.objectFit = "cover";
    reader.onload = (e) => {
      img.src = e.target.result;
      container.appendChild(img);
    };
    reader.readAsDataURL(f);
  });
}

async function loadClubForEdit(id) {
  const res = await fetch(`${API}/${id}`);
  if (!res.ok) return alert("Clube não encontrado");
  const club = await res.json();
  document.getElementById("formTitle").textContent =
    `Editar Clube • ${club.short_name}`;
  // fill fields
  document.getElementById("short_name").value = club.short_name || "";
  document.getElementById("full_name").value = club.full_name || "";
  document.getElementById("founded").value = club.founded || "";
  document.getElementById("status").value = club.status || "";
  document.getElementById("category").value = club.category || "";
  document.getElementById("competition.national_division").value =
    club.competition.national_division || "";
  document.getElementById("location.city").value = club.location.city || "";
  document.getElementById("location.state").value = club.location.state || "";
  document.getElementById("location.region").value = club.location.region || "";
  document.getElementById("location.map_url").value =
    club.location.map_url || "";
  document.getElementById("identity.colors").value = (
    club.identity.colors || []
  ).join(", ");
  document.getElementById("identity.nickname").value = (
    club.identity.nickname || []
  ).join(", ");
  document.getElementById("stadium.name").value = club.stadium.name || "";
  document.getElementById("stadium.capacity").value =
    club.stadium.capacity || "";
  document.getElementById("metadata.source").value = club.metadata.source || "";

  if (club.media && club.media.badge) {
    const img = document.getElementById("previewBadge");
    img.src = club.media.badge;
    img.style.display = "block";
  }
  if (club.media && club.media.stadium_image) {
    const img = document.getElementById("previewStadium");
    img.src = club.media.stadium_image;
    img.style.display = "block";
  }
  if (club.identity && club.identity.mascot && club.identity.mascot.length) {
    const container = document.getElementById("previewMascots");
    club.identity.mascot.forEach((u) => {
      const img = document.createElement("img");
      img.src = u;
      img.className = "img-thumbnail";
      img.style.maxWidth = "120px";
      img.style.objectFit = "cover";
      container.appendChild(img);
    });
  }
  if (club.identity && club.identity.uniform && club.identity.uniform.length) {
    const container = document.getElementById("previewUniforms");
    club.identity.uniform.forEach((u) => {
      const img = document.createElement("img");
      img.src = u;
      img.className = "img-thumbnail";
      img.style.maxWidth = "120px";
      img.style.objectFit = "cover";
      container.appendChild(img);
    });
  }
}

async function submitForm() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const form = document.getElementById("clubForm");
  const formData = new FormData();

  // collect inputs
  const fields = [
    "short_name",
    "full_name",
    "founded",
    "status",
    "category",
    "location.city",
    "location.state",
    "location.region",
    "location.map_url",
    "identity.colors",
    "identity.nickname",
    "stadium.name",
    "stadium.capacity",
    "competition.national_division",
    "competition.state_division",
    "competition.current_season",
    "metadata.source",
    "anthem.title",
    "anthem.lyrics_url",
    "anthem.audio_url",
    "links.official_website",
    "links.others_website",
    "links.social.instagram",
    "links.social.twitter",
    "links.social.facebook",
    "links.social.youtube",
  ];
  fields.forEach((f) => {
    const el = document.querySelector(`[name="${f}"]`);
    if (el && el.value !== undefined) formData.append(f, el.value);
  });

  // files
  const badge = document.getElementById("media.badge").files[0];
  const stadiumImg = document.getElementById("media.stadium_image").files[0];
  const mascots = document.getElementById("identity.mascot").files;
  const uniforms = document.getElementById("identity.uniform").files;

  if (badge) formData.append("media.badge", badge);
  if (stadiumImg) formData.append("media.stadium_image", stadiumImg);
  Array.from(mascots).forEach((f) => formData.append("identity.mascot", f));
  Array.from(uniforms).forEach((f) => formData.append("identity.uniform", f));

  try {
    let res;
    if (id) {
      // update
      res = await fetch(`${API}/${id}`, {
        method: "PUT",
        body: formData,
      });
    } else {
      res = await fetch(API, {
        method: "POST",
        body: formData,
      });
    }
    if (!res.ok) {
      const err = await res.json();
      alert("Erro: " + (err.error || "Falha ao salvar"));
      return;
    }
    const saved = await res.json();
    window.location.href = `/club.html?id=${saved.id}`;
  } catch (e) {
    console.error(e);
    alert("Erro ao salvar");
  }
}
