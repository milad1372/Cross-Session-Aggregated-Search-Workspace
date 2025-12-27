// server/routes/controller.js

"use strict";

const express   = require("express");
const axios     = require("axios");
const OpenAI    = require("openai");
const pLimitPkg = require("p-limit");
const pLimit    = pLimitPkg.default ?? pLimitPkg;   // normalize ESM import
const limiter   = pLimit(1);                        // only one OpenAI job at once
const retry     = require("async-retry");
const multer    = require("multer");
const WebSocket = require("ws");

const apiCall             = require("../business/ApiCall");
const databaseOperations   = require("../business/databaseOperation");

const app          = express();
const recordRoutes = express.Router();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// ─── Ping ─────────────────────────────────────────────────────────────────────
recordRoutes.route("/").get(() => console.log("api connected!"));

// ─── OpenAI client ────────────────────────────────────────────────────────────
const FALLBACK_OPENAI_API_KEY = 'OpenAIKey'; //

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || FALLBACK_OPENAI_API_KEY,
});
const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Helpers: fetch images ─────────────────────────────────────────────────────
async function fetchImageUrlsForDocs(docs) {
  async function tryFetch(url, type) {
    try {
      const { data } = await axios.get(url);
      if (type === "doi")   return data?.included?.[0]?.coverImageUrl ?? null;
      if (type === "issn")  return data?.data?.[0]?.coverImageUrl ?? null;
      if (type === "query") return data?.data?.[0]?.coverImageUrl ?? null;
    } catch (err) {
      console.error(`Image fetch error for ${url}:`, err.message);
    }
    return null;
  }

  return Promise.all(docs.map(async (doc) => {
    // 1️⃣ DOI
    const doiRaw = doc?.article?.pnx?.addata?.doi;
    const doi    = Array.isArray(doiRaw) ? doiRaw[0] : doiRaw;
    if (doi) {
      const u = `https://public-api.thirdiron.com/public/v1/libraries/172/articles/doi/${doi}?include=journal&access_token=...`;
      const img = await tryFetch(u, "doi");
      if (img) return img;
    }
    // 2️⃣ ISSN
    const issnRaw = doc?.article?.pnx?.addata?.issn;
    const issn    = Array.isArray(issnRaw) && issnRaw.length ? issnRaw[0].replace(/-/g, "") : undefined;
    if (issn) {
      const u = `https://public-api.thirdiron.com/public/v1/libraries/172/search?issns=${issn}&access_token=...`;
      const img = await tryFetch(u, "issn");
      if (img) return img;
    }
    // 3️⃣ Title search
    const title = doc?.article?.pnx?.display?.title || doc?.article?.title || "";
    if (title) {
      const u = `https://public-api.thirdiron.com/public/v1/libraries/172/search?query=${encodeURIComponent(title)}&access_token=...`;
      const img = await tryFetch(u, "query");
      if (img) return img;
    }
    // 4️⃣ ISBN fallback
    const isbnRaw = doc?.article?.pnx?.addata?.isbn;
    const isbn    = Array.isArray(isbnRaw) ? isbnRaw[0] : isbnRaw;
    if (isbn) {
      return `https://proxy-na.hosted.exlibrisgroup.com/exl_rewrite/syndetics.com/index.php?client=primo&isbn=${isbn}/lc.jpg`;
    }
    return "No image available";
  }));
}

// ─── Helpers: transform ExLibris to Europeana schema ────────────────────────────
function transformExLibrisToEuropeana(exLibrisDocs, imageUrls) {
  const items = exLibrisDocs.map((doc, i) => {
    const pnx     = doc.article?.pnx ?? {};
    const control = pnx.control ?? {};
    const sort    = pnx.sort ?? {};
    const display = pnx.display ?? {};
    return {
      id:           control.recordid || "",
      title:        Array.isArray(sort.title) ? sort.title : [sort.title || ""],
      rights:       ["EXLIB"],
      dataProvider: Array.isArray(display.publisher) ? display.publisher : [display.publisher || ""],
      dcCreator:    Array.isArray(display.publisher) ? display.publisher : [display.publisher || ""],
      type:         "Article",
      edmPreview:   imageUrls[i] ? [imageUrls[i]] : ["No image available"],
      dcDescription:Array.isArray(display.description) ? display.description : [display.description || ""],
    };
  });
  return {
    apikey: "exlib",
    success: true,
    requestNumber: 999,
    itemsCount: items.length,
    totalResults: exLibrisDocs?.[0]?.totalRecords || 0,
    items,
  };
}

