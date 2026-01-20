const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const slugify = require("slugify");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const DATA_FILE = path.join(__dirname, "data", "clubs.json");
const UPLOADS_DIR = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(path.join(__dirname, "data")))
  fs.mkdirSync(path.join(__dirname, "data"));
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE))
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-")
      .toLowerCase();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});
const upload = multer({ storage });

// Utility functions
function readData() {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw || "[]");
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}
function nextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map((i) => i.id || 0)) + 1;
}
function generateSlug(name) {
  return slugify(name || "", { lower: true, strict: true });
}
function nowISO() {
  return new Date().toISOString();
}

// API routes

// GET /clubs - list all with optional query filters
app.get("/api/clubs", (req, res) => {
  let clubs = readData();

  // Filters: state, national_division, status, category, founded_from, founded_to, q (search)
  const {
    state,
    national_division,
    status,
    category,
    founded_from,
    founded_to,
    q,
    sort,
  } = req.query;

  if (state)
    clubs = clubs.filter(
      (c) =>
        c.location &&
        c.location.state &&
        c.location.state.toLowerCase() === state.toLowerCase(),
    );
  if (national_division)
    clubs = clubs.filter(
      (c) =>
        c.competition &&
        c.competition.national_division &&
        c.competition.national_division.toLowerCase() ===
          national_division.toLowerCase(),
    );
  if (status)
    clubs = clubs.filter(
      (c) => c.status && c.status.toLowerCase() === status.toLowerCase(),
    );
  if (category)
    clubs = clubs.filter(
      (c) => c.category && c.category.toLowerCase() === category.toLowerCase(),
    );
  if (founded_from)
    clubs = clubs.filter(
      (c) => c.founded && Number(c.founded) >= Number(founded_from),
    );
  if (founded_to)
    clubs = clubs.filter(
      (c) => c.founded && Number(c.founded) <= Number(founded_to),
    );
  if (q) {
    const term = q.toLowerCase();
    clubs = clubs.filter(
      (c) =>
        (c.short_name && c.short_name.toLowerCase().includes(term)) ||
        (c.full_name && c.full_name.toLowerCase().includes(term)) ||
        (c.identity &&
          c.identity.nickname &&
          c.identity.nickname.join(" ").toLowerCase().includes(term)),
    );
  }

  // Sort: default alphabetical by short_name
  if (sort === "founded_desc") {
    clubs.sort((a, b) => (b.founded || 0) - (a.founded || 0));
  } else if (sort === "founded_asc") {
    clubs.sort((a, b) => (a.founded || 0) - (b.founded || 0));
  } else {
    clubs.sort((a, b) => {
      const A = (a.short_name || a.full_name || "").toLowerCase();
      const B = (b.short_name || b.full_name || "").toLowerCase();
      return A.localeCompare(B);
    });
  }

  res.json(clubs);
});

// GET /clubs/:id
app.get("/api/clubs/:id", (req, res) => {
  const id = Number(req.params.id);
  const clubs = readData();
  const club = clubs.find((c) => c.id === id);
  if (!club) return res.status(404).json({ error: "Clube não encontrado" });
  res.json(club);
});

// POST /clubs - create club with images
const cpUpload = upload.fields([
  { name: "media.badge", maxCount: 1 },
  { name: "media.stadium_image", maxCount: 1 },
  { name: "identity.mascot", maxCount: 5 },
  { name: "identity.uniform", maxCount: 5 },
]);

