import { generatePlan, buildStructuredPlan } from "./planner.js?v=rich6";
import { researchPlan } from "./research.js?v=rich6";
import { renderRichPlan } from "./render-rich.js?v=rich6";
import { getLang, setLang, applyUiLang, t } from "./i18n.js?v=rich6";

const form = document.getElementById("trip-form");
const result = document.getElementById("result");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const spinner = submitBtn.querySelector(".spinner");
const errorEl = document.getElementById("error");
const copyBtn = document.getElementById("copy-btn");
const printBtn = document.getElementById("print-btn");
const shareBtn = document.getElementById("share-btn");
const modeSelect = document.getElementById("mode");
const modelField = document.getElementById("model-field");
const modelSelect = document.getElementById("model");

const MODE_STORAGE = "travelao_mode";
const MODEL_STORAGE = "travelao_openrouter_model";

let lastPlanText = "";
let lastNotice = "";
let lastTripData = null;
let lastMode = "ai";
let lastLang = getLang();
let lastStructured = null;
let lastShareUrl = "";
let hasAiKey = false;
let aiReachable = false;

function showAiNotice(lang) {
  let el = document.getElementById("ai-notice");
  if (!el) {
    el = document.createElement("p");
    el.id = "ai-notice";
    el.className = "ai-notice";
    modeSelect.closest(".field")?.appendChild(el);
  }
  el.hidden = false;
  el.textContent =
    lang === "zh"
      ? "AI 模式已配置，但当前网络无法连接 OpenRouter（国内常见）。请用「网络搜索」或「离线」，或开启可访问 OpenRouter 的网络后再试。"
      : "AI is configured, but OpenRouter is unreachable from this network (common in China). Use Web research or Offline, or try a network that can reach OpenRouter.";
}

function hideAiNotice() {
  const el = document.getElementById("ai-notice");
  if (el) el.hidden = true;
}

async function renderPlan(text, data, lang, notice, structured = null) {
  lastStructured = structured;
  await renderRichPlan(result, {
    markdown: text,
    notice,
    tripInput: data,
    lang,
    structured,
  });
}

init();

async function init() {
  applyUiLang(lastLang);
  setupLangToggle();

  try {
    const res = await fetch("/api/health");
    const health = await res.json();
    hasAiKey = !!health.hasOpenRouterKey;
    aiReachable = !!health.openRouterReachable;

    if (hasAiKey) {
      document.getElementById("ai-option").hidden = false;
      modelField.hidden = false;
      await loadModels(health.model);
      if (!aiReachable) showAiNotice(getLang());
    }

    const savedMode = localStorage.getItem(MODE_STORAGE);
    if (savedMode === "ai" && hasAiKey) modeSelect.value = "ai";
    else if (savedMode === "offline") modeSelect.value = "offline";
    else if (savedMode === "research") modeSelect.value = "research";
    else modeSelect.value = hasAiKey ? "ai" : "research";

    if (savedMode === "ai" && !hasAiKey) modeSelect.value = "research";
  } catch {
    modeSelect.value = "research";
  }

  modeSelect.addEventListener("change", () => {
    localStorage.setItem(MODE_STORAGE, modeSelect.value);
    modelField.hidden = modeSelect.value !== "ai" || !hasAiKey;
    if (modeSelect.value === "ai" && hasAiKey && !aiReachable) showAiNotice(getLang());
    else hideAiNotice();
  });
  modelField.hidden = modeSelect.value !== "ai" || !hasAiKey;

  modelSelect?.addEventListener("change", () => {
    localStorage.setItem(MODEL_STORAGE, modelSelect.value);
  });

  const shareId = new URLSearchParams(location.search).get("share");
  if (shareId) await loadSharedPlan(shareId);
}

