import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { marked } from "marked";

dotenv.config();

// #region agent log
function dbg(message, data, hypothesisId) {
  const payload = {
    sessionId: "1df0bd",
    runId: "run1",
    hypothesisId: hypothesisId || "H0",
    location: "server.js",
    message,
    data: data || {},
    timestamp: Date.now(),
  };
  fetch("http://127.0.0.1:7461/ingest/c39dab69-e21f-4382-8c06-10846ac5193a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "1df0bd" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
// #endregion

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// H1: env var name mismatch — accept both GEMINI_API_KEY and GOOGLE_API_KEY
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const keySource = process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : process.env.GOOGLE_API_KEY ? "GOOGLE_API_KEY" : null;

// #region agent log
dbg("env loaded", {
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  hasGoogleKey: !!process.env.GOOGLE_API_KEY,
  keySource,
  keyLen: apiKey ? apiKey.length : 0,
  keyPrefix: apiKey ? apiKey.slice(0, 4) : null,
  rawEnvVarNames: Object.keys(process.env).filter((k) => k.includes("API") || k.includes("KEY") || k.includes("GEMINI") || k.includes("GOOGLE")),
}, "H1");
// #endregion

if (!apiKey) {
  console.warn("\n  ⚠  GEMINI_API_KEY (or GOOGLE_API_KEY) not set.");
  console.warn("     Get a free key at https://aistudio.google.com/apikey");
  console.warn("     Copy .env.example to .env and paste it in.\n");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function buildPrompt(input) {
  const { relationship, groupSize, dates, budget, purpose, destination, notes } = input;
  return `You are TravelAO, an expert travel planner for couples, friends, and family trips.

Produce a complete day-by-day travel plan in Markdown using this structure:
1. Overview — destination, why it fits, total estimated cost
2. Transportation — getting there + getting around
3. Accommodation — 2–3 hotel options across price tiers
4. Daily Itinerary — morning / afternoon / evening with realistic timing
5. Restaurants — 2–3 per day with cuisine & price tier
6. Places to Visit — matched to the trip purpose
7. Budget Breakdown — table: transport / stay / food / activities / buffer
8. Practical Notes — visas, weather, packing, reservations to book now

Match every recommendation to the relationship and purpose. Give real venue
and neighborhood names. Keep it skimmable. If the destination is "suggest"
or blank, pick 2–3 that fit and let the user choose, then plan for the best fit.

Trip details:
- Relationship: ${relationship || "(ask if missing)"}
- Group size: ${groupSize || "(ask if missing)"}
- Dates: ${dates || "(ask if missing)"}
- Budget: ${budget || "(ask if missing)"}
- Main purpose: ${purpose || "(ask if missing)"}
- Destination: ${destination || "suggest options"}
- Extra notes: ${notes || "none"}

Generate the full plan now.`;
}

app.post("/api/plan", async (req, res) => {
  // #region agent log
  dbg("/api/plan called", { hasAi: !!ai, model: MODEL, bodyKeys: Object.keys(req.body || {}), relationship: req.body?.relationship }, "H5");
  // #endregion
  if (!ai) {
    // #region agent log
    dbg("/api/plan rejected — ai is null", { keySource }, "H1");
    // #endregion
    return res.status(500).json({
      error: "GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured. Get a free key at https://aistudio.google.com/apikey then copy .env.example to .env.",
    });
  }
  try {
    const prompt = buildPrompt(req.body || {});
    // #region agent log
    dbg("calling generateContent", { model: MODEL, promptLen: prompt.length }, "H5");
    // #endregion
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    const text = response.text || "";
    // #region agent log
    dbg("generateContent returned", { textLen: text.length, textPrefix: text.slice(0, 60) }, "H5");
    // #endregion
    if (!text) throw new Error("Empty response from Gemini");
    res.json({ plan: text, html: marked.parse(text) });
  } catch (err) {
    // #region agent log
    dbg("generateContent ERROR", { name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 3).join(" | ") }, "H2");
    // #endregion
    console.error("Plan error:", err);
    res.status(500).json({ error: err.message || "Failed to generate plan" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, hasKey: !!ai, model: MODEL, keySource }));

app.listen(PORT, () => {
  // #region agent log
  dbg("server started", { port: PORT, hasAi: !!ai, model: MODEL, keySource }, "H3");
  // #endregion
  console.log(`\n  TravelAO running → http://localhost:${PORT}\n`);
});
