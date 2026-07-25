/**
 * Destination media + booking / info links (no API keys).
 */

const UA = "TravelAO/1.4";

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function largerThumb(url) {
  if (!url) return null;
  return url.replace(/\/(\d+)px-/, "/960px-");
}

export async function fetchDestinationMedia(destination, lang = "en") {
  const query = String(destination || "travel").split("—")[0].split(",")[0].trim();
  if (!query) return {};

  const wikiLang = lang === "zh" ? "zh" : "en";
  try {
    const data = await fetchJson(
      `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
    );
    return {
      title: data.title || query,
      heroImage: largerThumb(data.thumbnail?.source),
      description: data.description || "",
      extract: data.extract?.slice(0, 280) || "",
      wikiUrl: data.content_urls?.desktop?.page || "",
    };
  } catch {
    if (wikiLang !== "en") return fetchDestinationMedia(destination, "en");
    return { title: query };
  }
}

export async function fetchPlaceImage(placeName, lang = "en") {
  const name = String(placeName || "").replace(/\*\*/g, "").replace(/⭐.*$/g, "").trim();
  if (!name || name.length < 3) return null;
  const wikiLang = lang === "zh" ? "zh" : "en";
  try {
    const data = await fetchJson(
      `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.split("+")[0].trim())}`
    );
    return largerThumb(data.thumbnail?.source);
  } catch {
    if (wikiLang !== "en") return fetchPlaceImage(placeName, "en");
    return null;
  }
}

export function bookingLinks(name, type, destination) {
  const clean = String(name).replace(/⭐.*$/g, "").trim();
  const dest = String(destination || "").split(",")[0].trim();
  const q = encodeURIComponent(`${clean} ${dest}`.trim());
  const maps = `https://www.google.com/maps/search/?api=1&query=${q}`;

  if (type === "hotel") {
    return {
      book: `https://www.booking.com/searchresults.html?ss=${q}`,
      info: `https://www.google.com/search?q=${q}+hotel+reviews`,
      maps,
    };
  }
  if (type === "restaurant") {
    return {
      book: `https://www.google.com/search?q=${q}+restaurant+reservation`,
      info: `https://www.tripadvisor.com/Search?q=${q}`,
      maps,
    };
  }
  if (type === "sight") {
    return {
      book: maps,
      info: `https://en.wikipedia.org/wiki/${encodeURIComponent(clean.replace(/ /g, "_"))}`,
      maps,
    };
  }
  return { book: maps, info: maps, maps };
}

export function videoLinks(destination, purpose, lang = "en") {
  const dest = String(destination || "travel").split(",")[0].trim();
  const p = String(purpose || "").trim();
  const q = (suffix) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${dest} ${suffix}`)}`;

  if (lang === "zh") {
    return [
      { label: "旅行攻略", subtitle: "景点与路线概览", url: q("旅游攻略") },
      { label: "美食推荐", subtitle: "餐厅与本地美食", url: q("美食") },
      { label: p || "必去景点", subtitle: "活动与实用建议", url: q(`${p || "旅游"} 攻略`) },
    ];
  }
  return [
    { label: "Travel guide", subtitle: "Overview & highlights", url: q("travel guide 4K") },
    { label: "Food & restaurants", subtitle: "Where locals eat", url: q("food tour restaurants") },
    { label: p || "Things to do", subtitle: "Activities & tips", url: q(`${p || "things to do"} travel`) },
  ];
}