async function loadSharedPlan(id) {
  const lang = getLang();
  result.innerHTML = `<div class="loading-state"><span class="spinner"></span><p>${lang === "zh" ? "加载分享的行程…" : "Loading shared plan…"}</p></div>`;
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Not found");

    lastPlanText = json.plan;
    lastNotice = json.notice || (lang === "zh" ? "分享的行程" : "Shared plan");
    lastTripData = json.tripInput || {};
    lastLang = json.lang || lang;
    lastShareUrl = `${location.origin}${location.pathname}?share=${id}`;

    if (json.tripInput?.relationship) form.relationship.value = json.tripInput.relationship;
    if (json.tripInput?.dates) form.dates.value = json.tripInput.dates;
    if (json.tripInput?.budget) form.budget.value = json.tripInput.budget;
    if (json.tripInput?.purpose) form.purpose.value = json.tripInput.purpose;
    if (json.tripInput?.destination) form.destination.value = json.tripInput.destination;

    await renderPlan(lastPlanText, lastTripData, lastLang, lastNotice, json.structured || null);
    copyBtn.disabled = false;
    printBtn.disabled = false;
    shareBtn.disabled = false;
  } catch (err) {
    result.innerHTML = `<div class="placeholder"><h3>${lang === "zh" ? "无法加载分享" : "Could not load share"}</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function setupLangToggle() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => onLangChange(btn.dataset.lang));
  });
}

async function onLangChange(lang) {
  if (lang !== "en" && lang !== "zh") return;
  setLang(lang);
  applyUiLang(lang);

  if (!lastTripData || !lastPlanText) return;
  if (lang === lastLang) return;

  result.innerHTML = `<div class="loading-state"><span class="spinner"></span><p>${lang === "zh" ? "切换语言中…" : "Switching language…"}</p></div>`;

  try {
    let text = lastPlanText;
    let structured = lastStructured;
    if (lastMode === "offline") {
      const payload = { ...lastTripData, language: lang };
      text = generatePlan(payload);
      structured = buildStructuredPlan(payload);
    } else if (hasAiKey) {
      const res = await fetch("/api/translate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: lastPlanText, language: lang }),
      });
      const json = await res.json();
      if (res.ok) text = json.plan;
      else text = lastMode === "offline" ? generatePlan({ ...lastTripData, language: lang }) : lastPlanText;
    }

    lastPlanText = text;
    lastLang = lang;
    await renderPlan(text, lastTripData, lang, lastNotice, structured);
  } catch (err) {
    result.innerHTML = `<div class="placeholder"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function loadModels(defaultModel) {
  try {
    const res = await fetch("/api/models");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    modelSelect.innerHTML = "";
    const saved = localStorage.getItem(MODEL_STORAGE);
    for (const m of json.models || []) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name || m.id;
      modelSelect.appendChild(opt);
    }
    if (saved && [...modelSelect.options].some((o) => o.value === saved)) modelSelect.value = saved;
    else if (defaultModel) {
      modelSelect.value = [...modelSelect.options].some((o) => o.value === defaultModel)
        ? defaultModel
        : modelSelect.options[0]?.value;
    }
  } catch {
    modelSelect.innerHTML = `<option value="${defaultModel || "meta-llama/llama-3.3-70b-instruct:free"}">${defaultModel || "Default"}</option>`;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  errorEl.textContent = "";

  const lang = getLang();
  const data = {
    relationship: form.relationship.value.trim(),
    groupSize: form.groupSize.value.trim(),
    dates: form.dates.value.trim(),
    budget: form.budget.value.trim(),
    purpose: form.purpose.value.trim(),
    destination: form.destination.value.trim(),
    notes: form.notes.value.trim(),
    language: lang,
  };

  const mode = modeSelect.value;
  lastMode = mode;
  lastLang = lang;
  lastTripData = { ...data };
  lastShareUrl = "";

  setLoading(true);
  result.innerHTML = `
    <div class="loading-state">
      <span class="spinner"></span>
      <p>${loadingMessage(mode, lang)}</p>
    </div>`;

  try {
    let text;
    let notice = "";
    let structured = null;

    if (mode === "ai") ({ text, notice } = await runAi(data));
    else if (mode === "research") ({ text, notice } = await runResearch(data));
    else {
      await new Promise((r) => requestAnimationFrame(() => r()));
      text = generatePlan(data);
      structured = buildStructuredPlan(data);
      if (!text) throw new Error("Empty plan");
    }

    lastPlanText = text;
    lastNotice = notice;
    await renderPlan(text, data, lang, notice, structured);
    copyBtn.disabled = false;
    printBtn.disabled = false;
    shareBtn.disabled = false;
  } catch (err) {
    result.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3>${lang === "zh" ? "无法生成行程" : "Couldn't generate the plan"}</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
    copyBtn.disabled = true;
    printBtn.disabled = true;
    shareBtn.disabled = true;
  } finally {
    setLoading(false);
  }
});

