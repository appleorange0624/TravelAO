# TravelAO

Offline trip planner for **couples, friends, and family**. Enter relationship, dates, budget, and purpose — get a full day-by-day plan (transport, hotels, restaurants, sights, budget breakdown).

**No API key. No signup.** Plans are generated in your browser.

## Quick start

```bash
cd ~/Projects/TravelAO
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## What you get

- Overview tailored to relationship + purpose  
- Transportation  
- 2–3 hotel options  
- Daily itinerary  
- Restaurants & places to visit  
- Budget breakdown  
- Practical notes  

Built-in destinations: Kyoto, Tokyo, Paris, Bali, NYC, Barcelona (plus a generic plan for other cities). Leave destination blank to get suggestions.

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
