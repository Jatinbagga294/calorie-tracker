# Calorie Tracker PWA — Build Spec (v2)

## What it is
A public, installable web app (PWA) where a user logs food AND exercise in plain English
("2 rotis, dal, and a glass of milk" / "ran 30 min, lifted weights 45 min"), tracks daily and
weekly progress against a personal target, and gets simple suggestions. Fully anonymous,
per-device, works for any user (no hardcoded profile).

## Core stack
- **Frontend**: React + Vite
- **PWA**: `vite-plugin-pwa` (installable, offline-capable for viewing past logs)
- **Styling**: Tailwind CSS
- **AI parsing**: Google Gemini API (`gemini-1.5-flash`, free tier) — used for BOTH food
  parsing and exercise parsing
- **Storage**: Browser `localStorage` only. No backend, no login, no accounts.
- **Hosting**: Vercel or Netlify free tier, deployed from GitHub

## Security note (important)
API key goes in `.env` as `VITE_GEMINI_API_KEY`, added to `.gitignore` immediately, never
committed. Because this is frontend-only, the key is technically visible in the deployed
bundle — acceptable for v1/free-tier scale. Flag to revisit with a serverless proxy function
if the app gets real public traffic.

---

## Onboarding flow (first time opening the app)

Ask the user, in order:
1. Age
2. Sex (for BMR calculation)
3. Height — **imperial** (feet + inches, two separate inputs or a single "5 ft 8 in" style input)
4. Weight — **metric** (kg)
5. Activity level: sedentary / light / moderate / active / very active (with one-line
   descriptions of each so it's not jargon)
6. Goal: lose weight / maintain / gain weight
7. (Optional, skippable) Rate of change — e.g. "lose 0.5kg/week" — defaults to a sensible
   moderate rate if skipped

From this, auto-calculate and show:
- BMR (Mifflin-St Jeor formula — needs metric internally, so convert height ft/in → cm behind
  the scenes)
- TDEE (BMR × activity multiplier)
- Target daily calories (TDEE adjusted for goal)
- Target macros (protein/carbs/fat/fiber grams) using standard evidence-based ratios

**User can override any of these calculated numbers directly** — show them as editable fields,
not locked. Store both the calculated and (if edited) the user's final target.

This profile is editable later from a Settings/Profile screen at any time.

---

## Main / Today screen

Layout, top to bottom:
1. **Quick-add bar** — one text input: "What did you eat?" with a mic/keyboard icon, big and
   central. This is the primary action of the whole app.
2. **Second quick-add** — smaller, below it: "Log exercise" text input (plain English).
3. **Water tracker** — quick-add buttons (250ml / 500ml / 1L) AND a manual number entry option
   for odd amounts. Running total shown against a default daily water goal (editable, e.g. 2.5L).
4. **Today's summary card** — calories eaten, calories burned (from exercise), net calories,
   vs target, shown as progress bars for calories + each macro (protein/carbs/fat/fiber).
   Show plainly: "320 cal under target" or "150 cal over target" — not vague.
5. **Today's log list** — newest entry at top, each entry shows what was logged (food or
   exercise) and its calorie/macro or calorie-burned value. Tap any entry to edit or delete.
6. **List/Calendar toggle** — switch between the flat list view and a calendar view where
   tapping a date jumps to that day's log.

### Food logging behavior (critical UX requirement)
- User types food in plain English, hits enter/submit
- App sends text to Gemini, gets back structured JSON (calories, protein, carbs, fat, fiber
  per item)
- **Entry auto-saves immediately** — no confirmation step required, no extra tap. Speed is the
  priority.
- Immediately after saving, show the parsed breakdown briefly (e.g. as a toast/inline card:
  "Logged: 2 rotis, dal, milk — 480 cal, 18g protein...") with an **"Edit" button** right there
  if the user disagrees with the interpretation. Editing updates the saved entry, doesn't
  require re-logging.
- Net effect: zero-friction by default, correction always one tap away, never mandatory.

### Exercise logging behavior
- Same pattern as food: plain English in ("ran 30 min, lifted weights 45 min"), Gemini
  estimates calories burned per activity, auto-saves immediately, editable after the fact.
