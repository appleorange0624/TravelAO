# TravelAO

AI trip planner for **couples, friends, and family trips**. Give it the
relationship, dates, budget, and main purpose — get back a full day-by-day plan
with transportation, hotels, restaurants, and places to visit.

Built to run with [Claude Code](https://code.claude.com/).

## Setup (one time)

1. Install Claude Code (already done on this Mac):
   ```bash
   npm install -g @anthropic-ai/claude-code@latest
   ```
2. Log in once:
   ```bash
   claude
   ```
   Follow the prompt to authenticate with your Anthropic account.

## Use

```bash
cd ~/Projects/TravelAO
claude
```

Then either run the skill:

```
/skill plan-trip
```

…or just describe your trip:

```
Plan a 4-day couple trip to Kyoto, Oct 10–13, budget $2500, purpose: anniversary
```

Claude will ask for anything missing (relationship, dates, budget, purpose)
and then produce the plan.

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
| `.claude/skills/plan-trip/SKILL.md`   | The planning workflow skill          |
| `prompts/plan-trip.md`                | Reusable prompt template            |
| `examples/example-plan.md`            | Sample output for reference          |

## Notes

- No API keys are stored in this repo. Plans are generated from Claude's
  own knowledge. If you want live pricing/flights later, add an MCP server
  rather than embedding keys here.
- Don't commit personal travel documents or booking confirmations.
