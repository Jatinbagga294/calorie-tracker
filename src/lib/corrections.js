// Correction store: every time the user adjusts an AI estimate before logging,
// the delta is saved. This is what makes photo logging get more accurate for
// this user over time: personalised portion anchors and per-food bias factors
// are fed back into future prompts.

const CORRECTIONS_KEY = 'calorie_tracker_corrections'
// Plenty for bias learning while staying far from localStorage quota.
const MAX_CORRECTIONS = 400

function normName(name) {
  return String(name || '').trim().toLowerCase()
}

export function getCorrections() {
  try {
    const raw = localStorage.getItem(CORRECTIONS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(list))
  } catch {
    // Quota hit: drop the oldest half and retry once; corrections are
    // learning data, never worth failing a log over.
    try {
      localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(list.slice(-Math.floor(MAX_CORRECTIONS / 2))))
    } catch {
      // Still failing; skip persisting this one.
    }
  }
}

// estimated/corrected: { grams?, calories, protein, carbs, fat, fiber }
export function recordCorrection({ food, source, estimated, corrected }) {
  const name = normName(food)
  if (!name) return
  const changed =
    Math.round(estimated.calories) !== Math.round(corrected.calories) ||
    (estimated.grams != null && corrected.grams != null && Math.round(estimated.grams) !== Math.round(corrected.grams))
  const list = getCorrections()
  list.push({
    timestamp: Date.now(),
    food: name,
    source,
    accepted: !changed,
    estimated,
    corrected,
  })
  save(list.slice(-MAX_CORRECTIONS))
}

// Personalised portion defaults: foods this user has corrected (or confirmed)
// enough times to know their real portion. Median beats mean against outliers.
export function getPortionDefaults(minSamples = 3) {
  const byFood = new Map()
  for (const c of getCorrections()) {
    if (c.corrected?.grams == null) continue
    if (!byFood.has(c.food)) byFood.set(c.food, [])
    byFood.get(c.food).push(c.corrected.grams)
  }
  const defaults = {}
  for (const [food, grams] of byFood) {
    if (grams.length < minSamples) continue
    const sorted = [...grams].sort((a, b) => a - b)
    defaults[food] = Math.round(sorted[Math.floor(sorted.length / 2)])
  }
  return defaults
}

// Systematic bias: per-food median ratio of corrected/estimated calories,
// from actual user edits only. 1.3 means "the model underestimates this by 30%".
export function getBiasFactors(minSamples = 3) {
  const byFood = new Map()
  for (const c of getCorrections()) {
    if (c.accepted) continue
    const est = c.estimated?.calories
    const cor = c.corrected?.calories
    if (!est || !cor || est <= 0) continue
    if (!byFood.has(c.food)) byFood.set(c.food, [])
    byFood.get(c.food).push(cor / est)
  }
  const factors = {}
  for (const [food, ratios] of byFood) {
    if (ratios.length < minSamples) continue
    const sorted = [...ratios].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    // Only meaningful, consistent biases; noise stays out of the prompt.
    if (median < 0.8 || median > 1.25) factors[food] = Math.round(median * 100) / 100
  }
  return factors
}
