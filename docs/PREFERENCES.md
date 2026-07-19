# TravelAO — Preferences & Decisions

Remember these when continuing work on this project.

## Product

- **Name:** TravelAO (renamed from empty `TravelUS` folder)
- **Path:** `~/Projects/TravelAO` (prefer `~/Projects/`)
- **Audience:** couple, friends, or family trip arrangements
- **UX priority:** simple web UI form → detailed plan (Copy / Print)
- **Must not require** paid Claude Code / Anthropic / hard-to-get API keys for basic use

## Auth / LLM history (do not regress casually)

| Attempt | Outcome |
|---------|---------|
| Claude Code CLI skill | Set up; needs Claude subscription login |
| Anthropic API web UI | User asked why a key was needed |
| Google Gemini free tier | Key format `AQ.…` worked for ListModels; generateContent hit 429/404/503 on free models |
| Groq | User could not obtain API key |
| OpenRouter | User could not obtain API key |
| **Offline coded planner** | **Default — always keep working** |
| **DeepSeek (China-friendly)** | **Optional AI mode** — key from platform.deepseek.com |

Preference: **offline works with zero signup**. DeepSeek is optional for richer AI plans (good for China). Do not require DeepSeek to use the app.

## Plan content rules

- Tailor tone to relationship (couple → romantic; family → kid-friendly pacing; friends → flexible/social)
- Always include transport, hotels (2–3 tiers), daily itinerary, restaurants, sights, budget table, practical notes
- Real venue/neighborhood names for known destinations; honest “ask hotel / reconfirm” language for generic destinations
- Budget split roughly: transport 35% / stay 30% / food 20% / activities 10% / buffer rest

## Engineering preferences

- Simple stack: Express static server + vanilla HTML/CSS/JS (no heavy framework unless asked)
- Keep secrets out of git (`.env` gitignored); offline mode needs no secrets
- Do not commit API keys, booking PDFs, or personal travel docs
- Frontend design: warm, readable, not generic purple-AI look; brand “TravelAO” visible in hero

## Session continuity

- Read `docs/SESSION.md` and this file at the start of a new chat about TravelAO
- Project Cursor rule: `.cursor/rules/travelao.mdc`
