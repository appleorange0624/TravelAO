/**
 * Parse travel plan markdown into structured data for dashboard, filters, CSV, sharing.
 */

import { parseTripDates, splitPlace, buildDaySummaries } from "./trip-dates.js?v=rich6";

const TIME_SLOTS = {
  en: [
    { key: "morning", label: "Morning", time: "08:00–12:00", re: /\*\*(?:Morning)[:\*]*\*\*\s*(.+)/i },
    { key: "afternoon", label: "Afternoon", time: "12:00–17:00", re: /\*\*(?:Afternoon)[:\*]*\*\*\s*(.+)/i },
    { key: "evening", label: "Evening", time: "18:00–22:00", re: /\*\*(?:Evening)[:\*]*\*\*\s*(.+)/i },
  ],
  zh: [
    { key: "morning", label: "上午", time: "08:00–12:00", re: /\*\*(?:上午)[:\*]*\*\*\s*(.+)/i },
    { key: "afternoon", label: "下午", time: "12:00–17:00", re: /\*\*(?:下午)[:\*]*\*\*\s*(.+)/i },
    { key: "evening", label: "晚上", time: "18:00–22:00", re: /\*\*(?:晚上|晚间)[:\*]*\*\*\s*(.+)/i },
  ],
};

const SECTION_MATCH = {
  accommodation: /(?:where to stay|accommodation|hotel|stay|住宿|推荐住宿)/i,
  restaurants: /(?:restaurant|food|eat|餐厅|餐饮|推荐餐厅)/i,
  entertainment: /(?:places to visit|places|visit|sight|see|do|景点|观光|娱乐|活动)/i,
  daily: /(?:daily|itinerary|schedule|每日|行程)/i,
  transport: /(?:transport|transportation|交通|到达|出行)/i,
  budget: /(?:budget|预算)/i,
};

const PURPOSE_SYNONYMS = {
  anniversary: ["anniversary", "romantic", "couple", "celebration", "special", "sunset", "view", "boutique", "fine"],
  romantic: ["romantic", "couple", "anniversary", "love", "sunset", "view", "boutique"],
  family: ["family", "kid", "child", "children", "safe", "park", "friendly", "zoo"],
  friends: ["friends", "fun", "lively", "social", "nightlife", "bar", "group"],
  food: ["food", "restaurant", "cuisine", "eat", "dining", "market", "culinary", "ramen", "local"],
  relaxation: ["relax", "spa", "beach", "quiet", "slow", "onsen", "wellness"],
  adventure: ["adventure", "hike", "outdoor", "active", "trail", "sport"],
  sightseeing: ["sight", "museum", "temple", "landmark", "historic", "culture", "unesco", "gallery"],
  budget: ["budget", "cheap", "value", "affordable", "hostel"],
  luxury: ["luxury", "upscale", "splurge", "fine", "premium"],
};

export function tierToNum(tier) {
  if (!tier) return 2;
  const t = String(tier).replace(/[^$]/g, "");
  return Math.min(4, Math.max(1, t.length || 2));
}

