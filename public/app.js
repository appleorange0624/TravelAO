import { generatePlan } from "./planner.js?v=rich2";
import { researchPlan } from "./research.js?v=rich2";
import { renderRichPlan } from "./render-rich.js?v=rich2";
import { getLang, setLang, applyUiLang, t } from "./i18n.js?v=rich2";

const form = document.getElementById("trip-form");
const result = document.getElementById("result");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const spinner = submitBtn.querySelector(".spinner");
const errorEl = document.getElementById("error");
const copyBtn = document.getElementById("copy-btn");
const printBtn = document.getElementById("print-btn");
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
let hasAiKey = false;

init();

async function init() {
  applyUiLang(lastLang);
  setupLangToggle();

  try {
    const res = await fetch("/api/health");
    const health = await res.json();
    hasAiKey = !!health.hasOpenRouterKey;

    if (hasAiKey) {
      document.getElementById("ai-option").hidden = false;
      modelField.hidden = false;
      await loadModels(health.model);
    }

    const savedMode = localStorage.getItem(MODE_STORAGE);
    if (savedMode === "ai" && hasAiKey) modeSelect.value = "ai";
    else if (savedMode === "offline") modeSelect.value = "offline";
    else if (savedMode === "research") modeSelect.value = "research";
    else modeSelect.value = hasAiKey ? "ai" : "research";
  } catch {
    modeSelect.value = "research";
  }

  modeSelect.addEventListener("change", () => {
    localStorage.setItem(MODE_STORAGE, modeSelect.value);
    modelField.hidden = modeSelect.value !== "ai" || !hasAiKey;
  });
  modelField.hidden = modeSelect.value !== "ai" || !hasAiKey;

  modelSelect?.addEventListener("change", () => {
    localStorage.setItem(MODEL_STORAGE, modelSelect.value);
  });
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
    if (lastMode === "offline") {
      text = generatePlan({ ...lastTripData, language: lang });
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
    await renderRichPlan(result, {
      markdown: text,
      notice: lastNotice,
      tripInput: lastTripData,
      lang,
    });
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

  setLoading(true);
  result.innerHTML = `
    <div class="loading-state">
      <span class="spinner"></span>
      <p>${loadingMessage(mode, lang)}</p>
    </div>`;

  try {
    let text;
    let notice = "";

    if (mode === "ai") ({ text, notice } = await runAi(data));
    else if (mode === "research") ({ text, notice } = await runResearch(data));
    else {
      await new Promise((r) => requestAnimationFrame(() => r()));
      text = generatePlan(data);
      if (!text) throw new Error("Empty plan");
    }

    lastPlanText = text;
    lastNotice = notice;
    await renderRichPlan(result, { markdown: text, notice, tripInput: data, lang });
    copyBtn.disabled = false;
    printBtn.disabled = false;
  } catch (err) {
    result.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3>${lang === "zh" ? "无法生成行程" : "Couldn't generate the plan"}</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
    copyBtn.disabled = true;
    printBtn.disabled = true;
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}
