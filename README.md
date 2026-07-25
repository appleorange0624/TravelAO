# TravelAO

Trip planner for **couples, friends, and family**. Enter relationship, dates, budget, and purpose — get a full day-by-day plan with photos, booking links, and a day summary.

**Live app:** https://travelao.onrender.com *(after deploy)*

**Three modes:**

1. **AI (OpenRouter)** — richest plans when `OPENROUTER_API_KEY` is set on the server
2. **Web research** — live Wikivoyage + Wikipedia (no API key)
3. **Offline** — instant templates, always works

Supports **English** and **中文**.

## Quick start (local)

```bash
cd ~/Projects/TravelAO
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: OpenRouter via `.env`

```bash
cp .env.example .env
# paste OPENROUTER_API_KEY=sk-or-v1-...
```

## Deploy online (Render)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect repo `appleorange0624/TravelAO`
4. Add secret env var `OPENROUTER_API_KEY` (optional — offline + research work without it)
5. Deploy → share the URL (e.g. `https://travelao.onrender.com`)

Free tier may sleep after ~15 min idle; first visit can take ~30s to wake up.

## What you get

- Overview tailored to relationship + purpose
- Transportation, hotels, restaurants, sights
- Day-by-day summary cards with photos & booking links
- Budget breakdown and practical notes
- YouTube preview links for your destination

## Docs

| File | Purpose |
|------|---------|
| [docs/SESSION.md](docs/SESSION.md) | Session handoff |
| [docs/PREFERENCES.md](docs/PREFERENCES.md) | Agreed preferences |
| [docs/PROJECT-FLOW.md](docs/PROJECT-FLOW.md) | Architecture & flow |

## License

Personal project — use freely.
