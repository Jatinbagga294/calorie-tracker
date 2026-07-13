const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Free-tier quotas are per model, so each entry is a separate daily bucket.
// Verified against this account 2026-07: 2.x models are 404/zero-quota, and
// gemini-flash-latest (= gemini-3.5-flash) is only 20 req/day free, so it's
// the last resort; flash-lite allows ~1000 req/day.
const MODEL_CHAIN = [
  ...(import.meta.env.VITE_GEMINI_MODEL ? [import.meta.env.VITE_GEMINI_MODEL] : []),
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
]

const endpoint = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

// Remember which models are exhausted (per page load) so we don't burn a
// round-trip on a known-dead bucket for every request.
const exhaustedModels = new Set()

const FOOD_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          calories: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
          fiber: { type: 'number' },
        },
        required: ['name', 'calories', 'protein', 'carbs', 'fat', 'fiber'],
      },
    },
  },
  required: ['items'],
}

const FOOD_SYSTEM_PROMPT = `You are a nutrition estimation assistant. The user will describe food they ate in
plain English, possibly with Indian/South Asian dishes (roti, dal, sabzi, paneer, etc.) alongside
Western foods. Break the description into distinct food items and estimate reasonable nutrition
values for realistic home-cooked or restaurant portions when exact quantities aren't given.
Return calories in kcal, and protein/carbs/fat/fiber in grams, as best-estimate numbers (not
strings, not ranges). If a quantity is given (e.g. "2 rotis"), scale accordingly.`

const SUGGESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['suggestions'],
}

const SUGGESTIONS_SYSTEM_PROMPT = `You are a data analyst inside a calorie-tracking app. You receive JSON with
the user's goal (lose/maintain/gain weight), target rate, body stats, daily targets, today's
intake and remaining amounts, 7-day averages, projected weight pace, and protein hit rate.

Return 2-4 suggestions. Hard rules:
- Every suggestion must be grounded in the user's own numbers (calories, grams, days, kg),
  nothing that would fit any random user.
- NEVER name or recommend specific foods, dishes, meals, or ingredients. Speak only in numbers
  and behaviors: amounts, timing, consistency, pace vs goal (e.g. "you need ~400 more cal/day
  to hit your surplus", "protein runs 38g short on logged days").
- Apply common sense for the goal. GAIN: focus on closing the surplus gap and protein per kg,
  never suggest eating less. LOSE: deficit adherence and keeping protein high. MAINTAIN:
  consistency and macro balance.
- No hydration reminders, no platitudes, no medical advice, no emojis.
- Each under 25 words.
- Style: plain, human sentences. Never use em dashes (use commas or periods). No exclamation
  marks, no "Great job", no "Keep it up", no chatbot filler. Read like a stats readout a
  fitness app would show, not like an assistant talking.`

const CHAT_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    foodToLog: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        fiber: { type: 'number' },
      },
      required: ['description', 'calories', 'protein', 'carbs', 'fat', 'fiber'],
    },
  },
  required: ['reply'],
}

function chatSystemPrompt(contextJson) {
  return `You are the assistant inside a personal calorie-tracking app. The user's live data (their
goal, daily targets, what they've logged today, remaining amounts, 7-day stats, projected pace,
recent weigh-ins) is: ${contextJson}

Rules:
- Answer using their actual numbers whenever relevant. Be concise (1-4 sentences), direct,
  friendly. No emojis, no medical advice.
- If the user states they ate or drank something, estimate its nutrition, set foodToLog
  (description = short name of what they ate, calories in kcal, macros in grams), and confirm
  in the reply with the calorie total. Only set foodToLog when they report eating, never for
  hypothetical questions like "can I afford a burger?".
- Do not volunteer food or meal recommendations. If the user explicitly asks what to eat, you
  may answer with specific suggestions sized to their remaining targets.
- If asked something unrelated to nutrition/fitness/their data, answer briefly and steer back.
- Style: write like a knowledgeable friend texting, not like an AI assistant. Never use em
  dashes (use commas or periods). No "As an AI", "I'm here to help", "Feel free to",
  "Great question", "Absolutely!", no emojis, no bullet lists unless asked, no
  over-enthusiasm. Plain and direct.`
}

async function callGeminiJSON(systemPrompt, contentsOrText, schema) {
  if (!API_KEY) {
    throw new Error('Setup incomplete: missing API key.')
  }

  const contents =
    typeof contentsOrText === 'string'
      ? [{ role: 'user', parts: [{ text: contentsOrText }] }]
      : contentsOrText

  const body = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  })

  let lastError = null
  for (const model of MODEL_CHAIN) {
    if (exhaustedModels.has(model)) continue

    const res = await fetch(`${endpoint(model)}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (res.status === 429 || res.status === 404) {
      // Out of quota (or model retired) — move on to the next bucket. Only a
      // daily-quota 429 disables the model for this session; a per-minute one
      // may succeed again soon.
      const errBody = await res.text().catch(() => '')
      if (res.status === 404 || errBody.includes('PerDay')) exhaustedModels.add(model)
      lastError = new Error(
        res.status === 429
          ? "Today's usage limit is reached. It resets overnight."
          : 'Service temporarily unavailable. Try again later.',
      )
      continue
    }

    if (!res.ok) {
      throw new Error('Something went wrong. Try again.')
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('No response. Try again.')

    try {
      return JSON.parse(text)
    } catch {
      throw new Error('Something went wrong. Try again.')
    }
  }

  throw lastError || new Error('Service unavailable. Try again later.')
}

function round1(n) {
  return Math.round(n * 10) / 10
}

// Parses free-text food description into a single log entry aggregating all items mentioned.
export async function parseFoodText(rawText) {
  const { items } = await callGeminiJSON(FOOD_SYSTEM_PROMPT, rawText, FOOD_ITEM_SCHEMA)

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0),
      fiber: acc.fiber + (item.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )

  return {
    rawText,
    calories: Math.round(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
    fiber: round1(totals.fiber),
    items,
  }
}

// Gets 2-4 personalized, goal-aware, numbers-only suggestions (no food recommendations).
export async function getSmartSuggestions(context) {
  const { suggestions } = await callGeminiJSON(
    SUGGESTIONS_SYSTEM_PROMPT,
    JSON.stringify(context),
    SUGGESTIONS_SCHEMA,
  )
  return suggestions.filter((s) => typeof s === 'string' && s.trim()).slice(0, 4)
}

// Chat turn with conversation memory. history: [{ role: 'user'|'model', text }].
// Returns { reply, foodToLog? }.
export async function chatWithCoach({ history, message, context }) {
  const contents = [
    ...history.slice(-16).map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ]
  return callGeminiJSON(chatSystemPrompt(JSON.stringify(context)), contents, CHAT_SCHEMA)
}
