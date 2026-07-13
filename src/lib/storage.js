import { todayKey, addDays } from './dateUtils.js'

const PROFILE_KEY = 'calorie_tracker_profile'
const LOGS_KEY = 'calorie_tracker_daily_logs'
const WEIGHT_KEY = 'calorie_tracker_weight_log'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function emptyDay() {
  return {
    foodEntries: [],
    waterMl: 0,
    totals: { caloriesIn: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  }
}

function recalcTotals(day) {
  const caloriesIn = day.foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0)
  const protein = day.foodEntries.reduce((sum, e) => sum + (e.protein || 0), 0)
  const carbs = day.foodEntries.reduce((sum, e) => sum + (e.carbs || 0), 0)
  const fat = day.foodEntries.reduce((sum, e) => sum + (e.fat || 0), 0)
  const fiber = day.foodEntries.reduce((sum, e) => sum + (e.fiber || 0), 0)

  day.totals = { caloriesIn, protein, carbs, fat, fiber }
  return day
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Older builds stored exerciseEntries and burned-calorie totals; normalize so the
// rest of the app never sees them.
function normalizeDay(day) {
  if (!day) return emptyDay()
  const normalized = { foodEntries: day.foodEntries || [], waterMl: day.waterMl || 0, totals: day.totals || {} }
  return recalcTotals(normalized)
}

// ---- Profile ----

export function getProfile() {
  return readJSON(PROFILE_KEY, null)
}

export function setProfile(profile) {
  writeJSON(PROFILE_KEY, profile)
  return profile
}

export function updateProfile(updates) {
  const current = getProfile() || {}
  const next = { ...current, ...updates }
  writeJSON(PROFILE_KEY, next)
  return next
}

export function hasProfile() {
  return getProfile() !== null
}

// ---- Daily logs ----

export function getAllDailyLogs() {
  return readJSON(LOGS_KEY, {})
}

function saveAllDailyLogs(logs) {
  writeJSON(LOGS_KEY, logs)
}

export function getDailyLog(dateKeyStr = todayKey()) {
  const logs = getAllDailyLogs()
  return normalizeDay(logs[dateKeyStr])
}

export function getLogsInRange(startKey, endKey) {
  const logs = getAllDailyLogs()
  const result = {}
  for (const key of Object.keys(logs)) {
    if (key >= startKey && key <= endKey) result[key] = normalizeDay(logs[key])
  }
  return result
}

function updateDay(dateKeyStr, mutator) {
  const logs = getAllDailyLogs()
  const day = normalizeDay(logs[dateKeyStr])
  mutator(day)
  recalcTotals(day)
  logs[dateKeyStr] = day
  saveAllDailyLogs(logs)
  return day
}

export function addFoodEntry(dateKeyStr, entry) {
  const record = { id: makeId(), timestamp: Date.now(), ...entry }
  updateDay(dateKeyStr, (day) => day.foodEntries.push(record))
  return record
}

export function updateFoodEntry(dateKeyStr, id, updates) {
  updateDay(dateKeyStr, (day) => {
    const idx = day.foodEntries.findIndex((e) => e.id === id)
    if (idx !== -1) day.foodEntries[idx] = { ...day.foodEntries[idx], ...updates }
  })
}

export function deleteFoodEntry(dateKeyStr, id) {
  updateDay(dateKeyStr, (day) => {
    day.foodEntries = day.foodEntries.filter((e) => e.id !== id)
  })
}

export function setWater(dateKeyStr, waterMl) {
  updateDay(dateKeyStr, (day) => {
    day.waterMl = Math.max(0, waterMl)
  })
}

export function addWater(dateKeyStr, deltaMl) {
  updateDay(dateKeyStr, (day) => {
    day.waterMl = Math.max(0, (day.waterMl || 0) + deltaMl)
  })
}

// ---- Weight log ----

export function getWeightLog() {
  return readJSON(WEIGHT_KEY, {})
}

export function logWeight(dateKeyStr, kg) {
  const log = getWeightLog()
  log[dateKeyStr] = kg
  writeJSON(WEIGHT_KEY, log)
  return log
}

// Sorted oldest -> newest as [{ dateKey, kg }]
export function getWeightEntries() {
  return Object.entries(getWeightLog())
    .map(([dateKey, kg]) => ({ dateKey, kg }))
    .sort((a, b) => (a.dateKey < b.dateKey ? -1 : 1))
}

// ---- Recent meals (for tap-to-relog) ----

// Most frequent/recent meals from the last `windowDays`, deduped by text.
export function getRecentMeals(limit = 6, windowDays = 14) {
  const logs = getAllDailyLogs()
  const cutoff = addDays(todayKey(), -windowDays)
  const byText = new Map()

  for (const [key, day] of Object.entries(logs)) {
    if (key < cutoff) continue
    for (const entry of day.foodEntries || []) {
      if (!entry.rawText) continue
      const norm = entry.rawText.trim().toLowerCase()
      const existing = byText.get(norm)
      if (existing) {
        existing.count += 1
        if (entry.timestamp > existing.timestamp) Object.assign(existing, { ...entry, count: existing.count })
      } else {
        byText.set(norm, { ...entry, count: 1 })
      }
    }
  }

  return [...byText.values()]
    .sort((a, b) => b.count - a.count || b.timestamp - a.timestamp)
    .slice(0, limit)
}
