import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { marked } from "marked";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const ENV_KEY = process.env.DEEPSEEK_API_KEY || "";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/chat/completions";

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
You may reply in the same language the user used in their notes/purpose if clearly Chinese; otherwise use English.

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

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "deepseek",
    hasEnvKey: !!ENV_KEY,
    model: MODEL,
  });
});

app.post("/api/plan", async (req, res) => {
  const body = req.body || {};
  const apiKey = (body.apiKey || ENV_KEY || "").trim();
  if (!apiKey) {
    return res.status(400).json({
      error: "DeepSeek API key missing. Get one at https://platform.deepseek.com then paste it in the UI or set DEEPSEEK_API_KEY in .env",
    });
  }

  try {
    const prompt = buildPrompt(body);
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || MODEL,
        messages: [
          { role: "system", content: "You are TravelAO, a careful, practical travel planner." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = json?.error?.message || json?.message || `HTTP ${response.status}`;
      return res.status(response.status).json({ error: `DeepSeek error: ${msg}` });
    }

    const text = json?.choices?.[0]?.message?.content || "";
    if (!text) {
      return res.status(500).json({ error: "Empty response from DeepSeek" });
    }
    res.json({ plan: text, html: marked.parse(text), provider: "deepseek" });
  } catch (err) {
    console.error("DeepSeek plan error:", err);
    res.status(500).json({
      error: err.message || "Failed to reach DeepSeek. Check network / VPN if needed.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n  TravelAO running → http://localhost:${PORT}`);
  console.log(`  Offline planner: always available`);
  console.log(`  DeepSeek: ${ENV_KEY ? "env key loaded" : "paste key in UI or set DEEPSEEK_API_KEY"}\n`);
});