app.post("/api/clubs", cpUpload, (req, res) => {
  try {
    const body = req.body;
    const files = req.files || {};
    const clubs = readData();

    // Basic validation
    if (!body.short_name || !body.full_name) {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios: short_name, full_name" });
    }

    const id = nextId(clubs);
    const slug = generateSlug(body.short_name || body.full_name);

    // Build club object following schema
    const club = {
      id,
      short_name: body.short_name || "",
      full_name: body.full_name || "",
      slug: slug,
      founded: body.founded ? Number(body.founded) : null,
      status: body.status || "",
      category: body.category || "",
      location: {
        city: body["location.city"] || "",
        state: body["location.state"] || "",
        region: body["location.region"] || "",
        map_url: body["location.map_url"] || "",
      },
      identity: {
        colors: body["identity.colors"]
          ? Array.isArray(body["identity.colors"])
            ? body["identity.colors"]
            : body["identity.colors"]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
          : [],
        mascot: [],
        nickname: body["identity.nickname"]
          ? Array.isArray(body["identity.nickname"])
            ? body["identity.nickname"]
            : body["identity.nickname"]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
          : [],
        uniform: [],
      },
      stadium: {
        name: body["stadium.name"] || "",
        capacity: body["stadium.capacity"]
          ? Number(body["stadium.capacity"])
          : null,
      },
      organization: {
        federation: body["organization.federation"] || "",
        confederation: body["organization.confederation"] || "CBF",
      },
      competition: {
        national_division: body["competition.national_division"] || "",
        state_division: body["competition.state_division"] || "",
        current_season: body["competition.current_season"] || "",
      },
      history: {
        titles: {
          international: body["history.titles.international"]
            ? JSON.parse(body["history.titles.international"])
            : [],
          national: body["history.titles.national"]
            ? JSON.parse(body["history.titles.national"])
            : [],
          state: body["history.titles.state"]
            ? JSON.parse(body["history.titles.state"])
            : [],
        },
        first_title_year: body["history.first_title_year"]
          ? Number(body["history.first_title_year"])
          : null,
        rivals: body["history.rivals"]
          ? Array.isArray(body["history.rivals"])
            ? body["history.rivals"]
            : body["history.rivals"]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
          : [],
      },
      anthem: {
        title: body["anthem.title"] || "",
        lyrics_url: body["anthem.lyrics_url"] || "",
        audio_url: body["anthem.audio_url"] || "",
      },
      media: {
        badge:
          files["media.badge"] && files["media.badge"][0]
            ? `/uploads/${path.basename(files["media.badge"][0].path)}`
            : "",
        stadium_image:
          files["media.stadium_image"] && files["media.stadium_image"][0]
            ? `/uploads/${path.basename(files["media.stadium_image"][0].path)}`
            : "",
      },
      links: {
        official_website: body["links.official_website"] || "",
        others_website: body["links.others_website"]
          ? Array.isArray(body["links.others_website"])
            ? body["links.others_website"]
            : body["links.others_website"]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
          : [],
        social: {
          instagram: body["links.social.instagram"] || "",
          twitter: body["links.social.twitter"] || "",
          facebook: body["links.social.facebook"] || "",
          youtube: body["links.social.youtube"] || "",
        },
      },
      metadata: {
        created_at: nowISO(),
        updated_at: nowISO(),
        source: body["metadata.source"] || "",
      },
    };

    // mascots and uniforms files
    if (files["identity.mascot"]) {
      club.identity.mascot = files["identity.mascot"].map(
        (f) => `/uploads/${path.basename(f.path)}`,
      );
    }
    if (files["identity.uniform"]) {
      club.identity.uniform = files["identity.uniform"].map(
        (f) => `/uploads/${path.basename(f.path)}`,
      );
    }

    clubs.push(club);
    writeData(clubs);

    res.status(201).json(club);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar clube" });
  }
});

