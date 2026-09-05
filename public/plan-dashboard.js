/**
 * Interactive plan dashboard — day overview, filters, Excel + PPT export.
 */

import {
  parsePlanMarkdown,
  mergePlanModels,
  filterItems,
  budgetToMaxTier,
} from "./plan-model.js?v=rich6";
import { bookingLinks } from "./media.js?v=rich6";
import { t } from "./i18n.js?v=rich6";
import { buildDaySummaries, slotText } from "./trip-dates.js?v=rich6";
import { downloadExcel, downloadPpt } from "./plan-export.js?v=rich6";

export function buildPlanDashboard(model, tripInput, lang) {
  const days = buildDaySummaries(model, tripInput);
  model.days = days;
  const defaultMaxTier = budgetToMaxTier(tripInput.budget || model.meta.budget);
  const filterState = {
    purpose: tripInput.purpose || model.meta.purpose || "",
    maxTier: defaultMaxTier,
    relationship: tripInput.relationship || model.meta.relationship || "",
  };

  const root = document.createElement("section");
  root.className = "plan-dashboard";
  root.innerHTML = `
    <div class="plan-dashboard__head">
      <h3 class="plan-dashboard__title">${esc(t("tripOverview", lang))}</h3>
      <div class="plan-dashboard__actions">
        <button type="button" class="btn-ghost btn-sm" data-action="export-xlsx">${esc(t("exportExcel", lang))}</button>
        <button type="button" class="btn-ghost btn-sm" data-action="export-pptx">${esc(t("exportPptAll", lang))}</button>
      </div>
    </div>
    <div class="overview-stats">
      ${stat(t("destination", lang), model.meta.destination)}
      ${stat(t("colCountry", lang), model.meta.country || days[0]?.country)}
      ${stat(t("colCity", lang), model.meta.city || days[0]?.city)}
      ${stat(t("dates", lang), model.meta.dates)}
      ${stat(t("purpose", lang), model.meta.purpose)}
      ${stat(t("budget", lang), model.meta.budget)}
    </div>
    ${renderDayOverviewTable(days, lang)}
    <div class="dash-tabs" role="tablist">
      ${tab("schedule", t("tabSchedule", lang), true)}
      ${tab("stay", t("tabStay", lang))}
      ${tab("eat", t("tabEat", lang))}
      ${tab("transport", t("tabTransport", lang))}
      ${tab("activities", t("tabActivities", lang))}
      ${tab("budget", t("tabBudget", lang))}
    </div>
    <div class="dash-filters" data-panel-filters hidden>
      <label class="dash-filter">
        <span>${esc(t("filterPurpose", lang))}</span>
        <input type="text" class="dash-filter__input" data-filter="purpose" value="${escAttr(filterState.purpose)}" placeholder="${escAttr(t("filterPurposePh", lang))}" />
      </label>
      <label class="dash-filter">
        <span>${esc(t("filterBudget", lang))}</span>
        <select class="dash-filter__input" data-filter="maxTier">
          <option value="4" ${defaultMaxTier >= 4 ? "selected" : ""}>${esc(t("budgetAny", lang))}</option>
          <option value="1" ${defaultMaxTier === 1 ? "selected" : ""}>$ ${esc(t("budgetLow", lang))}</option>
          <option value="2" ${defaultMaxTier === 2 ? "selected" : ""}>$$</option>
          <option value="3" ${defaultMaxTier === 3 ? "selected" : ""}>$$$</option>
          <option value="4">$$$$</option>
        </select>
      </label>
      <p class="dash-filter-hint" data-filter-hint></p>
    </div>
    <div class="dash-panels"></div>`;

  const panels = root.querySelector(".dash-panels");
  renderSchedulePanel(panels, days, lang);
  renderCategoryPanel(panels, "stay", model.accommodation, tripInput, lang, "hotel", filterState, root);
  renderCategoryPanel(panels, "eat", model.restaurants, tripInput, lang, "restaurant", filterState, root);
  renderTransportPanel(panels, model, lang);
  renderCategoryPanel(panels, "activities", model.entertainment, tripInput, lang, "sight", filterState, root);
  renderBudgetPanel(panels, model, lang);

  root.querySelectorAll(".dash-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(root, btn.dataset.tab));
  });

  root.querySelector('[data-action="export-xlsx"]')?.addEventListener("click", () => {
    downloadExcel(model, lang);
  });
  root.querySelector('[data-action="export-pptx"]')?.addEventListener("click", () => {
    downloadPpt(model, lang);
  });
  root.querySelectorAll("[data-ppt-day]").forEach((btn) => {
    btn.addEventListener("click", () => downloadPpt(model, lang, btn.dataset.pptDay));
  });

  const applyFilters = () => {
    filterState.purpose = root.querySelector('[data-filter="purpose"]')?.value || "";
    filterState.maxTier = Number(root.querySelector('[data-filter="maxTier"]')?.value || 4);
    refreshCategoryPanels(root, model, tripInput, lang, filterState);
  };

  root.querySelector('[data-filter="purpose"]')?.addEventListener("input", applyFilters);
  root.querySelector('[data-filter="maxTier"]')?.addEventListener("change", applyFilters);

  return root;
}

