import { generatePlan } from "./planner.js?v=offline1";

const form = document.getElementById("trip-form");
const result = document.getElementById("result");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const spinner = submitBtn.querySelector(".spinner");
const errorEl = document.getElementById("error");
const copyBtn = document.getElementById("copy-btn");
const printBtn = document.getElementById("print-btn");

let lastPlanText = "";

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

  setLoading(true);
  result.innerHTML = `
    <div class="loading-state">
      <span class="spinner"></span>
      <p>Building your trip plan…</p>
    </div>`;

  try {
    await new Promise((r) => requestAnimationFrame(() => r()));
    const text = generatePlan(data);
    if (!text) throw new Error("Empty plan");
    lastPlanText = text;
    result.innerHTML = window.marked ? window.marked.parse(text) : `<pre>${escapeHtml(text)}</pre>`;
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