// PUT /clubs/:id - update club, accept files
app.put("/api/clubs/:id", cpUpload, (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;
    const files = req.files || {};
    const clubs = readData();
    const idx = clubs.findIndex((c) => c.id === id);
    if (idx === -1)
      return res.status(404).json({ error: "Clube não encontrado" });

    // Validate required fields if provided
    if (body.short_name === "" || body.full_name === "") {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios: short_name, full_name" });
    }

    const club = clubs[idx];

    // Update simple fields
    club.short_name = body.short_name || club.short_name;
    club.full_name = body.full_name || club.full_name;
    club.slug = generateSlug(club.short_name || club.full_name);
    club.founded = body.founded ? Number(body.founded) : club.founded;
    club.status = body.status || club.status;
    club.category = body.category || club.category;

    // location
    club.location = {
      city: body["location.city"] || club.location.city || "",
      state: body["location.state"] || club.location.state || "",
      region: body["location.region"] || club.location.region || "",
      map_url: body["location.map_url"] || club.location.map_url || "",
    };

    // identity arrays
    club.identity.colors = body["identity.colors"]
      ? Array.isArray(body["identity.colors"])
        ? body["identity.colors"]
        : body["identity.colors"]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
      : club.identity.colors;
    club.identity.nickname = body["identity.nickname"]
      ? Array.isArray(body["identity.nickname"])
        ? body["identity.nickname"]
        : body["identity.nickname"]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
      : club.identity.nickname;

    // stadium
    club.stadium = {
      name: body["stadium.name"] || club.stadium.name || "",
      capacity: body["stadium.capacity"]
        ? Number(body["stadium.capacity"])
        : club.stadium.capacity,
    };

    // organization
    club.organization = {
      federation:
        body["organization.federation"] || club.organization.federation || "",
      confederation:
        body["organization.confederation"] ||
        club.organization.confederation ||
        "CBF",
    };

    // competition
    club.competition = {
      national_division:
        body["competition.national_division"] ||
        club.competition.national_division ||
        "",
      state_division:
        body["competition.state_division"] ||
        club.competition.state_division ||
        "",
      current_season:
        body["competition.current_season"] ||
        club.competition.current_season ||
        "",
    };

    // history
    try {
      club.history.titles.international = body["history.titles.international"]
        ? JSON.parse(body["history.titles.international"])
        : club.history.titles.international;
      club.history.titles.national = body["history.titles.national"]
        ? JSON.parse(body["history.titles.national"])
        : club.history.titles.national;
      club.history.titles.state = body["history.titles.state"]
        ? JSON.parse(body["history.titles.state"])
        : club.history.titles.state;
    } catch (e) {
      // ignore parse errors
    }
    club.history.first_title_year = body["history.first_title_year"]
      ? Number(body["history.first_title_year"])
      : club.history.first_title_year;
    club.history.rivals = body["history.rivals"]
      ? Array.isArray(body["history.rivals"])
        ? body["history.rivals"]
        : body["history.rivals"]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
      : club.history.rivals;

    // anthem
    club.anthem = {
      title: body["anthem.title"] || club.anthem.title || "",
      lyrics_url: body["anthem.lyrics_url"] || club.anthem.lyrics_url || "",
      audio_url: body["anthem.audio_url"] || club.anthem.audio_url || "",
    };

    // media - replace only if new files provided
    if (files["media.badge"] && files["media.badge"][0]) {
      club.media.badge = `/uploads/${path.basename(files["media.badge"][0].path)}`;
    }
    if (files["media.stadium_image"] && files["media.stadium_image"][0]) {
      club.media.stadium_image = `/uploads/${path.basename(files["media.stadium_image"][0].path)}`;
    }

    // identity mascots and uniforms - append or replace based on query param 'replaceFiles'
    if (files["identity.mascot"]) {
      const arr = files["identity.mascot"].map(
        (f) => `/uploads/${path.basename(f.path)}`,
      );
      if (req.query.replaceFiles === "true") club.identity.mascot = arr;
      else club.identity.mascot = (club.identity.mascot || []).concat(arr);
    }
    if (files["identity.uniform"]) {
      const arr = files["identity.uniform"].map(
        (f) => `/uploads/${path.basename(f.path)}`,
      );
      if (req.query.replaceFiles === "true") club.identity.uniform = arr;
      else club.identity.uniform = (club.identity.uniform || []).concat(arr);
    }

    // links
    club.links = {
      official_website:
        body["links.official_website"] || club.links.official_website || "",
      others_website: body["links.others_website"]
        ? Array.isArray(body["links.others_website"])
          ? body["links.others_website"]
          : body["links.others_website"]
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
        : club.links.others_website,
      social: {
        instagram:
          body["links.social.instagram"] || club.links.social.instagram || "",
        twitter:
          body["links.social.twitter"] || club.links.social.twitter || "",
        facebook:
          body["links.social.facebook"] || club.links.social.facebook || "",
        youtube:
          body["links.social.youtube"] || club.links.social.youtube || "",
      },
    };

    club.metadata.updated_at = nowISO();
    club.metadata.source =
      body["metadata.source"] || club.metadata.source || "";

    clubs[idx] = club;
    writeData(clubs);

    res.json(club);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar clube" });
  }
});

// DELETE /clubs/:id
app.delete("/api/clubs/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    let clubs = readData();
    const idx = clubs.findIndex((c) => c.id === id);
    if (idx === -1)
      return res.status(404).json({ error: "Clube não encontrado" });

    // Optionally remove images from disk - keep simple: do not delete files automatically to avoid accidental removal
    const removed = clubs.splice(idx, 1)[0];
    writeData(clubs);
    res.json({ success: true, removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao remover clube" });
  }
});

// Serve views
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "index.html")),
);
app.get("/club.html", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "club-details.html")),
);
app.get("/form.html", (req, res) =>
  res.sendFile(path.join(__dirname, "views", "club-form.html")),
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Servidor rodando em http://localhost:${PORT}`),
);
