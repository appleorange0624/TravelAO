import express from "express";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { marked } from "marked";
import { researchPlan } from "./public/research.js";
import { generatePlan } from "./public/planner.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const SHARES_DIR = path.join(__dirname, "data", "shares");

if (!fs.existsSync(SHARES_DIR)) fs.mkdirSync(SHARES_DIR, { recursive: true });

const OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || "").trim();
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PUBLIC_URL =
  process.env.PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `http://localhost:${PORT}`;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function buildPrompt(input) {
  const { relationship, groupSize, dates, budget, purpose, destination, notes, language } = input;
  const lang = language === "zh" ? "zh" : "en";
  const langRule =
    lang === "zh"
      ? "Write the ENTIRE plan in Simplified Chinese (简体中文). Keep hotel/restaurant/place names in original language where appropriate."
      : "Write the entire plan in English.";

  return `You are TravelAO, an expert travel planner for couples, friends, and family trips.

${langRule}

Produce a complete, VISUAL-FRIENDLY travel plan in Markdown. Be specific — use REAL hotel names, REAL restaurant names, and REAL sight names.

Use this structure:

## Overview / 概览
## Transportation / 交通
## 🏨 Where to Stay / 推荐住宿
For EACH hotel (minimum 3):
### [Exact Hotel Name] ⭐ Top pick
- **Neighborhood / 区域:** ...
- **Price tier / 价格:** $ / $$ / $$$
- **Why we recommend it / 推荐理由:** 2–3 sentences tied to relationship + purpose + budget
- **Booking tip / 预订建议:** ...

## 📅 Daily Itinerary / 每日行程
For each day use ### Day 1 (or 第1天) with:
- **Morning / 上午:** ...
- **Afternoon / 下午:** ...
- **Evening / 晚上:** ...

## 🍽 Restaurants / 推荐餐厅
For EACH (minimum 4):
### [Restaurant Name]
- **Cuisine / 菜系:** ...
- **Price tier / 价格:** ...
- **Why we recommend it / 推荐理由:** ...

## 📍 Places to Visit / 推荐景点
For EACH (minimum 5):
### [Place Name]
- **Why go / 推荐理由:** ...
- **Tip / 小贴士:** ...
- **Time needed / 建议时长:** ...

## Budget Breakdown / 预算明细 (table)
## Practical Notes / 实用信息

Trip: relationship=${relationship}, group=${groupSize}, dates=${dates}, budget=${budget}, purpose=${purpose}, destination=${destination || "suggest"}, notes=${notes || "none"}

Generate the full plan now.`;
}

app.get("/api/health", async (_req, res) => {
  let openRouterReachable = false;
  if (OPENROUTER_KEY) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${OPENROUTER_KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      openRouterReachable = r.ok;
    } catch {
      openRouterReachable = false;
    }
  }
  res.json({
    ok: true,
    modes: OPENROUTER_KEY ? ["ai", "research", "offline"] : ["research", "offline"],
    hasOpenRouterKey: !!OPENROUTER_KEY,
    openRouterReachable,
    model: OPENROUTER_MODEL,
    provider: OPENROUTER_KEY ? "openrouter" : "wikivoyage+wikipedia",
  });
});