// ─── /recordList route ────────────────────────────────────────────────────────
recordRoutes.post("/recordList", async (req, res) => {
  console.log("▶ /recordList");
  const term = (req.body.searchInput || "").trim().toLowerCase();
  if (!term) return res.status(404).json({ success: "false", data: [] });
  try {
    const [eu, xl, wp] = await Promise.all([
      apiCall.retrieveDocumentsFromEuropeanaAPI(term, req.body.filterQuery, req.body.pageNumber),
      apiCall.retrieveDocumentsFromexlibrisgroupAPI(term, req.body.pageNumber),
      apiCall.retrieveDocumentsFromWikipedia(term, req.body.pageNumber),
    ]);
    const imageUrls           = await fetchImageUrlsForDocs(xl);
    const transformedExLibris = transformExLibrisToEuropeana(xl, imageUrls);
    const allItems = [...eu.items, ...transformedExLibris.items, ...wp.items];

    // send to Python for keywords & clusters
    const texts = allItems.map((it) => {
      const t = Array.isArray(it.title) ? it.title.join(" ") : it.title || "";
      const d = Array.isArray(it.dcDescription) ? it.dcDescription.join(" ") : it.dcDescription || "";
      return `${t} ${d}`;
    });
    const { data: py } = await axios.post("http://localhost:5001/process_texts", { texts });
    const itemsWithExtra = allItems.map((it, i) => ({
      ...it,
      keywords:     py.keywords_list[i],
      clusterLabel: py.cluster_labels[i],
    }));
    res.json({
      success: "true",
      data: {
        items: itemsWithExtra,
        totalResults: eu.totalResults + transformedExLibris.totalResults + wp.items.length,
      },
    });
  } catch (err) {
    console.error("❌ /recordList", err);
    res.status(500).json({ success: "false", message: "error fetching data" });
  }
});

// ─── Summarization helpers ────────────────────────────────────────────────────
const chunkText = (str, size = 3000) => {
  const w = str.split(/\s+/), out = [];
  for (let i = 0; i < w.length; i += size) out.push(w.slice(i, i+size).join(" "));
  return out;
};
const buildPrompt = ({ highlightPart, docIdPart, chunk }) => [
  { role: "system", content: "You are a concise, domain-expert summariser." },
  {
    role: "user",
    content: `
${highlightPart}
${docIdPart}

CONTENT:
${chunk}

TASK:
• Bullet-point summary by main topic.
• Cite items as [docId:<id>].
• Do NOT mention source names.
`.trim(),
  },
];
const callOpenAi = (messages) =>
  retry(async (bail, attempt) => {
    if (attempt>1) console.log(`⟳ retry ${attempt-1}`);
    return openai.chat.completions.create({
      model: "gpt-4o-2024-05-13",
      messages,
      temperature: 0.4,
    });
  }, { retries: 4, minTimeout: 4000, factor: 2 });

// ─── /summarize route ────────────────────────────────────────────────────────
recordRoutes.post("/summarize", async (req, res) => {
  console.log("▶ /summarize");
  try {
    const {
      highlightedKeys = [],
      europeanaText   = "",
      wikipediaText   = "",
      libraryText     = "",
      sourceMapping   = "",
    } = req.body;

    const highlightPart = highlightedKeys.length
      ? `Using the following highlighted keywords: ${highlightedKeys.join(", ")}.`
      : `No highlighted keywords were provided. Summarize the content based on the data provided below.`;

    const docIdPart = sourceMapping ? `Reference mapping:\n${sourceMapping}` : "";
    const dataText  = `${europeanaText}\n${wikipediaText}\n${libraryText}`;
    const totalWords = dataText.split(/\s+/).length;

    // single-pass if ≤75k words
    if (totalWords < 75000) {
      const out = await limiter(() =>
        callOpenAi(buildPrompt({ highlightPart, docIdPart, chunk: dataText }))
      );
      return res.json({ success: "true", summary: out.choices[0].message.content.trim() });
    }

    // otherwise chunk
    const partials = [];
    for (const [i, chunk] of chunkText(dataText,3000).entries()) {
      console.log(` • summarising chunk ${i+1}`);
      const r = await limiter(() => callOpenAi(buildPrompt({ highlightPart, docIdPart, chunk })));
      partials.push(r.choices[0].message.content.trim());
      await sleep(500);
    }
    const combined = partials.join("\n\n");
    const final    = await limiter(() =>
      callOpenAi(buildPrompt({ highlightPart, docIdPart, chunk: combined }))
    );
    res.json({ success: "true", summary: final.choices[0].message.content.trim() });
  } catch (err) {
    console.error("❌ /summarize", err);
    res.status(500).json({ success: "false", message: "Error generating summary." });
  }
});

