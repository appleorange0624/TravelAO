/**
 * Web research planner — no API keys.
 * Pulls live travel info from Wikivoyage + Wikipedia, filters by trip inputs,
 * and assembles a structured Markdown plan.
 */

const WV_EN = "https://en.wikivoyage.org/w/api.php";
const WV_ZH = "https://zh.wikivoyage.org/w/api.php";
const WP_EN = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const WP_ZH = "https://zh.wikipedia.org/api/rest_v1/page/summary/";
const UA = "TravelAO/1.2 (trip planner; contact: local)";

function usesChinese(input) {
  const blob = [input.purpose, input.notes, input.destination].join(" ");
  return /[\u4e00-\u9fff]/.test(blob);
}

function wikiHosts(input) {
  if (usesChinese(input)) {
    return { wv: WV_ZH, wp: WP_ZH, lang: "zh" };
  }
  return { wv: WV_EN, wp: WP_EN, lang: "en" };
}

const SECTIONS_EN = ["Understand", "Get in", "Get around", "See", "Do", "Eat", "Sleep", "Stay safe"];
const SECTIONS_ZH = ["了解", "到达", "交通", "观光", "活动", "餐饮", "住宿", "安全"];

const PURPOSE_WORDS = {
  anniversary: ["romantic", "scenic", "view", "sunset", "fine dining", "historic", "garden", "temple"],
  relaxation: ["spa", "beach", "quiet", "park", "garden", "walk", "café", "onsen"],
  adventure: ["hike", "trail", "active", "outdoor", "climb", "snorkel", "bike", "national park"],
  food: ["restaurant", "market", "cuisine", "local food", "street food", "bakery", "ramen", "bistro"],
  sightseeing: ["museum", "temple", "landmark", "historic", "UNESCO", "palace", "gallery", "tower"],
  family: ["family", "kid", "zoo", "aquarium", "park", "interactive", "safe"],
};

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "User-Agent": UA, ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout ?? 12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function linesFromHtml(html) {
  const raw = stripHtml(html);
  return raw
    .split(/(?:\n|\.\s+(?=[A-Z])|;\s+)/)
    .map((l) => l.replace(/^[\-*•\d.]+\s*/, "").trim())
    .filter((l) => l.length > 12 && l.length < 280);
}

function parseBudget(text) {
  const m = String(text || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 2000;
}

function parseNights(dates) {
  const s = String(dates || "");
  const nights = s.match(/(\d+)\s*nights?/i);
  if (nights) return Math.max(1, Number(nights[1]));
  const days = s.match(/(\d+)\s*days?/i);
  if (days) return Math.max(1, Number(days[1]) - 1);
  const nums = s.match(/\d{1,2}/g);
  if (nums && nums.length >= 2) {
    const a = Number(nums[0]);
    const b = Number(nums[1]);
    if (b > a && b - a <= 21) return Math.max(1, b - a);
  }
  return 3;
}

function defaultDestination(input) {
  const p = String(input.purpose || "").toLowerCase();
  if (/beach|relax|spa/.test(p)) return "Bali";
  if (/food|eat|culinary/.test(p)) return "Tokyo";
  if (/romantic|anniversary/.test(p)) return "Paris";
  if (input.relationship === "family") return "Barcelona";
  if (input.relationship === "friends") return "Bangkok";
  return "Kyoto";
}

function scoreLine(line, input) {
  const lower = line.toLowerCase();
  let score = 0;
  const purpose = String(input.purpose || "").toLowerCase();
  const notes = String(input.notes || "").toLowerCase();
  const budget = parseBudget(input.budget);

  for (const w of purpose.split(/\s+/)) {
    if (w.length > 3 && lower.includes(w)) score += 4;
  }
  for (const w of notes.split(/\s+/)) {
    if (w.length > 3 && lower.includes(w)) score += 3;
  }

  const purposeKey = Object.keys(PURPOSE_WORDS).find((k) => purpose.includes(k));
  if (purposeKey) {
    for (const w of PURPOSE_WORDS[purposeKey]) {
      if (lower.includes(w)) score += 2;
    }
  }

  if (input.relationship === "couple" && /romantic|view|sunset|boutique|quiet/.test(lower)) score += 2;
  if (input.relationship === "family" && /family|kid|park|zoo|safe|playground/.test(lower)) score += 2;
  if (input.relationship === "friends" && /nightlife|bar|market|fun|walk/.test(lower)) score += 1;

  if (budget < 1500 && /\b(bree|cheap|budget|hostel|free)\b/.test(lower)) score += 2;
  if (budget > 4000 && /\b(luxury|upscale|fine|boutique|splurge)\b/.test(lower)) score += 2;

  if (/\b(wikipedia|citation needed|edit\]|disambiguation)\b/i.test(lower)) score -= 5;
  return score;
}

