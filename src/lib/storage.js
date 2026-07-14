import { todayKey } from './dateUtils.js'

const PROFILE_KEY = 'calorie_tracker_profile'
const LOGS_KEY = 'calorie_tracker_daily_logs'
const WEIGHT_KEY = 'calorie_tracker_weight_log'

const SCHEMA_VERSION_KEY = 'calorie_tracker_schema_version'
const SCHEMA_VERSION = 2

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    // Storage full: corrections are the only prunable data (learning signals,
    // not user logs). Drop them and retry before giving up.
    try {
      localStorage.removeItem('calorie_tracker_corrections')
      localStorage.setItem(key, JSON.stringify(value))
      return
    } catch {
      // fall through
    }
    throw new Error('Storage is full on this device. Delete some old log entries to keep saving.', { cause: err })
  }
}

// Runs once per app start. v2 adds the correction store (additive, nothing to
// rewrite) and stamps the version so future schema changes know where they
// start from. Old builds' exercise/water fields are normalized lazily below.
export function migrateStorage() {
  const current = readJSON(SCHEMA_VERSION_KEY, 1)
  if (current === SCHEMA_VERSION) return
  writeJSON(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
}

function emptyDay() {
  return {
    foodEntries: [],
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

// Older builds stored exerciseEntries, waterMl and burned-calorie totals;
// normalize so the rest of the app never sees them.
function normalizeDay(day) {
  if (!day) return emptyDay()
  const normalized = { foodEntries: day.foodEntries || [], totals: day.totals || {} }
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