function loadingMessage(mode, lang) {
  if (lang === "zh") {
    if (mode === "ai") return "AI 正在生成可视化行程（含图片与预订链接）…";
    if (mode === "research") return "正在搜索 Wikivoyage 与 Wikipedia…";
    return "正在构建行程…";
  }
  if (mode === "ai") return "Building your visual plan with photos & booking links…";
  if (mode === "research") return "Searching Wikivoyage & Wikipedia…";
  return "Building your trip plan…";
}

async function runAi(data) {
  const model = modelSelect?.value;
  const res = await fetch("/api/ai-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, model }),
  });
  const json = await res.json();
  if (!res.ok) {
    try {
      const fallback = await runResearch(data);
      return { text: fallback.text, notice: `OpenRouter failed (${json.error}). ${fallback.notice || ""}` };
    } catch {
      const text = generatePlan(data);
      if (!text) throw new Error(json.error || "AI plan failed");
      return { text, notice: `OpenRouter failed (${json.error}). Offline plan.` };
    }
  }
  return {
    text: json.plan,
    notice: data.language === "zh"
      ? `由 **OpenRouter**（${json.model || "AI"}）生成`
      : `Generated by **OpenRouter** (${json.model || "AI"})`,
  };
}

async function runResearch(data) {
  try {
    const { plan, pageTitle } = await researchPlan(data);
    return {
      text: plan,
      notice: data.language === "zh"
        ? `已从 Wikivoyage/Wikipedia 研究 **${pageTitle}**`
        : `Researched **${pageTitle}** from Wikivoyage/Wikipedia`,
    };
  } catch (clientErr) {
    try {
      const res = await fetch("/api/research-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return { text: json.plan, notice: json.notice || "" };
    } catch {
      const text = generatePlan(data);
      if (!text) throw clientErr;
      return { text, notice: clientErr.message };
    }
  }
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  spinner.hidden = !loading;
  btnLabel.textContent = loading ? t("generating") : t("generate");
}

copyBtn.addEventListener("click", async () => {
  if (!lastPlanText) return;
  try {
    await navigator.clipboard.writeText(lastPlanText);
    copyBtn.textContent = t("copied");
    setTimeout(() => (copyBtn.textContent = t("copy")), 1500);
  } catch {
    copyBtn.textContent = "Failed";
  }
});

printBtn.addEventListener("click", () => window.print());

shareBtn.addEventListener("click", async () => {
  if (!lastPlanText) return;
  const lang = getLang();
  shareBtn.disabled = true;
  try {
    let url = lastShareUrl;
    if (!url) {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: lastPlanText,
          tripInput: lastTripData,
          notice: lastNotice,
          lang: lastLang || lang,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      url = json.url || `${location.origin}${location.pathname}?share=${json.id}`;
      lastShareUrl = url;
      history.replaceState(null, "", `?share=${json.id}`);
    }
    await navigator.clipboard.writeText(url);
    shareBtn.textContent = t("shareCopied");
    setTimeout(() => (shareBtn.textContent = t("share")), 2500);
  } catch (err) {
    shareBtn.textContent = lang === "zh" ? "分享失败" : "Share failed";
    setTimeout(() => (shareBtn.textContent = t("share")), 2000);
    console.error(err);
  } finally {
    shareBtn.disabled = false;
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}