/** Build model from markdown + optional structured overlay */
export function buildPlanModel(markdown, tripInput, structured) {
  const parsed = parsePlanMarkdown(markdown, tripInput);
  return mergePlanModels(parsed, structured);
}

function switchTab(root, tabId) {
  root.querySelectorAll(".dash-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabId);
    b.setAttribute("aria-selected", b.dataset.tab === tabId ? "true" : "false");
  });
  root.querySelectorAll(".dash-panel").forEach((p) => {
    p.hidden = p.dataset.panel !== tabId;
  });
  const filters = root.querySelector("[data-panel-filters]");
  if (filters) {
    filters.hidden = !["stay", "eat", "activities"].includes(tabId);
  }
}

function renderDayOverviewTable(days, lang) {
  if (!days.length) return "";
  const rows = days
    .map(
      (d) => `
    <tr>
      <td class="schedule-table__day">${esc(d.day)}</td>
      <td>${esc(d.date)}</td>
      <td>${esc(d.country || "—")}</td>
      <td>${esc(d.city || "—")}</td>
      <td>${esc(d.accommodation || "—")}</td>
      <td class="schedule-table__muted" title="${escAttr(d.transportation)}">${esc(d.transportation || "—")}</td>
      <td><strong>${esc(d.mainDestination || "—")}</strong></td>
      <td>${esc(slotText(d, "morning") || "—")}</td>
      <td>${esc(slotText(d, "afternoon") || "—")}</td>
      <td>${esc(slotText(d, "evening") || "—")}</td>
      <td class="day-ppt-cell">
        <button type="button" class="btn-ghost btn-sm" data-ppt-day="${escAttr(d.dayNum)}">${esc(t("exportPptDay", lang))}</button>
      </td>
    </tr>`
    )
    .join("");
  return `
    <div class="day-overview">
      <div class="day-overview__head">
        <h4 class="day-overview__title">${esc(t("dayOverview", lang))}</h4>
        <p class="day-overview__hint">${esc(t("dayOverviewHint", lang))}</p>
      </div>
      <div class="schedule-table-wrap day-overview__table">
        <table class="schedule-table schedule-table--overview">
          <thead>
            <tr>
              <th>${esc(t("colDay", lang))}</th>
              <th>${esc(t("colDate", lang))}</th>
              <th>${esc(t("colCountry", lang))}</th>
              <th>${esc(t("colCity", lang))}</th>
              <th>${esc(t("colStay", lang))}</th>
              <th>${esc(t("colTransport", lang))}</th>
              <th>${esc(t("colMainDest", lang))}</th>
              <th>${esc(t("dayMorning", lang))}</th>
              <th>${esc(t("dayAfternoon", lang))}</th>
              <th>${esc(t("dayEvening", lang))}</th>
              <th>${esc(t("exportPpt", lang))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function renderSchedulePanel(container, days, lang) {
  const panel = document.createElement("div");
  panel.className = "dash-panel";
  panel.dataset.panel = "schedule";
  if (!days.length) {
    panel.innerHTML = `<p class="muted">${esc(t("noSchedule", lang))}</p>`;
    container.appendChild(panel);
    return;
  }

  const bodyRows = days
    .flatMap((d) => {
      const slots = d.slots?.length
        ? d.slots
        : [{ time: "", timeLabel: "", location: "", activity: "", transport: d.transportation }];
      return slots.map(
        (r, i) => `
              <tr class="${i === 0 ? "schedule-table__day-start" : ""}">
                <td class="schedule-table__day">${i === 0 ? esc(d.day) : ""}</td>
                <td>${i === 0 ? esc(d.date) : ""}</td>
                <td class="schedule-table__time"><span class="time-badge">${esc(r.time)}</span><span class="time-label">${esc(r.timeLabel)}</span></td>
                <td><strong>${esc(r.location || d.mainDestination || "—")}</strong></td>
                <td>${esc(r.activity || "—")}</td>
                <td class="schedule-table__muted">${esc(r.transport || d.transportation || "—")}</td>
                <td>${esc(d.accommodation || "—")}</td>
                <td>${esc(d.country || "—")}</td>
                <td>${esc(d.city || "—")}</td>
              </tr>`
      );
    })
    .join("");

  panel.innerHTML = `
    <div class="schedule-table-wrap">
      <table class="schedule-table schedule-table--combined">
        <thead>
          <tr>
            <th>${esc(t("colDay", lang))}</th>
            <th>${esc(t("colDate", lang))}</th>
            <th>${esc(t("colTime", lang))}</th>
            <th>${esc(t("colLocation", lang))}</th>
            <th>${esc(t("colActivity", lang))}</th>
            <th>${esc(t("colTransport", lang))}</th>
            <th>${esc(t("colStay", lang))}</th>
            <th>${esc(t("colCountry", lang))}</th>
            <th>${esc(t("colCity", lang))}</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
  container.appendChild(panel);
}

