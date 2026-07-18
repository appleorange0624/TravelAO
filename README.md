# TravelAO

AI trip planner for **couples, friends, and family trips**. Give it the
relationship, dates, budget, and main purpose — get back a full day-by-day plan
with transportation, hotels, restaurants, and places to visit.

Built to run with [Claude Code](https://code.claude.com/).

## Setup (one time)

You have two ways to use TravelAO: a **web UI** (recommended) or the
**Claude Code CLI**.

### Option A — Web UI (recommended, free with Google Gemini)

1. Install dependencies:
   ```bash
   cd ~/Projects/TravelAO
   npm install
   ```
2. Get a **free** Gemini API key at <https://aistudio.google.com/apikey>
   (free tier: 15 requests/min, 1500/day — plenty for trip planning).
3. Add the key:
   ```bash
   cp .env.example .env
   # then edit .env and paste your GEMINI_API_KEY
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open <http://localhost:3000>, fill in the form, and click **Generate plan**.

> No credit card needed for the free tier. Google gives you a generous free
> quota — a typical trip plan uses one request.

### Option B — Claude Code CLI

1. Install Claude Code (already done on this Mac):
   ```bash
   npm install -g @anthropic-ai/claude-code@latest
   ```
2. Log in once:
   ```bash
   claude
   ```
3. Run the planner:
   ```bash
   cd ~/Projects/TravelAO
   claude
   ```
   Then either run the skill `/skill plan-trip`, or just describe the trip:
   ```
   Plan a 4-day couple trip to Kyoto, Oct 10–13, budget $2500, purpose: anniversary
   ```

## What You Get

Every plan includes:

- **Overview** — destination, vibe, total estimated cost
- **Transportation** — flights/trains/rental car + local transit
- **Accommodation** — 2–3 hotel options across price tiers
- **Daily Itinerary** — morning / afternoon / evening with timing
- **Restaurants** — 2–3 per day with cuisine & price tier
- **Places to Visit** — matched to the trip purpose
- **Budget Breakdown** — transport / stay / food / activities / buffer
- **Practical Notes** — visas, weather, packing, reservations to book now

## Files

| Path                                  | Purpose                              |
|---------------------------------------|--------------------------------------|
| `CLAUDE.md`                           | Project instructions read at startup |
| `server.js`                           | Express server + Google Gemini API call |
| `public/index.html`                   | Web UI form                          |
| `public/style.css`                    | UI styling                           |
| `public/app.js`                       | Frontend logic                       |
| `.claude/skills/plan-trip/SKILL.md`   | The planning workflow skill (CLI)    |
| `prompts/plan-trip.md`                | Reusable prompt template             |
| `examples/example-plan.md`            | Sample output for reference          |
| `.env.example`                         | `GEMINI_API_KEY` template — copy to `.env` |

## Notes

- The web UI calls the **Google Gemini** API (free tier) using your
  `GEMINI_API_KEY` (kept in `.env`, gitignored). Never commit your key.
- The CLI path uses Claude Code's own auth — no API key needed.
- Don't commit personal travel documents or booking confirmations.