function pickBest(lines, input, limit = 6) {
  const seen = new Set();
  return [...lines]
    .map((line) => ({ line, score: scoreLine(line, input) }))
    .sort((a, b) => b.score - a.score)
    .filter(({ line }) => {
      const key = line.slice(0, 40).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ line, score }) => ({ line, score }));
}

async function wvApi(base, params) {
  const q = new URLSearchParams({ format: "json", origin: "*", ...params });
  return fetchJson(`${base}?${q}`);
}

async function resolvePage(query, hosts) {
  for (const q of [query, defaultDestination({ destination: query })]) {
    const search = await wvApi(hosts.wv, { action: "opensearch", search: q, limit: 5 });
    const titles = search?.[1] || [];
    if (titles.length) return titles[0];
  }
  // Cross-language fallback
  const alt = hosts.lang === "zh" ? WV_EN : WV_ZH;
  const search = await wvApi(alt, { action: "opensearch", search: query, limit: 3 });
  return search?.[1]?.[0] || null;
}

async function fetchWikipediaSummary(title, wpBase) {
  try {
    const data = await fetchJson(`${wpBase}${encodeURIComponent(title)}`);
    return data?.extract || "";
  } catch {
    return "";
  }
}

async function fetchSectionTexts(title, wanted, wvBase) {
  const parsed = await wvApi(wvBase, { action: "parse", page: title, prop: "sections" });
  const sections = parsed?.parse?.sections || [];
  const out = {};

  for (const name of wanted) {
    const sec = sections.find((s) => s.line.toLowerCase() === name.toLowerCase() || s.line === name);
    if (!sec) continue;
    try {
      const block = await wvApi(wvBase, {
        action: "parse",
        page: title,
        section: sec.index,
        prop: "text",
      });
      const html = block?.parse?.text?.["*"] || "";
      out[name] = linesFromHtml(html);
    } catch {
      out[name] = [];
    }
  }
  return out;
}

function buildItinerary(days, see, doList, eat, input) {
  const pool = pickBest([...see, ...doList], input, days * 4);
  const meals = pickBest(eat, input, days * 2);
  const blocks = [];

  for (let d = 0; d < days; d++) {
    const dayNum = d + 1;
    const morning = pool[d * 2]?.line || "Explore a central neighborhood on foot";
    const afternoon = pool[d * 2 + 1]?.line || "Visit a top sight or museum — book timed entry if needed";
    const evening = meals[d]?.line || "Dinner in a walkable district near your hotel";
    blocks.push(
      `### Day ${dayNum}`,
      "",
      `- **Morning:** ${morning}`,
      `- **Afternoon:** ${afternoon}`,
      `- **Evening:** ${evening}`,
      ""
    );
  }
  return blocks;
}

function mapSections(raw, lang) {
  if (lang !== "zh") return raw;
  const map = {
    了解: "Understand",
    到达: "Get in",
    交通: "Get around",
    观光: "See",
    活动: "Do",
    餐饮: "Eat",
    住宿: "Sleep",
    安全: "Stay safe",
  };
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[map[k] || k] = v;
  }
  return out;
}

