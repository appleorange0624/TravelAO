# TravelAO — Session Handoff

Use this file to continue work if the chat session is lost.

**Last updated:** 2026-07-17  
**Local path:** `~/Projects/TravelAO`  
**Branch:** `main`

---

## What this project is

TravelAO is a **couple / friends / family trip planner**.

User inputs:

1. Relationship (couple / friends / family)
2. Group size & ages (optional)
3. Dates
4. Budget
5. Main purpose
6. Destination (optional — suggests if blank)
7. Extra notes (optional)

Output: a full day-by-day plan with:

- Overview
- Transportation
- Accommodation (2–3 options)
- Daily itinerary (morning / afternoon / evening)
- Restaurants
- Places to visit
- Budget breakdown
- Practical notes (visa, packing, book-now)

---

## Current working mode (IMPORTANT)

**Offline / no API key.**

After trying Claude Code → Anthropic API → Gemini → Groq → OpenRouter, the user could not reliably get/use cloud API keys (Gemini quota/model issues; Groq/OpenRouter signup blocked).

**Decision:** generate plans **in the browser** with coded destination knowledge (`public/planner.js`). No API key, no signup.

- UI: `http://localhost:3000` (Express serves `public/`)
- Engine: `public/planner.js` → `generatePlan(input)`
- Frontend: `public/app.js` (ES module) + `public/index.html`
- Footer build tag: `build offline1`

Built-in destinations: Kyoto, Tokyo, Paris, Bali, NYC, Barcelona + generic fallback.

---

## How to run

```bash
cd ~/Projects/TravelAO
npm install   # first time only
npm start     # → http://localhost:3000
```

No `.env` required for the offline planner.

Optional Claude Code CLI path still exists via `.claude/skills/plan-trip/` if the user wants that later.

---

## Preferences already agreed

See [PREFERENCES.md](./PREFERENCES.md).

## Architecture / flow

See [PROJECT-FLOW.md](./PROJECT-FLOW.md).

## Next ideas (not done yet)

- Add more destinations to `planner.js`
- Improve date parsing (real calendar dates)
- Optional “export PDF”
- Re-enable cloud LLM as an *optional* toggle if user later gets a key
- Kill any stale `node server.js` on port 3000 if the UI looks outdated: `lsof -ti:3000 | xargs kill -9 && npm start`

---

## GitHub

**Live repo:** https://github.com/appleorange0624/TravelAO  

Remote: `origin` → `https://github.com/appleorange0624/TravelAO.git` (branch `main`).

If push fails later:

```bash
gh auth login -h github.com
cd ~/Projects/TravelAO
git push -u origin main
```