export function budgetToMaxTier(budgetText) {
  const m = String(budgetText || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  const n = m ? Number(m[1]) : 2500;
  if (n < 1200) return 1;
  if (n < 2500) return 2;
  if (n < 4500) return 3;
  return 4;
}

export function parsePlanMarkdown(markdown, tripInput = {}) {
  const lang = tripInput.language === "zh" ? "zh" : "en";
  const lines = markdown.split("\n");
  const title = markdown.match(/^#\s*(.+)$/m)?.[1]?.trim() || "";
  const destination =
    tripInput.destination ||
    title.split(/[—–-]/).pop()?.trim() ||
    pickOverview(lines, /destination|目的地/i) ||
    "";
  const place = splitPlace(destination);

  const meta = {
    title,
    destination,
    dates: tripInput.dates || pickOverview(lines, /dates|日期/i) || "",
    budget: tripInput.budget || pickOverview(lines, /budget|预算/i) || "",
    purpose: tripInput.purpose || pickOverview(lines, /purpose|目的/i) || "",
    relationship: tripInput.relationship || "",
    groupSize: tripInput.groupSize || "",
    notes: tripInput.notes || "",
    hotelPick: pickOverview(lines, /hotel pick|recommended hotel|推荐.*酒店/i) || "",
    city: place.city,
    country: place.country,
  };

  const sections = splitSections(lines);
  const transport = parseTransportSection(sections.transport);
  const accommodation = parseCategorySection(sections.accommodation, "hotel");
  const restaurants = parseCategorySection(sections.restaurants, "restaurant");
  const entertainment = parseCategorySection(sections.entertainment, "sight");
  const budget = parseBudgetTable(sections.budget);
  const schedule = parseSchedule(sections.daily, lang, meta, transport, accommodation);
  const model = { meta, schedule, accommodation, restaurants, transport, entertainment, budget, lang };
  model.days = buildDaySummaries(model, tripInput);
  return model;
}

function splitSections(lines) {
  const out = {
    accommodation: [],
    restaurants: [],
    entertainment: [],
    daily: [],
    transport: [],
    budget: [],
    other: [],
  };
  let current = "other";

  for (const line of lines) {
    if (/^## /.test(line)) {
      const h = line.slice(3);
      if (SECTION_MATCH.accommodation.test(h)) current = "accommodation";
      else if (SECTION_MATCH.restaurants.test(h)) current = "restaurants";
      else if (SECTION_MATCH.entertainment.test(h)) current = "entertainment";
      else if (SECTION_MATCH.daily.test(h)) current = "daily";
      else if (SECTION_MATCH.transport.test(h)) current = "transport";
      else if (SECTION_MATCH.budget.test(h)) current = "budget";
      else current = "other";
    }
    out[current].push(line);
  }
  return out;
}

function pickOverview(lines, re) {
  const line = lines.find((l) => re.test(l) && l.startsWith("-"));
  if (!line) return "";
  return line.replace(/^-\s*\*\*[^*]+:\*\*\s*/, "").replace(/\*\*/g, "").trim();
}

function extractBold(text) {
  const matches = [...String(text || "").matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
  if (!matches.length) return "";
  const skip = /^(morning|afternoon|evening|上午|下午|晚上|near|hotel|check in|dinner at|lunch at|day \d+)/i;
  const named = matches.find((m) => m.length > 3 && !skip.test(m) && !/^\$/.test(m));
  return named || matches[0];
}

function stripMd(text) {
  return String(text || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function parseBlockFields(block) {
  const fields = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^-\s*\*\*([^:*]+):\*\*\s*(.+)/) || line.match(/^-\s*\*\*([^*]+)\*\*:\s*(.+)/);
    if (m) fields[m[1].trim().toLowerCase()] = stripMd(m[2]);
  }
  return fields;
}

function fieldGet(fields, ...keys) {
  for (const k of keys) {
    const hit = Object.entries(fields).find(([fk]) => fk.includes(k.toLowerCase()));
    if (hit) return hit[1];
  }
  return "";
}

function makeItem(type, name, fields, extra = {}) {
  const tier = fieldGet(fields, "price tier", "price", "价格") || extra.tier || "$$";
  const area = fieldGet(fields, "neighborhood", "cuisine", "区域", "菜系") || extra.area || "";
  const why =
    fieldGet(fields, "why we recommend", "why go", "why", "推荐理由", "tip", "小贴士") ||
    extra.why ||
    "";
  const cleanName = stripMd(name).replace(/⭐.*$/g, "").trim();
  return {
    id: `${type}-${cleanName.slice(0, 24)}`,
    type,
    name: cleanName,
    area,
    tier,
    tierNum: tierToNum(tier),
    why,
    isTop: /⭐|top pick|首选/i.test(name),
    purposeTags: inferPurposeTags(`${why} ${cleanName} ${area}`),
    ...extra,
  };
}

function parseCategorySection(sectionLines, type) {
  const items = [];
  let i = 0;

  while (i < sectionLines.length) {
    const line = sectionLines[i];
    if (/^### /.test(line)) {
      const name = line.replace(/^###\s+/, "").trim();
      const blockLines = [];
      for (let j = i + 1; j < sectionLines.length; j++) {
        if (/^#{2,3} /.test(sectionLines[j])) break;
        blockLines.push(sectionLines[j]);
      }
      const block = blockLines.join("\n");
      items.push(makeItem(type, name, parseBlockFields(block), { isTop: /⭐|top pick|首选/i.test(name) }));
      i += blockLines.length + 1;
      continue;
    }
    if (line.startsWith("- ") && !/^-\s*\*\*[^*]+\*\*:/.test(line)) {
      const text = stripMd(line.slice(2));
      if (text.length >= 8) {
        const name = text.split(/[—–\-:,]/)[0].trim().slice(0, 80);
        const tierMatch = text.match(/(\$+\s*(?:\/|\s)?(?:night|person|pp)?|\$\d+)/i);
        items.push(
          makeItem(type, name, {}, {
            why: text,
            tier: tierMatch ? tierMatch[0].replace(/\s.*$/, "") : "$$",
            isTop: /⭐|top pick/i.test(text),
          })
        );
      }
    }
    i++;
  }
  return dedupeItems(items);
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.name.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectBlock(lines, start) {
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{2,3} /.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join("\n");
}

function inferPurposeTags(text) {
  const lower = text.toLowerCase();
  const tags = new Set(["general"]);
  for (const [tag, words] of Object.entries(PURPOSE_SYNONYMS)) {
    if (words.some((w) => lower.includes(w))) tags.add(tag);
  }
  if (/romantic|couple|anniversary|boutique|sunset|view/.test(lower)) tags.add("romantic");
  if (/family|kid|child|safe|park/.test(lower)) tags.add("family");
  if (/friend|lively|fun|nightlife|bar/.test(lower)) tags.add("friends");
  if (/food|restaurant|cuisine|eat|ramen|dining/.test(lower)) tags.add("food");
  if (/relax|spa|beach|quiet|onsen/.test(lower)) tags.add("relaxation");
  if (/museum|temple|historic|sight|landmark|unesco/.test(lower)) tags.add("sightseeing");
  if (/budget|cheap|value|hostel/.test(lower)) tags.add("budget");
  if (/luxury|upscale|fine|splurge/.test(lower)) tags.add("luxury");
  return [...tags];
}

function expandPurposeWords(purpose, relationship) {
  const words = new Set();
  const p = String(purpose || "").toLowerCase();
  const r = String(relationship || "").toLowerCase();

  for (const w of p.split(/[\s,，、/]+/)) {
    if (w.length > 1) words.add(w);
  }
  if (r) words.add(r);

  for (const [key, syns] of Object.entries(PURPOSE_SYNONYMS)) {
    if (p.includes(key) || syns.some((s) => p.includes(s))) syns.forEach((s) => words.add(s));
  }
  if (/couple|anniversary|romantic/.test(p) || r === "couple") {
    ["romantic", "couple", "anniversary", "boutique", "special"].forEach((s) => words.add(s));
  }
  if (r === "family") ["family", "kid", "safe", "friendly"].forEach((s) => words.add(s));
  if (r === "friends") ["friends", "fun", "lively", "social"].forEach((s) => words.add(s));

  return [...words];
}

function scoreItem(item, words, relationship) {
  let score = item.isTop ? 2 : 0;
  const hay = `${item.name} ${item.why} ${item.area} ${(item.purposeTags || []).join(" ")}`.toLowerCase();

  for (const w of words) {
    if (w.length < 2) continue;
    if (hay.includes(w)) score += 3;
    if ((item.purposeTags || []).some((t) => t.includes(w) || w.includes(t))) score += 2;
  }
  if (relationship === "couple" && (item.purposeTags || []).includes("romantic")) score += 2;
  if (relationship === "family" && (item.purposeTags || []).includes("family")) score += 2;
  if (relationship === "friends" && (item.purposeTags || []).includes("friends")) score += 2;
  return score;
}

export function filterItems(items, { purpose = "", maxTier = 4, relationship = "" } = {}) {
  const words = expandPurposeWords(purpose, relationship);
  const hasPurposeFilter = words.length > 0 && purpose.trim().length > 0;

  const ranked = items
    .filter((item) => item.tierNum <= maxTier)
    .map((item) => ({ item, score: scoreItem(item, words, relationship) }))
    .sort((a, b) => b.score - a.score);

  if (!hasPurposeFilter) return ranked.map(({ item }) => item);

  const hasStrong = ranked.some(({ score }) => score >= 2);
  return ranked
    .filter(({ score }) => !hasStrong || score >= 1)
    .map(({ item }) => item);
}

function parseTransportSection(sectionLines) {
  const items = [];
  let currentLabel = "Transport";
  for (const line of sectionLines) {
    if (/^\*\*(.+)\*\*$/.test(line.trim())) {
      currentLabel = line.replace(/\*\*/g, "").trim();
      continue;
    }
    if (line.startsWith("- ")) {
      items.push({
        id: `transport-${items.length}`,
        type: "transport",
        name: stripMd(line.slice(2)).slice(0, 80),
        description: stripMd(line.slice(2)),
        label: currentLabel,
        tier: "$$",
        tierNum: 2,
        why: stripMd(line.slice(2)),
        purposeTags: ["general"],
      });
    }
  }
  return items;
}

function parseBudgetTable(sectionLines) {
  const rows = [];
  for (const line of sectionLines) {
    if (!line.startsWith("|")) continue;
    if (/^[\|\-:\s]+$/.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 2 && !/^category|类别/i.test(cells[0])) {
      rows.push({ category: stripMd(cells[0]), estimate: stripMd(cells[1]), notes: cells[2] ? stripMd(cells[2]) : "" });
    }
  }
  return rows;
}

function parseSchedule(sectionLines, lang, meta, transport, accommodation) {
  const slots = TIME_SLOTS[lang] || TIME_SLOTS.en;
  const schedule = [];
  const dayStarts = [];
  const topHotel =
    accommodation.find((h) => h.isTop)?.name ||
    accommodation[0]?.name ||
    extractBold(meta.hotelPick) ||
    stripMd(meta.hotelPick?.split("(")[0] || "") ||
    meta.destination;

  const arrive = transport.find((t) => /get(ting)? there|arriv|到达|机场|fly|train/i.test(t.label + t.description))?.description || transport[0]?.description || "Arrival transfer to hotel";
  const around = transport.find((t) => /around|local|transit|交通|市内|getting around/i.test(t.label + t.description))?.description || transport[1]?.description || "Local transit / walking";
  const lines = sectionLines.length ? sectionLines : [];

  for (let i = 0; i < lines.length; i++) {
    if (/^###\s+(Day\s*\d+|第\s*\d+\s*天)/i.test(lines[i])) dayStarts.push(i);
  }

  for (let d = 0; d < dayStarts.length; d++) {
    const start = dayStarts[d];
    const end = dayStarts[d + 1] ?? lines.length;
    const block = lines.slice(start, end).join("\n");
    const dayTitle = lines[start].replace(/^###\s+/, "").trim();
    const dayNum = dayTitle.match(/\d+/)?.[0] || String(d + 1);
    const isFirst = d === 0;
    const isLast = d === dayStarts.length - 1;

    const dateList = parseTripDates(meta.dates, Math.max(1, dayStarts.length), lang);
    const place = splitPlace(meta.destination);

    for (const slot of slots) {
      const activity = block.match(slot.re)?.[1]?.trim();
      if (!activity) continue;
      const location = extractBold(activity) || topHotel || meta.destination;
      let dayTransport = around;
      if (isFirst && slot.key === "morning") dayTransport = arrive;
      if (isLast && slot.key === "evening") dayTransport = "Departure transfer to airport/station";
      if (/transfer|airport|station|hotel near/i.test(activity.toLowerCase()) && slot.key === "morning") {
        dayTransport = arrive;
      }

      schedule.push({
        day: dayTitle,
        dayNum,
        date: dateList[d]?.dateLabel || "",
        dateIso: dateList[d]?.iso || "",
        country: place.country,
        city: place.city,
        time: slot.time,
        timeLabel: slot.label,
        location,
        activity: stripMd(activity),
        transport: dayTransport,
        accommodation: topHotel,
        mainDestination: location,
        category: slot.key,
      });
    }
  }
  return schedule;
}

export function scheduleToCsv(schedule, budget, meta) {
  const header = ["Day", "Time", "Time slot", "Location", "Activity", "Transport", "Accommodation"];
  const rows = schedule.map((r) => [r.day, r.time, r.timeLabel, r.location, r.activity, r.transport, r.accommodation]);
  if (budget.length) {
    rows.push([]);
    rows.push(["Budget category", "Estimate", "Notes"]);
    budget.forEach((b) => rows.push([b.category, b.estimate, b.notes]));
  }
  rows.push([]);
  rows.push(["Destination", meta.destination]);
  rows.push(["Dates", meta.dates]);
  rows.push(["Purpose", meta.purpose]);
  rows.push(["Total budget", meta.budget]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(v) {
  const s = String(v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export function downloadCsv(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Merge structured plan from offline engine over parsed markdown (offline wins on conflicts) */
export function mergePlanModels(parsed, structured) {
  if (!structured) return parsed;
  const merged = {
    ...parsed,
    meta: { ...parsed.meta, ...structured.meta },
    schedule: structured.schedule?.length ? structured.schedule : parsed.schedule,
    accommodation: structured.accommodation?.length ? structured.accommodation : parsed.accommodation,
    restaurants: structured.restaurants?.length ? structured.restaurants : parsed.restaurants,
    transport: structured.transport?.length ? structured.transport : parsed.transport,
    entertainment: structured.entertainment?.length ? structured.entertainment : parsed.entertainment,
    budget: structured.budget?.length ? structured.budget : parsed.budget,
    lang: structured.lang || parsed.lang,
  };
  merged.days = structured.days?.length
    ? structured.days
    : buildDaySummaries({ ...merged, days: undefined });
  return merged;
}
