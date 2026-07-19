# TravelAO

Trip planner for **couples, friends, and family**. Enter relationship, dates, budget, and purpose — get a full day-by-day plan (transport, hotels, restaurants, sights, budget breakdown).

**Two modes:**

1. **Offline** (default) — no API key, works immediately  
2. **DeepSeek AI** — richer plans; get a key at [platform.deepseek.com](https://platform.deepseek.com) (works well from China)

## Quick start

```bash
cd ~/Projects/TravelAO
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: DeepSeek via `.env`

```bash
cp .env.example .env
# paste DEEPSEEK_API_KEY=sk-...
```

You can also paste the key in the UI when DeepSeek mode is selected (remembered in the browser).

## What you get

- Overview tailored to relationship + purpose  
- Transportation  
- 2–3 hotel options  
- Daily itinerary  
- Restaurants & places to visit  
- Budget breakdown  
- Practical notes  

Offline destinations: Kyoto, Tokyo, Paris, Bali, NYC, Barcelona (+ generic fallback). DeepSeek can plan any destination.

## Docs (for continuing later)

| File | Purpose |
|------|---------|
| [docs/SESSION.md](docs/SESSION.md) | Session handoff |
| [docs/PREFERENCES.md](docs/PREFERENCES.md) | Agreed preferences |
| [docs/PROJECT-FLOW.md](docs/PROJECT-FLOW.md) | Architecture & flow |

## Optional: Claude Code CLI

```bash
cd ~/Projects/TravelAO
claude
# then: /skill plan-trip
```

## Optional: Gemini server endpoint

`server.js` still has a `/api/plan` Gemini route if you add `GEMINI_API_KEY` to `.env` — the **web UI does not use it** by default (offline planner).

## License

Personal project — use freely.
