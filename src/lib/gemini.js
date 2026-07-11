const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-latest'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

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

const EXERCISE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          activityType: { type: 'string' },
          durationMin: { type: 'number' },
          caloriesBurned: { type: 'number' },
        },
        required: ['activityType', 'durationMin', 'caloriesBurned'],
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

const EXERCISE_SYSTEM_PROMPT = `You are an exercise calorie-estimation assistant. The user will describe
exercise/activity they did in plain English, possibly multiple activities in one sentence. Break
it into distinct activities and estimate calories burned for an average adult, using stated
duration when given (assume a moderate, typical duration if none is given, e.g. 30 min). Return
durationMin in minutes and caloriesBurned in kcal as best-estimate numbers.`

async function callGeminiJSON(systemPrompt, userText, schema) {
  if (!API_KEY) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file to enable AI parsing.')
  }

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini API error (${res.status}): ${body || res.statusText}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no content.')

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Gemini returned malformed JSON.')
  }
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

// Parses free-text exercise description into a single log entry aggregating all activities mentioned.
export async function parseExerciseText(rawText) {
  const { items } = await callGeminiJSON(EXERCISE_SYSTEM_PROMPT, rawText, EXERCISE_ITEM_SCHEMA)

  const caloriesBurned = Math.round(items.reduce((sum, i) => sum + (i.caloriesBurned || 0), 0))
  const durationMin = Math.round(items.reduce((sum, i) => sum + (i.durationMin || 0), 0))
  const activityType = items.map((i) => i.activityType).join(', ')

  return { rawText, caloriesBurned, activityType, durationMin, items }
}