function formatPlan(input, title, summary, sections, sources) {
  const nights = parseNights(input.dates);
  const days = nights + 1;
  const budget = parseBudget(input.budget);

  const see = sections.See || [];
  const doList = sections.Do || [];
  const eat = sections.Eat || [];
  const sleep = sections.Sleep || [];
  const getIn = sections["Get in"] || [];
  const getAround = sections["Get around"] || [];
  const safety = sections["Stay safe"] || [];
  const understand = sections.Understand || [];

  const topSights = pickBest([...see, ...doList], input, 8);
  const topFood = pickBest(eat, input, 6);
  const topHotels = pickBest(sleep, input, 4);
  const transport = pickBest([...getIn, ...getAround], input, 5);

  const lines = [];
  lines.push(`# Travel plan — ${title}`);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(`- **Trip:** ${input.relationship}${input.groupSize ? ` (${input.groupSize})` : ""}`);
  lines.push(`- **Dates:** ${input.dates || "(add dates)"} — about **${nights} night${nights === 1 ? "" : "s"} / ${days} days**`);
  lines.push(`- **Budget:** ~$${budget.toLocaleString()} total`);
  lines.push(`- **Purpose:** ${input.purpose}`);
  lines.push(`- **Source:** Live web research (Wikivoyage + Wikipedia), filtered for your trip`);
  if (summary) lines.push(`- **About the destination:** ${summary.slice(0, 320)}${summary.length > 320 ? "…" : ""}`);
  if (input.notes) lines.push(`- **Your notes:** ${input.notes}`);
  if (understand.length) {
    const ctx = pickBest(understand, input, 2).map((x) => x.line);
    if (ctx.length) lines.push(`- **Good to know:** ${ctx.join(" ")}`);
  }
  lines.push("");

  lines.push("## Transportation");
  lines.push("");
  if (transport.length) {
    for (const { line } of transport) lines.push(`- ${line}`);
  } else {
    lines.push("- Search local airport/train options for your origin city");
    lines.push("- Use public transit or rideshare for getting around — avoid peak rush if possible");
  }
  lines.push("");

  lines.push("## Accommodation — best matches from research");
  lines.push("");
  if (topHotels.length) {
    for (const { line, score } of topHotels) {
      lines.push(`- ${line}${score > 4 ? " ⭐" : ""}`);
    }
  } else {
    lines.push("- Look for stays near transit in a central neighborhood");
    lines.push("- Book free-cancellation rates first, then narrow down after comparing areas");
  }
  lines.push("");

  lines.push("## Daily itinerary (filtered suggestions)");
  lines.push("");
  lines.push(...buildItinerary(days, see, doList, eat, input));

  lines.push("## Restaurants & food");
  lines.push("");
  if (topFood.length) {
    for (const { line } of topFood) lines.push(`- ${line}`);
  } else {
    lines.push("- Ask your hotel for nearby breakfast spots");
    lines.push("- Reserve one special dinner if this is a celebration trip");
  }
  lines.push("");

  lines.push("## Places to visit");
  lines.push("");
  if (topSights.length) {
    for (const { line, score } of topSights) {
      lines.push(`- ${line}${score > 5 ? " ⭐ top pick" : ""}`);
    }
  } else {
    lines.push("- Start with the main historic center, then one museum or viewpoint");
  }
  lines.push("");

  lines.push("## Budget breakdown (estimate)");
  lines.push("");
  lines.push("| Category | Estimate | Notes |");
  lines.push("|----------|----------|-------|");
  lines.push(`| Transport | $${Math.round(budget * 0.25).toLocaleString()} | Flights/trains + local transit |`);
  lines.push(`| Stay | $${Math.round(budget * 0.35).toLocaleString()} | ${nights} nights |`);
  lines.push(`| Food | $${Math.round(budget * 0.2).toLocaleString()} | Mix casual + one nice meal |`);
  lines.push(`| Activities | $${Math.round(budget * 0.12).toLocaleString()} | Tickets, tours, extras |`);
  lines.push(`| Buffer | $${Math.round(budget * 0.08).toLocaleString()} | Souvenirs, tips, surprises |`);
  lines.push("");

  lines.push("## Practical notes");
  lines.push("");
  if (safety.length) {
    for (const { line } of pickBest(safety, input, 3)) lines.push(`- ${line}`);
  }
  lines.push("- Double-check visa/passport rules before booking");
  lines.push("- Save offline maps and confirmation emails");
  lines.push("- Book the top 1–2 sights ahead if they require timed entry");
  lines.push("");
  lines.push("## Research sources");
  lines.push("");
  for (const s of sources) lines.push(`- ${s}`);
  lines.push("");

  return lines.join("\n");
}

export async function researchPlan(input) {
  const query = (input.destination || "").trim() || defaultDestination(input);
  const hosts = wikiHosts(input);

  let pageTitle = await resolvePage(query, hosts);
  let wvBase = hosts.wv;
  let wpBase = hosts.wp;
  let lang = hosts.lang;

  if (!pageTitle && hosts.lang === "zh") {
    pageTitle = await resolvePage(query, { wv: WV_EN, wp: WP_EN, lang: "en" });
    wvBase = WV_EN;
    wpBase = WP_EN;
    lang = "en";
  }
  if (!pageTitle) throw new Error(`No Wikivoyage page found for “${query}”`);

  const wanted = lang === "zh" ? SECTIONS_ZH : SECTIONS_EN;
  const [summary, rawSections] = await Promise.all([
    fetchWikipediaSummary(pageTitle, wpBase),
    fetchSectionTexts(pageTitle, wanted, wvBase),
  ]);
  const sections = mapSections(rawSections, lang);

  const totalLines = Object.values(sections).reduce((n, arr) => n + arr.length, 0);
  if (totalLines < 3) throw new Error(`Wikivoyage page “${pageTitle}” had too little travel content`);

  const wikiHost = lang === "zh" ? "zh.wikivoyage.org" : "en.wikivoyage.org";
  const sources = [
    `[Wikivoyage: ${pageTitle}](https://${wikiHost}/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_"))})`,
    `[Wikipedia: ${pageTitle}](https://${lang}.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_"))})`,
  ];

  const plan = formatPlan(input, pageTitle, summary, sections, sources);
  return { plan, pageTitle, sources };
}
