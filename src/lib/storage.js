import { todayKey } from './dateUtils.js'

const PROFILE_KEY = 'calorie_tracker_profile'
const LOGS_KEY = 'calorie_tracker_daily_logs'

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
    exerciseEntries: [],
    waterMl: 0,
    totals: { caloriesIn: 0, caloriesOut: 0, caloriesNet: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  }
}

function recalcTotals(day) {
  const caloriesIn = day.foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0)
  const caloriesOut = day.exerciseEntries.reduce((sum, e) => sum + (e.caloriesBurned || 0), 0)
  const protein = day.foodEntries.reduce((sum, e) => sum + (e.protein || 0), 0)
  const carbs = day.foodEntries.reduce((sum, e) => sum + (e.carbs || 0), 0)
  const fat = day.foodEntries.reduce((sum, e) => sum + (e.fat || 0), 0)
  const fiber = day.foodEntries.reduce((sum, e) => sum + (e.fiber || 0), 0)

  day.totals = { caloriesIn, caloriesOut, caloriesNet: caloriesIn - caloriesOut, protein, carbs, fat, fiber }
  return day
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
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
  return logs[dateKeyStr] || emptyDay()
}

export function getLogsInRange(startKey, endKey) {
  const logs = getAllDailyLogs()
  const result = {}
  for (const key of Object.keys(logs)) {
    if (key >= startKey && key <= endKey) result[key] = logs[key]
  }
  return result
}

function updateDay(dateKeyStr, mutator) {
  const logs = getAllDailyLogs()
  const day = logs[dateKeyStr] || emptyDay()
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

export function addExerciseEntry(dateKeyStr, entry) {
  const record = { id: makeId(), timestamp: Date.now(), ...entry }
  updateDay(dateKeyStr, (day) => day.exerciseEntries.push(record))
  return record
}

export function updateExerciseEntry(dateKeyStr, id, updates) {
  updateDay(dateKeyStr, (day) => {
    const idx = day.exerciseEntries.findIndex((e) => e.id === id)
    if (idx !== -1) day.exerciseEntries[idx] = { ...day.exerciseEntries[idx], ...updates }
  })
}

export function deleteExerciseEntry(dateKeyStr, id) {
  updateDay(dateKeyStr, (day) => {
    day.exerciseEntries = day.exerciseEntries.filter((e) => e.id !== id)
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
