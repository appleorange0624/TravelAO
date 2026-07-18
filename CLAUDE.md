# TravelAO — AI Trip Planner

## Project Purpose
TravelAO is a Claude Code project that generates detailed travel plans for
**couples, friends, or family trips**. Given a small set of inputs
(relationship, dates, budget, main purpose), it produces a complete day-by-day
itinerary covering transportation, hotels, restaurants, and places to visit.

## How to Use
Run Claude Code in this directory:

```bash
cd ~/Projects/TravelAO
claude
```

Then invoke the trip-planner skill:

```
/skill plan-trip
```

Or describe your trip directly:

```
Plan a 4-day couple trip to Kyoto, Oct 10–13, budget $2500, purpose: anniversary
```

## Required Inputs
The planner will ask for (or accept inline) the following:

| Input         | Example                              |
|---------------|--------------------------------------|
| relationship  | couple / friends / family (note size)|
| dates         | Oct 10 – Oct 13, 2026                 |
| budget        | $2500 total (or per person)           |
| main purpose  | anniversary, relaxation, adventure…  |
| destination   | optional — suggest one if omitted     |

## Output Format
Every plan must include, organized by day:

1. **Overview** — destination, vibe, total estimated cost
2. **Transportation** — flights/trains/rental car + local transit
3. **Accommodation** — 2–3 hotel options with price tier & why it fits
4. **Daily Itinerary** — morning / afternoon / evening with timing
5. **Restaurants** — 2–3 per day, with cuisine & price tier
6. **Places to Visit** — sights/activities matched to the trip purpose
7. **Budget Breakdown** — transport / stay / food / activities / buffer
8. **Practical Notes** — visas, weather, packing, reservations to book now

## Coding Standards
- Keep all guidance files in Markdown.
- No external API keys required — Claude Code generates plans from its own
  knowledge. If live data is needed later, add an MCP server rather than
  embedding keys in this repo.
- Never commit secrets, API keys, or personal travel documents.

## File Layout
```
TravelAO/
├── CLAUDE.md                  # this file — read at session start
├── README.md                  # user-facing guide
├── .claude/
│   └── skills/
│       └── plan-trip/
│           └── SKILL.md       # the planning workflow skill
├── prompts/
│   └── plan-trip.md           # reusable prompt template
└── examples/
    └── example-plan.md        # sample output for reference
```