function renderCategoryPanel(container, panelId, items, tripInput, lang, linkType, filterState, root) {
  const panel = document.createElement("div");
  panel.className = "dash-panel";
  panel.dataset.panel = panelId;
  panel.hidden = true;
  panel.innerHTML = `<div class="dash-category-grid" data-grid="${panelId}"></div>`;
  container.appendChild(panel);
  renderFilteredGrid(panel.querySelector("[data-grid]"), items, tripInput, lang, linkType, filterState, root);
}

function renderTransportPanel(container, model, lang) {
  const panel = document.createElement("div");
  panel.className = "dash-panel";
  panel.dataset.panel = "transport";
  panel.hidden = true;
  panel.innerHTML = model.transport.length
    ? `<ul class="transport-list">${model.transport
        .map(
          (tr) => `
        <li class="transport-item">
          <span class="transport-item__label">${esc(tr.label)}</span>
          <p>${esc(tr.description)}</p>
        </li>`
        )
        .join("")}</ul>`
    : `<p class="muted">${esc(t("noTransport", lang))}</p>`;
  container.appendChild(panel);
}

function renderBudgetPanel(container, model, lang) {
  const panel = document.createElement("div");
  panel.className = "dash-panel";
  panel.dataset.panel = "budget";
  panel.hidden = true;
  if (!model.budget.length) {
    panel.innerHTML = `<p class="muted">${esc(t("noBudget", lang))}</p>`;
  } else {
    panel.innerHTML = `
      <table class="budget-table">
        <thead><tr><th>${esc(t("colCategory", lang))}</th><th>${esc(t("colEstimate", lang))}</th><th>${esc(t("colNotes", lang))}</th></tr></thead>
        <tbody>${model.budget
          .map(
            (b) => `<tr><td>${esc(b.category)}</td><td><strong>${esc(b.estimate)}</strong></td><td>${esc(b.notes)}</td></tr>`
          )
          .join("")}</tbody>
      </table>`;
  }
  container.appendChild(panel);
}

function refreshCategoryPanels(root, model, tripInput, lang, filterState) {
  const map = {
    stay: { items: model.accommodation, type: "hotel" },
    eat: { items: model.restaurants, type: "restaurant" },
    activities: { items: model.entertainment, type: "sight" },
  };
  let hint = "";
  for (const [panelId, { items, type }] of Object.entries(map)) {
    const grid = root.querySelector(`[data-grid="${panelId}"]`);
    if (grid) {
      const filtered = filterItems(items, filterState);
      renderFilteredGrid(grid, items, tripInput, lang, type, filterState, root, filtered);
      if (root.querySelector(".dash-tab.active")?.dataset.tab === panelId) {
        hint = t("filterCount", lang)
          .replace("{n}", filtered.length)
          .replace("{total}", items.length);
      }
    }
  }
  const hintEl = root.querySelector("[data-filter-hint]");
  if (hintEl) hintEl.textContent = hint;
}

function renderFilteredGrid(grid, items, tripInput, lang, linkType, filterState, root, preFiltered) {
  const filtered = preFiltered ?? filterItems(items, filterState);
  const dest = tripInput.destination || "";
  const activeTab = root?.querySelector(".dash-tab.active")?.dataset.tab;
  const panelId = grid?.dataset?.grid;
  if (activeTab === panelId && root) {
    const hintEl = root.querySelector("[data-filter-hint]");
    if (hintEl) {
      hintEl.textContent = t("filterCount", lang)
        .replace("{n}", filtered.length)
        .replace("{total}", items.length);
    }
  }

  if (!filtered.length) {
    grid.innerHTML = `<p class="muted">${esc(t("noMatches", lang))}</p>`;
    return;
  }
  grid.innerHTML = filtered
    .map((item) => {
      const links = bookingLinks(item.name, linkType, dest);
      return `
      <article class="dash-item-card dash-item-card--${linkType}${item.isTop ? " dash-item-card--top" : ""}">
        <div class="dash-item-card__head">
          <h4>${esc(item.name)}${item.isTop ? ` <span class="pill pill--top">⭐ ${esc(t("topPick", lang))}</span>` : ""}</h4>
          <span class="pill pill--price">${esc(item.tier)}</span>
        </div>
        ${item.area ? `<p class="dash-item-card__meta">📍 ${esc(item.area)}</p>` : ""}
        ${item.why ? `<p class="dash-item-card__why">${esc(item.why)}</p>` : ""}
        <div class="rec-card__actions">
          <a class="link-btn link-btn--primary" href="${escAttr(links.book)}" target="_blank" rel="noopener">${esc(t("bookNow", lang))}</a>
          <a class="link-btn" href="${escAttr(links.maps)}" target="_blank" rel="noopener">${esc(t("openMaps", lang))}</a>
        </div>
      </article>`;
    })
    .join("");
}

function stat(label, value) {
  if (!value) return "";
  return `<div class="overview-stat"><span class="overview-stat__label">${esc(label)}</span><span class="overview-stat__value">${esc(value)}</span></div>`;
}

function tab(id, label, active) {
  return `<button type="button" class="dash-tab${active ? " active" : ""}" role="tab" data-tab="${id}" aria-selected="${active}">${esc(label)}</button>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function escAttr(s) {
  return esc(s).replace(/"/g, "&quot;");
}