// ─── CRUD routes (unchanged) ─────────────────────────────────────────────────
recordRoutes.post("/saveGalleryIntoDataBase", async (req, res) => {
  const { gallery, artwork, image, isPrivate, galleryDescription, user, query } = req.body;
  const success = await databaseOperations.saveGallery(
    String(gallery).trim(),
    artwork,
    image,
    galleryDescription,
    user.trim().toLowerCase(),
    isPrivate,
    query.trim()
  );
  res.status(success?200:500).json({ success: success?"true":"false", data: [] });
});

recordRoutes.post("/saveArtworkIntoDataBase", async (req, res) => {
  const { artwork, user } = req.body;
  const success = await databaseOperations.saveLikedArtwork(artwork, user.trim().toLowerCase());
  res.status(success?200:500).json({ success: success?"true":"false", data: [] });
});

recordRoutes.post("/deleteLikedArtwork", async (req, res) => {
  const { artworkId, user } = req.body;
  const success = await databaseOperations.deleteLikedArtwork(artworkId, user.trim().toLowerCase());
  res.status(success?200:500).json({ success: success?"true":"false", data: [] });
});

recordRoutes.post("/deleteGallery", async (req, res) => {
  const { galleryName, user } = req.body;
  const success = await databaseOperations.deleteGallery(galleryName.trim().toLowerCase(), user.trim().toLowerCase());
  res.status(success?200:500).json({ success: success?"true":"false", data: [] });
});

recordRoutes.post("/deleteArtworkFromGallery", async (req, res) => {
  const { galleryId, artworkId, user } = req.body;
  const success = await databaseOperations.deleteArtworkFromGallery(
    galleryId.trim().toLowerCase(),
    artworkId.trim().toLowerCase(),
    user.trim().toLowerCase()
  );
  res.status(success?200:500).json({ success: success?"true":"false", data: [] });
});

recordRoutes.post("/updateGallery", async (req, res) => {
  const { gallery, user } = req.body;
  const success = await databaseOperations.updateGallery(gallery, user.trim().toLowerCase());
  res.status(success?200:500).json({ success: success?"true":"false", data: [] });
});

recordRoutes.post("/getGalleries", async (req, res) => {
  const user = (req.body.user||"").trim().toLowerCase();
  const galleries = await databaseOperations.getGalleries(user);
  res.json({ success: "true", galleries });
});

recordRoutes.post("/getLikedArtworksForUser", async (req, res) => {
  const user = (req.body.user||"").trim().toLowerCase();
  const likedArtworks = await databaseOperations.getLikedArtworksForUser(user);
  res.json({ success: "true", likedArtworks });
});

// ─── Video upload ─────────────────────────────────────────────────────────────
const storageConfig = multer.diskStorage({
  destination: (_,__,cb) => cb(null,"./videos"),
  filename: (_,file,cb) => cb(null,file.originalname),
});
const upload = multer({ storage: storageConfig });
recordRoutes.post("/saveVideoFile", upload.single("video"), (req,res) => {
  console.log(req.file);
  res.json({ success: "true" });
});

// ─── WebSocket log listener ───────────────────────────────────────────────────
const wss = new WebSocket.Server({ port: 2007 });
wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    const data = JSON.parse(msg);
    if (data.type !== "logEvents") return;
    const items = data.payload.items || [];
    if (!items.length || !items[0].applicationSpecificData) return;

    const userID = items[0].applicationSpecificData.userID;
    const doc    = await databaseOperations.getLogByUserId(userID);
    const logs   = items
      .filter(l => l.eventType !== "browserEvent")
      .map(l => ({
        applicationSpecificData: l.applicationSpecificData,
        eventType:               l.eventType,
        eventDetails:            l.eventDetails,
        timestamps:              l.timestamps,
        metadata:                l.metadata,
      }));

    if (doc) {
      doc.logs.push(...logs);
      databaseOperations.updateLog(doc);
    } else {
      databaseOperations.saveNewLog({ userID, logs });
    }
  });
});

// ─── Export router ─────────────────────────────────────────────────────────────
module.exports = recordRoutes;
