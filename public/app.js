import { generatePlan } from "./planner.js?v=deepseek1";

const form = document.getElementById("trip-form");
const result = document.getElementById("result");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const spinner = submitBtn.querySelector(".spinner");
const errorEl = document.getElementById("error");
const copyBtn = document.getElementById("copy-btn");
const printBtn = document.getElementById("print-btn");
const modeSelect = document.getElementById("mode");
const deepseekFields = document.getElementById("deepseek-fields");
const apiKeyInput = document.getElementById("apiKey");
const rememberKey = document.getElementById("rememberKey");

const KEY_STORAGE = "travelao_deepseek_key";
const MODE_STORAGE = "travelao_mode";

let lastPlanText = "";

const savedKey = localStorage.getItem(KEY_STORAGE);
if (savedKey) apiKeyInput.value = savedKey;
const savedMode = localStorage.getItem(MODE_STORAGE);
if (savedMode === "deepseek" || savedMode === "offline") modeSelect.value = savedMode;

function syncModeUI() {
  const deepseek = modeSelect.value === "deepseek";
  deepseekFields.hidden = !deepseek;
  localStorage.setItem(MODE_STORAGE, modeSelect.value);
}

modeSelect.addEventListener("change", syncModeUI);
syncModeUI();

apiKeyInput.addEventListener("change", () => {
  if (rememberKey.checked) localStorage.setItem(KEY_STORAGE, apiKeyInput.value.trim());
  else localStorage.removeItem(KEY_STORAGE);
});
rememberKey.addEventListener("change", () => {
  if (rememberKey.checked) localStorage.setItem(KEY_STORAGE, apiKeyInput.value.trim());
  else localStorage.removeItem(KEY_STORAGE);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  errorEl.textContent = "";

  const data = {
    relationship: form.relationship.value.trim(),
    groupSize: form.groupSize.value.trim(),
    dates: form.dates.value.trim(),
    budget: form.budget.value.trim(),
    purpose: form.purpose.value.trim(),
    destination: form.destination.value.trim(),
    notes: form.notes.value.trim(),
  };

  const mode = modeSelect.value;
  setLoading(true);
  result.innerHTML = `
    <div class="loading-state">
      <span class="spinner"></span>
      <p>${mode === "deepseek" ? "Asking DeepSeek… usually 10–30 seconds." : "Building your trip plan…"}</p>
    </div>`;

  try {
    let text;
    if (mode === "deepseek") {
      const apiKey = apiKeyInput.value.trim();
      if (rememberKey.checked && apiKey) localStorage.setItem(KEY_STORAGE, apiKey);
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, apiKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      text = json.plan;
      result.innerHTML = json.html || (window.marked ? window.marked.parse(text) : `<pre>${escapeHtml(text)}</pre>`);
    } else {
      await new Promise((r) => requestAnimationFrame(() => r()));
      text = generatePlan(data);
      if (!text) throw new Error("Empty plan");
      result.innerHTML = window.marked ? window.marked.parse(text) : `<pre>${escapeHtml(text)}</pre>`;
    }
    lastPlanText = text;
    copyBtn.disabled = false;
    printBtn.disabled = false;
  } catch (err) {
    result.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">⚠️</div>
        <h3>Couldn't generate the plan</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>`;
    copyBtn.disabled = true;
    printBtn.disabled = true;
  } finally {
    setLoading(false);
  }
});

function setLoading(loading) {
  submitBtn.disabled = loading;
  spinner.hidden = !loading;
  btnLabel.textContent = loading ? "Generating…" : "Generate plan";
}

copyBtn.addEventListener("click", async () => {
  if (!lastPlanText) return;
  try {
    await navigator.clipboard.writeText(lastPlanText);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
  }
});

printBtn.addEventListener("click", () => window.print());

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}
