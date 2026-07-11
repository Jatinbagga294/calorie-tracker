# Calorie Tracker

A public, installable PWA for logging food and exercise in plain English, tracking daily/weekly
progress against a personal target. Anonymous, per-device, no backend — everything lives in
`localStorage`. See [calorie-tracker-spec.md](./calorie-tracker-spec.md) for the full spec.

## Stack

React + Vite, Tailwind CSS, `vite-plugin-pwa`, Google Gemini (`gemini-1.5-flash`) for food/exercise
parsing, `recharts` for the weekly trend graph.

## Setup

```bash
npm install
cp .env.example .env   # then fill in VITE_GEMINI_API_KEY
npm run dev
```

Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
`.env` is git-ignored — never commit your key.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build (also generates the PWA service worker)
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint
