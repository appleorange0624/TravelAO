/**
 * Parse trip date ranges and split "City, Country" destination names.
 */

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const CITY_COUNTRY = {
  kyoto: ["Kyoto", "Japan"],
  tokyo: ["Tokyo", "Japan"],
  osaka: ["Osaka", "Japan"],
  paris: ["Paris", "France"],
  bali: ["Bali", "Indonesia"],
  ubud: ["Ubud", "Indonesia"],
  seminyak: ["Seminyak", "Indonesia"],
  canggu: ["Canggu", "Indonesia"],
  nyc: ["New York City", "USA"],
  "new york": ["New York City", "USA"],
  manhattan: ["New York City", "USA"],
  barcelona: ["Barcelona", "Spain"],
  london: ["London", "United Kingdom"],
  rome: ["Rome", "Italy"],
  seoul: ["Seoul", "South Korea"],
  bangkok: ["Bangkok", "Thailand"],
  singapore: ["Singapore", "Singapore"],
  shanghai: ["Shanghai", "China"],
  beijing: ["Beijing", "China"],
  "hong kong": ["Hong Kong", "China"],
  taipei: ["Taipei", "Taiwan"],
  lisbon: ["Lisbon", "Portugal"],
  amsterdam: ["Amsterdam", "Netherlands"],
  sydney: ["Sydney", "Australia"],
};

export function formatDate(d, lang = "en") {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  if (lang === "zh") {
    const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${week}`;
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isoDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function yearFrom(text, fallback) {
  const m = String(text || "").match(/(20\d{2})/);
  return m ? Number(m[1]) : fallback;
}

function extractStartDate(datesText) {
  const s = String(datesText || "").trim();
  if (!s) return null;
  const year = yearFrom(s, new Date().getFullYear());

  const iso = [...s.matchAll(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/g)];
  if (iso.length) {
    return new Date(Number(iso[0][1]), Number(iso[0][2]) - 1, Number(iso[0][3]));
  }

  const monthNames = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
  const sameMonth = s.match(new RegExp(`(${monthNames})\\s+(\\d{1,2})\\s*[–\\-–~to到]+\\s*(\\d{1,2})`, "i"));
  if (sameMonth) {
    return new Date(year, MONTHS[sameMonth[1].toLowerCase()], Number(sameMonth[2]));
  }

  const named = [...s.matchAll(new RegExp(`(${monthNames})\\s+(\\d{1,2})`, "gi"))];
  if (named.length) {
    return new Date(year, MONTHS[named[0][1].toLowerCase()], Number(named[0][2]));
  }

  const zh = [...s.matchAll(/(\d{1,2})\s*月\s*(\d{1,2})/g)];
  if (zh.length) {
    return new Date(year, Number(zh[0][1]) - 1, Number(zh[0][2]));
  }

  const numeric = [...s.matchAll(/(\d{1,2})[/.](\d{1,2})(?:[/.](20\d{2}))?/g)];
  if (numeric.length) {
    const a = Number(numeric[0][1]);
    const b = Number(numeric[0][2]);
    const y = numeric[0][3] ? Number(numeric[0][3]) : year;
    if (a > 12) return new Date(y, b - 1, a);
    return new Date(y, a - 1, b);
  }

  return null;
}

export function parseTripDates(datesText, dayCount, lang = "en") {
  const count = Math.max(1, Number(dayCount) || 1);
  const start = extractStartDate(datesText);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (start) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      out.push({ date: d, dateLabel: formatDate(d, lang), iso: isoDate(d) });
    } else {
      out.push({
        date: null,
        dateLabel: lang === "zh" ? `第 ${i + 1} 天` : `Day ${i + 1}`,
        iso: "",
      });
    }
  }
  return out;
}

export function splitPlace(destination) {
  const raw = String(destination || "").trim();
  if (!raw) return { city: "", country: "" };
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(CITY_COUNTRY)) {
    if (lower.includes(key)) return { city: val[0], country: val[1] };
  }
  const parts = raw.split(/[,，]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts.slice(0, -1).join(", "), country: parts[parts.length - 1] };
  }
  return { city: raw, country: "" };
}

export function groupScheduleByDay(schedule) {
  const map = new Map();
  const order = [];
  for (const row of schedule || []) {
    const key = String(row.day || row.dayNum || "Day");
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key).push(row);
  }
  return order.map((day) => ({ day, rows: map.get(day) }));
}

export function buildDaySummaries(model, tripInput = {}) {
  if (model?.days?.length) return model.days;
  const lang = model?.lang || tripInput.language || "en";
  const place = splitPlace(model?.meta?.destination || tripInput.destination || "");
  const groups = groupScheduleByDay(model?.schedule);
  const n = groups.length || 1;
  const dates = parseTripDates(model?.meta?.dates || tripInput.dates || "", n, lang);
  const hotel = model?.meta?.hotelPick || model?.accommodation?.find((h) => h.isTop)?.name || model?.accommodation?.[0]?.name || "";

  if (!groups.length) {
    return [
      {
        dayNum: 1,
        day: lang === "zh" ? "第 1 天" : "Day 1",
        date: dates[0].dateLabel,
        dateIso: dates[0].iso,
        country: place.country,
        city: place.city,
        mainDestination: model?.meta?.destination || place.city,
        accommodation: hotel,
        transportation: model?.transport?.[0]?.description || "",
        slots: [],
      },
    ];
  }

  return groups.map((g, i) => {
    const rows = g.rows;
    const first = rows[0] || {};
    const morning = rows.find((r) => r.category === "morning") || first;
    const afternoon = rows.find((r) => r.category === "afternoon");
    const evening = rows.find((r) => r.category === "evening");
    const isFirst = i === 0;
    const isLast = i === groups.length - 1;

    let main = first.mainDestination || "";
    if (!main) {
      main = isFirst
        ? afternoon?.location || morning?.location || place.city
        : morning?.location || afternoon?.location || place.city;
    }

    let transportation = first.transportation || "";
    if (!transportation) {
      if (isFirst) transportation = morning?.transport || model?.transport?.[0]?.description || "";
      else if (isLast) transportation = evening?.transport || morning?.transport || "";
      else transportation = morning?.transport || first.transport || "";
    }

    return {
      dayNum: Number(first.dayNum) || i + 1,
      day: g.day,
      date: first.date || dates[i].dateLabel,
      dateIso: first.dateIso || dates[i].iso,
      country: first.country || place.country,
      city: first.city || place.city,
      mainDestination: main,
      accommodation: first.accommodation || hotel,
      transportation,
      slots: rows,
    };
  });
}

export function slotOf(day, key) {
  return (day?.slots || []).find((r) => r.category === key) || null;
}

export function slotText(day, key) {
  const s = slotOf(day, key);
  if (!s) return "";
  const activity = String(s.activity || "").trim();
  const location = String(s.location || "").trim();
  if (location && activity && !activity.includes(location)) return `${location} — ${activity}`;
  return activity || location;
}
