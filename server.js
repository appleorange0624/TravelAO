import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { marked } from "marked";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.warn("\n  ⚠  ANTHROPIC_API_KEY not set.");
  console.warn("     Copy .env.example to .env and add your key (https://console.anthropic.com/).\n");
}

const client = apiKey ? new Anthropic({ apiKey }) : null;

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
and neighborhood names. Keep it skimmable. If the destination is "suggest",
pick 2–3 that fit and let the user choose, then plan for the best fit.

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
  if (!client) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is not configured. Copy .env.example to .env and add your key.",
    });
  }
  try {
    const prompt = buildPrompt(req.body || {});
    const msg = await client.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    res.json({ plan: text, html: marked.parse(text) });
  } catch (err) {
    console.error("Plan error:", err);
    res.status(500).json({ error: err.message || "Failed to generate plan" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, hasKey: !!client }));

app.listen(PORT, () => {
  console.log(`\n  TravelAO running → http://localhost:${PORT}\n`);
});
