# TravelAO — Project Flow

## Folder layout

```
TravelAO/
├── CLAUDE.md                 # Claude Code project instructions (CLI path)
├── README.md                 # How to run
├── package.json              # express, dotenv, marked, @google/genai (legacy server)
├── server.js                 # Serves public/ + optional /api/plan (Gemini; not required for UI)
├── .env.example              # GEMINI_API_KEY template (optional / unused by offline UI)
├── .gitignore
├── docs/
│   ├── SESSION.md            # Handoff for new chats
│   ├── PREFERENCES.md        # Agreed preferences
│   └── PROJECT-FLOW.md       # This file
├── .cursor/rules/
│   └── travelao.mdc          # Cursor always-apply project rule
├── .claude/skills/plan-trip/
│   └── SKILL.md              # Claude Code trip-planning skill
├── prompts/plan-trip.md
├── examples/example-plan.md
└── public/
    ├── index.html            # Form UI (no API key field)
    ├── style.css
    ├── app.js                # Form → generatePlan → render Markdown
    └── planner.js            # Offline plan engine
```

## Runtime flow (current)

```
Browser form submit
  ├─ mode=offline
  │     → planner.js generatePlan()
  │     → marked.parse → result panel
  └─ mode=deepseek
        → POST /api/plan { …fields, apiKey }
        → server.js → DeepSeek chat/completions
        → Markdown plan → result panel
```

Server: static host + DeepSeek `/api/plan` proxy (avoids browser CORS).

## CLI flow (optional)

```
cd ~/Projects/TravelAO
claude
/skill plan-trip
```

Uses Anthropic Claude Code login, not the web UI.

## Destination engine notes (`planner.js`)

- `DESTINATIONS` map keyed by slug (`kyoto`, `tokyo`, …)
- `normalizeDest()` matches user text / aliases
- Empty destination → `suggestDestinations()` then plan top pick
- Unknown destination → `genericDestination(name)` template
- Helpers: `parseBudget`, `parseNights`, `parsePeople`, `budgetSplit`, `buildDayPlan`

## Extending destinations

Add a new entry to `DESTINATIONS` in `public/planner.js` with:

- `name`, `vibe`, `base`
- `transit.arrive` / `around` / `transfer`
- `hotels[]` (3 options with tier + why)
- `sights[]`, `restaurants[]`
- `packing`, `visa`, `tips`
