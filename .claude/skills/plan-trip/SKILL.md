---
name: plan-trip
description: Generate a detailed travel plan for a couple, friend, or family trip from relationship, dates, budget, and main purpose. Covers transportation, hotels, restaurants, and places to visit.
---

# Plan a Trip

Use this skill when the user wants a complete travel plan. The planner takes a
small set of inputs and produces a detailed day-by-day itinerary.

## 1. Gather Inputs

Collect the four required inputs. Ask one question at a time, or accept them
inline if the user provided them. If a value is missing, ask for it.

- **relationship** — couple / friends / family (and group size + ages if family)
- **dates** — start and end dates (and trip length in nights)
- **budget** — total or per person, currency, and flexibility
- **main purpose** — e.g. anniversary, relaxation, adventure, food, sightseeing, birthday
- **destination** — optional. If omitted, suggest 2–3 options that fit the
  relationship, dates, budget, and purpose, then let the user choose.

## 2. Confirm Scope

Before generating, restate the trip parameters in one short block and confirm
with the user:

```
Trip: <relationship> | <dates> | <budget> | <purpose>
Destination: <city>
```

## 3. Generate the Plan

Produce the plan in the structure below. Use Markdown headings. Keep timings
realistic (don't over-pack a day). Match every recommendation to the
relationship and purpose — e.g. a couple's anniversary trip leans romantic;
a family trip avoids late-night venues and adds kid-friendly stops.

### Plan Structure

1. **Overview**
   - Destination, why it fits the relationship + purpose
   - Trip length, best base/neighborhood to stay in
   - Total estimated cost and how it maps to the budget

2. **Transportation**
   - Getting there: flight / train / driving — with rough cost and duration
   - Getting around at the destination: transit pass, rental car, rideshare
   - Airport/station to hotel transfer

3. **Accommodation**
   - 2–3 hotel options across price tiers that fit the budget
   - For each: name, neighborhood, price tier, why it suits this trip
   - Note any book-early properties

4. **Daily Itinerary** (one section per day)
   - Morning / Afternoon / Evening with realistic timing
   - 1 anchor sight or activity per half-day, plus a backup if time allows
   - Build in rest time — don't over-schedule

5. **Restaurants** (2–3 per day)
   - Name, cuisine, price tier, why it fits
   - Mix of local staples and one splurge meal if budget allows
   - Flag any that need reservations

6. **Places to Visit**
   - Sights/activities grouped by day, matched to the trip purpose
   - For family trips: note kid-friendly vs. adult-only
   - For couples: note romantic spots / sunset views

7. **Budget Breakdown**
   - Table: transport / accommodation / food / activities / buffer
   - Show total vs. the user's budget, flag if over

8. **Practical Notes**
   - Visa / ID requirements
   - Weather for the dates + packing notes
   - Reservations to book now (hotels, popular restaurants, must-book sights)
   - Local tips: tipping, SIM card, transit app, plugs

## 4. Tone & Style

- Warm, concrete, and useful — not generic.
- Give real neighborhood and venue names; avoid "a nice local restaurant."
- If you're unsure of an exact price, give a range and say so.
- Keep the plan skimmable: headers, bullet lists, short paragraphs.

## 5. Follow-ups

After the plan, offer:
- Adjust the budget split (e.g. more on food, less on hotel)
- Swap the destination for one of the earlier suggestions
- Produce a packing checklist
- Produce a "book now" reservation list with links
