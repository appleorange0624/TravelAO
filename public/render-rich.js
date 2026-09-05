/**
 * Rich plan renderer — hero, cards with images/links, day summary grid.
 */

import { fetchDestinationMedia, fetchPlaceImage, bookingLinks, videoLinks } from "./media.js?v=rich6";
import { t } from "./i18n.js?v=rich6";
import { buildPlanModel, buildPlanDashboard } from "./plan-dashboard.js?v=rich6";

export async function renderRichPlan(container, { markdown, notice, tripInput, lang = "en", structured }) {
  const destName =
    tripInput.destination ||
    (markdown.match(/^#\s*.+?[—–-]\s*(.+)$/m)?.[1]?.trim()) ||
    "Your trip";

  const media = await fetchDestinationMedia(destName, lang);
  const bodyHtml = window.marked ? window.marked.parse(markdown) : `<pre>${markdown}</pre>`;

  const wrap = document.createElement("div");
  wrap.className = "plan-rich";

  if (notice) {
    const n = document.createElement("p");
    n.className = "notice";
    n.innerHTML = window.marked ? window.marked.parse(notice) : notice;
    wrap.appendChild(n);
  }

  wrap.appendChild(buildHero(media, destName, tripInput, lang));

  const planModel = buildPlanModel(markdown, tripInput, structured);
  wrap.appendChild(buildPlanDashboard(planModel, tripInput, lang));

  const body = document.createElement("div");
  body.className = "plan-body";
  body.innerHTML = bodyHtml;
  enhancePlanDOM(body, tripInput, lang);
  wrap.appendChild(body);
  wrap.appendChild(buildVideoStrip(destName, tripInput.purpose, media.heroImage, lang));

  container.innerHTML = "";
  container.appendChild(wrap);
  await attachAllCardImages(body, lang);
}

function buildHero(media, destName, input, lang) {
  const hero = document.createElement("div");
  hero.className = "plan-hero";
  const title = media.title || destName;
  const imgSrc = media.heroImage;
  const rel =
    input.relationship === "couple" ? t("couple", lang)
    : input.relationship === "family" ? t("family", lang)
    : input.relationship === "friends" ? t("friends", lang)
    : input.relationship || "Trip";

  hero.innerHTML = `
    ${imgSrc ? `<img class="plan-hero__img" src="${escAttr(imgSrc)}" alt="${escAttr(title)}" loading="lazy" />` : `<div class="plan-hero__fallback">✈</div>`}
    <div class="plan-hero__overlay">
      <p class="plan-hero__eyebrow">${esc(rel)} · ${esc(input.purpose || "Travel")}</p>
      <h2 class="plan-hero__title">${esc(title)}</h2>
      ${media.description ? `<p class="plan-hero__desc">${esc(media.description)}</p>` : ""}
      ${input.dates ? `<p class="plan-hero__dates">${esc(input.dates)} · ${esc(input.budget || "")}</p>` : ""}
    </div>`;
  return hero;
}

/** Parse markdown for Day N blocks and build visual summary grid */
function buildDaySummaryFromMarkdown(markdown, lang) {
  const dayRe = /^###\s+(Day\s*\d+|第\s*\d+\s*天)(.*)$/gim;
  const sections = [];
  let m;
  const lines = markdown.split("\n");
  const dayStarts = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^###\s+(Day\s*\d+|第\s*\d+\s*天)/i.test(lines[i])) dayStarts.push(i);
  }

  if (!dayStarts.length) return document.createDocumentFragment();

  for (let d = 0; d < dayStarts.length; d++) {
    const start = dayStarts[d];
    const end = dayStarts[d + 1] ?? lines.length;
    const block = lines.slice(start, end).join("\n");
    const title = lines[start].replace(/^###\s+/, "").trim();
    const morning = block.match(/\*\*(?:Morning|上午)[:\*]*\*\*\s*(.+)/i)?.[1]?.trim() || "";
    const afternoon = block.match(/\*\*(?:Afternoon|下午)[:\*]*\*\*\s*(.+)/i)?.[1]?.trim() || "";
    const evening = block.match(/\*\*(?:Evening|晚上|晚间)[:\*]*\*\*\s*(.+)/i)?.[1]?.trim() || "";
    if (morning || afternoon || evening) sections.push({ title, morning, afternoon, evening });
  }

  if (!sections.length) return document.createDocumentFragment();

  const wrap = document.createElement("section");
  wrap.className = "day-summary-section";
  wrap.innerHTML = `<h3 class="day-summary-section__title">📅 ${esc(t("daySummary", lang))}</h3>`;

  const grid = document.createElement("div");
  grid.className = "day-grid";
  sections.forEach(({ title, morning, afternoon, evening }) => {
    const card = document.createElement("article");
    card.className = "day-card";
    card.innerHTML = `
      <h4 class="day-card__title">${esc(title)}</h4>
      <div class="day-card__slots">
        ${slot(t("dayMorning", lang), "🌅", morning)}
        ${slot(t("dayAfternoon", lang), "☀️", afternoon)}
        ${slot(t("dayEvening", lang), "🌙", evening)}
      </div>`;
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}

function slot(label, icon, text) {
  if (!text) return "";
  return `
    <div class="day-slot">
      <span class="day-slot__label">${icon} ${esc(label)}</span>
      <p class="day-slot__text">${window.marked ? window.marked.parseInline(text) : esc(text)}</p>
    </div>`;
}

function buildVideoStrip(destination, purpose, heroImage, lang) {
  const section = document.createElement("section");
  section.className = "video-strip";
  const links = videoLinks(destination, purpose, lang);
  section.innerHTML = `
    <h3 class="video-strip__title">📺 ${esc(t("watchVideos", lang))}</h3>
    <p class="video-strip__sub">${esc(t("videoSub", lang))}</p>
    <div class="video-grid">${links.map((v) => `
      <a class="video-card" href="${escAttr(v.url)}" target="_blank" rel="noopener noreferrer">
        <div class="video-card__thumb" ${heroImage ? `style="background-image:url('${escAttr(heroImage)}')"` : ""}>
          <span class="video-card__play">▶</span>
        </div>
        <div class="video-card__text"><strong>${esc(v.label)}</strong><span>${esc(v.subtitle)}</span></div>
      </a>`).join("")}</div>`;
  return section;
}

function enhancePlanDOM(root, input, lang) {
  root.querySelectorAll("table").forEach((table) => convertTableToCards(table, input, lang));
  root.querySelectorAll("h2").forEach((h2) => {
    if (/accommodation|stay|hotel|restaurant|food|places|visit|住宿|餐厅|景点|行程/i.test(h2.textContent)) {
      h2.classList.add("section-heading");
    }
  });
  wrapRecommendationBlocks(root, input, lang);
  hideDuplicateDaySections(root);
}

function hideDuplicateDaySections(root) {
  const h2 = [...root.querySelectorAll("h2")].find((h) =>
    /daily|itinerary|每日|行程/i.test(h.textContent)
  );
  if (!h2) return;
  h2.style.display = "none";
  let el = h2.nextElementSibling;
  while (el && el.tagName !== "H2") {
    if (el.tagName === "H3" && /^(Day\s*\d+|第\s*\d+\s*天)/i.test(el.textContent.trim())) {
      el.style.display = "none";
      const ul = el.nextElementSibling;
      if (ul?.tagName === "UL") ul.style.display = "none";
    }
    el = el.nextElementSibling;
  }
}

function convertTableToCards(table, input, lang) {
  const headers = [...table.querySelectorAll("th")].map((th) => th.textContent.trim().toLowerCase());
  const rows = [...table.querySelectorAll("tbody tr, tr")].filter((tr) => tr.querySelector("td"));
  if (!rows.length) return;

  const grid = document.createElement("div");
  grid.className = "card-grid";
  const isHotel = headers.some((h) => /option|hotel|neighborhood|stay|住宿/.test(h));
  const isFood = headers.some((h) => /spot|cuisine|restaurant|food|餐厅/.test(h));
  const dest = input.destination || "";

  rows.forEach((row, i) => {
    const cells = [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
    if (!cells.length) return;
    const type = isHotel ? "hotel" : isFood ? "restaurant" : "sight";
    const name = cells[0];
    grid.appendChild(buildRecCard({ name, cells, type, isTop: i === 0, input, dest, lang }));
  });
  table.replaceWith(grid);
}

function wrapRecommendationBlocks(root, input, lang) {
  const dest = input.destination || "";
  [...root.querySelectorAll("h3")].forEach((h3) => {
    const title = h3.textContent.trim();
    if (/^day \d+|第\s*\d+\s*天/i.test(title)) return;
    const ul = h3.nextElementSibling;
    if (!ul || ul.tagName !== "UL") return;
    const isRec = [...ul.querySelectorAll("li")].some((li) =>
      /why we recommend|why go|neighborhood|price tier|cuisine|推荐理由|为什么|区域|价格/i.test(li.textContent)
    );
    if (!isRec) return;

    const type = /hotel|酒店|stay|住宿/i.test(title) ? "hotel"
      : /restaurant|餐厅|food|eat|吃/i.test(title) ? "restaurant" : "sight";
    const card = buildRecCardFromBlock(title, ul, type, input, dest, lang);
    h3.replaceWith(card);
    ul.remove();
  });
}

function buildRecCardFromBlock(title, ul, type, input, dest, lang) {
  const name = cleanName(title);
  const lines = [...ul.querySelectorAll("li")].map((li) => li.textContent.trim());
  const whyLine = lines.find((l) => /why we recommend|why go|推荐理由|为什么/i.test(l)) || "";
  const meta = lines.filter((l) => l !== whyLine);
  const isTop = /⭐|top pick|首选|推荐/i.test(title);
  return buildRecCard({ name, why: whyLine, meta, type, isTop, input, dest, lang });
}

function buildRecCard({ name, cells, why, meta, type, isTop, input, dest, lang }) {
  const card = document.createElement("article");
  card.className = `rec-card rec-card--${type}`;
  const clean = cleanName(name || cells?.[0] || "");
  const links = bookingLinks(clean, type, dest);

  let body = "";
  if (cells?.length >= 4 && !why) {
    const [, area, tier, reason] = cells;
    body = `
      <div class="rec-card__meta">
        <span class="pill">📍 ${esc(area)}</span>
        <span class="pill pill--price">${esc(tier)}</span>
      </div>
      <p class="rec-card__why"><strong>${esc(t("whyRecommend", lang))}:</strong> ${esc(reason)}</p>`;
  } else {
    if (meta?.length) {
      body = meta.map((m) => `<p class="rec-card__line">${esc(m)}</p>`).join("");
    }
    if (why) {
      body += `<p class="rec-card__why"><strong>${esc(t("whyRecommend", lang))}:</strong> ${esc(why.replace(/^[^:]+:\s*/, ""))}</p>`;
    }
  }

  card.innerHTML = `
    <div class="rec-card__img-wrap" data-place="${escAttr(clean)}"></div>
    ${isTop ? `<span class="rec-card__badge">⭐ ${esc(t("topPick", lang))}</span>` : ""}
    <h4 class="rec-card__title">${esc(clean)}</h4>
    ${body}
    <div class="rec-card__actions">
      <a class="link-btn link-btn--primary" href="${escAttr(links.book)}" target="_blank" rel="noopener">${esc(t("bookNow", lang))}</a>
      <a class="link-btn" href="${escAttr(links.info)}" target="_blank" rel="noopener">${esc(t("moreInfo", lang))}</a>
      <a class="link-btn" href="${escAttr(links.maps)}" target="_blank" rel="noopener">${esc(t("openMaps", lang))}</a>
    </div>`;
  return card;
}

async function attachAllCardImages(root, lang) {
  const wraps = [...root.querySelectorAll(".rec-card__img-wrap")];
  await Promise.all(
    wraps.map(async (wrap) => {
      const name = wrap.dataset.place;
      if (!name) return;
      const img = await fetchPlaceImage(name, lang);
      if (!img) {
        wrap.classList.add("rec-card__img-wrap--empty");
        wrap.innerHTML = `<span class="rec-card__img-fallback">${name.includes("Hotel") || name.includes("酒店") ? "🏨" : name.includes("Restaurant") || /restaurant|餐厅/i.test(name) ? "🍽" : "📍"}</span>`;
        return;
      }
      wrap.innerHTML = `<img class="rec-card__img" src="${escAttr(img)}" alt="${escAttr(name)}" loading="lazy" />`;
    })
  );
}

function cleanName(s) {
  return String(s).replace(/✅|⭐.*$/g, "").trim();
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function escAttr(s) {
  return esc(s).replace(/"/g, "&quot;");
}