app.get("/api/models", async (_req, res) => {
  if (!OPENROUTER_KEY) {
    return res.status(400).json({ error: "OPENROUTER_API_KEY not set in .env" });
  }
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${OPENROUTER_KEY}` },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.error?.message || `HTTP ${response.status}`);
    const free = (json.data || [])
      .filter((m) => m.id?.includes(":free") || m.pricing?.prompt === "0")
      .map((m) => ({ id: m.id, name: m.name || m.id }))
      .slice(0, 30);
    res.json({ models: free.length ? free : (json.data || []).slice(0, 20).map((m) => ({ id: m.id, name: m.name || m.id })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai-plan", async (req, res) => {
  if (!OPENROUTER_KEY) {
    return res.status(400).json({
      error: "OPENROUTER_API_KEY missing. Add it to .env and restart the server.",
    });
  }

  const body = req.body || {};
  const model = body.model || OPENROUTER_MODEL;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": PUBLIC_URL,
        "X-Title": "TravelAO",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are TravelAO, a careful, practical travel planner." },
          { role: "user", content: buildPrompt(body) },
        ],
        temperature: 0.7,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = json?.error?.message || json?.message || `HTTP ${response.status}`;
      return res.status(response.status).json({ error: `OpenRouter: ${msg}` });
    }

    const text = json?.choices?.[0]?.message?.content || "";
    if (!text) return res.status(500).json({ error: "Empty response from OpenRouter" });

    res.json({ plan: text, html: marked.parse(text), provider: "openrouter", model });
  } catch (err) {
    console.error("OpenRouter plan error:", err);
    res.status(500).json({ error: err.message || "Failed to reach OpenRouter" });
  }
});

app.post("/api/research-plan", async (req, res) => {
  const body = req.body || {};
  try {
    const { plan, pageTitle, sources } = await researchPlan(body);
    res.json({
      plan,
      html: marked.parse(plan),
      provider: "research",
      pageTitle,
      sources,
    });
  } catch (err) {
    console.warn("Research failed, falling back to offline:", err.message);
    try {
      const plan = generatePlan(body);
      const notice = `Online research unavailable (${err.message}). Showing offline plan instead.`;
      res.json({ plan, html: marked.parse(plan), provider: "offline-fallback", notice });
    } catch {
      res.status(500).json({ error: err.message || "Research and offline fallback both failed" });
    }
  }
});

app.post("/api/translate-plan", async (req, res) => {
  if (!OPENROUTER_KEY) {
    return res.status(400).json({ error: "OPENROUTER_API_KEY not set" });
  }
  const { plan, language } = req.body || {};
  if (!plan) return res.status(400).json({ error: "No plan to translate" });

  const target = language === "zh" ? "Simplified Chinese" : "English";
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": PUBLIC_URL,
        "X-Title": "TravelAO",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content: "You translate travel itineraries. Keep Markdown structure, emoji headers, hotel/restaurant names, and ### Day N / 第N天 blocks intact.",
          },
          {
            role: "user",
            content: `Translate this travel plan to ${target}. Preserve all formatting:\n\n${plan}`,
          },
        ],
        temperature: 0.3,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: json?.error?.message || "Translation failed" });
    }
    const text = json?.choices?.[0]?.message?.content || "";
    if (!text) return res.status(500).json({ error: "Empty translation" });
    res.json({ plan: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/share", (req, res) => {
  const body = req.body || {};
  if (!body.plan && !body.markdown) {
    return res.status(400).json({ error: "Nothing to share" });
  }
  const id = crypto.randomBytes(6).toString("hex");
  const payload = {
    id,
    createdAt: new Date().toISOString(),
    plan: body.plan || body.markdown,
    tripInput: body.tripInput || {},
    notice: body.notice || "",
    lang: body.lang || "en",
  };
  fs.writeFileSync(path.join(SHARES_DIR, `${id}.json`), JSON.stringify(payload));
  res.json({ id, url: `${PUBLIC_URL}/?share=${id}` });
});

app.get("/api/share/:id", (req, res) => {
  const file = path.join(SHARES_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Shared plan not found" });
  try {
    res.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    res.status(500).json({ error: "Could not read shared plan" });
  }
});

app.listen(PORT, () => {
  console.log(`\n  TravelAO running → http://localhost:${PORT}`);
  console.log(`  OpenRouter AI: ${OPENROUTER_KEY ? `ready (${OPENROUTER_MODEL})` : "set OPENROUTER_API_KEY in .env"}`);
  console.log(`  Web research: Wikivoyage + Wikipedia`);
  console.log(`  Offline fallback: always available\n`);
});