- Calories burned **adds back to the daily calorie allowance** (target + calories burned =
  adjusted allowance for that day), same logic as MyFitnessPal/mainstream fitness apps.
- Today's summary card should clearly separate "calories in" vs "calories out" vs "net" so
  this adjustment isn't confusing.

---

## Weekly view (separate screen/tab)

Shows, for the current week (rolling 7 days):
- **Estimated calories in** — total and daily average
- **Estimated calories out** (exercise) — total and daily average
- **Net calories** — total and daily average
- **Average macros** — protein/carbs/fat/fiber, daily average across the week
- **Goal comparison** — how much of the week's target was achieved vs missed, in plain terms
  (e.g. "You averaged 180 cal under target this week" or "you hit your protein goal 5 of 7 days")
- **Workout stats** — number of days exercised this week, total exercise time, total calories burned
- **Water average** — daily average intake vs goal

Format: **both** a summary of numbers (the stats above, clearly labeled) AND a line trend graph
showing daily calories (in/out/net) across the 7 days. Use a lightweight charting library
(e.g. `recharts`, works fine in Vite/React, no extra backend needed).

---

## BMI calculator
- Separate simple screen (or a card on the Profile screen)
- Input: height (imperial) + weight (metric) — reuse profile values if already set, allow
  override for a one-off check
- Output: BMI number + category (underweight/normal/overweight/obese), no extra commentary
  needed beyond the category label

---

## Suggestions (rule-based, NOT another AI call — keep free & instant)
Compare recent days (e.g. trailing 3–7 days) against targets:
- Protein consistently below target → suggest protein-rich foods (chicken, dal, eggs, paneer,
  greek yogurt — keep suggestions inclusive of South Asian staples, not just Western defaults)
- Calories consistently over target → flag it plainly
- Fiber consistently low → suggest vegetables/fruit/whole grains
- Water consistently under goal → simple reminder
- Keep suggestion logic in a small standalone module (easy to expand later without touching
  the AI layer)

---

## Data model (localStorage, JSON)

```
user_profile: {
  age, sex,
  heightFeet, heightInches,      // imperial input
  weightKg,                       // metric input
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active",
  goal: "lose" | "maintain" | "gain",
  rateOfChangeKgPerWeek,           // optional, has default
  targetCalories, targetProtein, targetCarbs, targetFat, targetFiber,   // editable/overridable
  targetWaterMl                    // default 2500, editable
}

daily_logs: {
  "2026-07-10": {
    foodEntries: [
      { id, rawText, timestamp, calories, protein, carbs, fat, fiber }
    ],
    exerciseEntries: [
      { id, rawText, timestamp, caloriesBurned, activityType, durationMin }
    ],
    waterMl: 1500,
    totals: {
      caloriesIn, caloriesOut, caloriesNet,
      protein, carbs, fat, fiber
    }
  },
  ...
}
```

---

## Build order for Claude Code
1. Scaffold Vite + React + Tailwind + `vite-plugin-pwa`
2. Build the localStorage data layer (profile get/set, daily log get/set/append/edit/delete) as
   a standalone utility module — test this in isolation before wiring UI to it
3. Build the Gemini API call functions: one for food parsing, one for exercise parsing (can
   share a base function with different prompts)
4. Build Onboarding flow → writes user_profile, calculates targets
5. Build Today screen: quick-add food, quick-add exercise, water tracker, summary card, log list
6. Build List/Calendar toggle for the log view
7. Build Weekly view with `recharts` trend graph
8. Build BMI calculator (can reuse profile screen)
9. Build rule-based suggestions module, surface on Today or Weekly screen
10. Add PWA manifest + icons, test "Add to Home Screen" on a real phone
11. Set up `.env` handling + `.gitignore`, confirm key isn't in git history before first push

## What you (Jatin) need to do
- Rotate the Gemini API key you exposed earlier (delete old, create new) if not already done
- Provide the new key to Claude Code locally (never paste it in chat) for the `.env` file
- Push to GitHub, connect to Vercel/Netlify for a public URL
- Test onboarding + logging on your actual phone before calling v1 done
