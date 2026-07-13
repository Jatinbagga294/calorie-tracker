import { calculateAllTargets } from './calculations'

const KCAL_PER_KG_FAT = 7700
const MIN_DAYS_FOR_PACE = 3

// What's left to eat/drink today against the daily targets.
export function remainingToday({ totals, waterMl, profile }) {
  return {
    calories: Math.round(profile.targetCalories - totals.caloriesIn),
    protein: Math.round(profile.targetProtein - totals.protein),
    carbs: Math.round(profile.targetCarbs - totals.carbs),
    fat: Math.round(profile.targetFat - totals.fat),
    fiber: Math.round(profile.targetFiber - totals.fiber),
    waterMl: Math.round(profile.targetWaterMl - (waterMl || 0)),
  }
}

// Projects weight change per week from average intake vs estimated daily burn (TDEE).
// days: [{ totals, waterMl }], oldest first. Returns { ready: false } until enough days logged.
export function paceProjection(days, profile) {
  const tracked = days.filter((d) => d.totals.caloriesIn > 0)
  if (tracked.length < MIN_DAYS_FOR_PACE) {
    return { ready: false, daysNeeded: MIN_DAYS_FOR_PACE - tracked.length }
  }

  const tdee = calculateAllTargets(profile).tdee
  const avgIn = tracked.reduce((sum, d) => sum + d.totals.caloriesIn, 0) / tracked.length
  const dailyBalance = avgIn - tdee // negative = deficit
  const kgPerWeek = (dailyBalance * 7) / KCAL_PER_KG_FAT

  return { ready: true, kgPerWeek, trackedDays: tracked.length }
}

export function paceText(pace, goal) {
  if (!pace.ready) {
    return `Log ${pace.daysNeeded} more day${pace.daysNeeded > 1 ? 's' : ''} to unlock your projected pace.`
  }
  const kg = Math.abs(pace.kgPerWeek)
  const weekly = kg.toFixed(kg < 0.15 ? 2 : 1)
  const monthly = (kg * 4.345).toFixed(1)

  let trend
  if (pace.kgPerWeek < -0.05) trend = `losing ~${weekly} kg/week (~${monthly} kg/month)`
  else if (pace.kgPerWeek > 0.05) trend = `gaining ~${weekly} kg/week (~${monthly} kg/month)`
  else trend = 'holding steady'

  const aligned =
    (goal === 'lose' && pace.kgPerWeek < -0.05) ||
    (goal === 'gain' && pace.kgPerWeek > 0.05) ||
    (goal === 'maintain' && Math.abs(pace.kgPerWeek) <= 0.05)

  return `${pace.trackedDays}-day pace: ${trend} — ${aligned ? 'on track for your goal' : 'not matching your goal yet'}.`
}

// Quantified 7-day analytics over logged days only.
export function weeklyAnalytics(days, profile) {
  const tracked = days.filter((d) => d.totals.caloriesIn > 0)
  if (tracked.length === 0) return { trackedDays: 0 }

  const avg = (fn) => Math.round(tracked.reduce((sum, d) => sum + fn(d), 0) / tracked.length)
  const avgIn = avg((d) => d.totals.caloriesIn)

  return {
    trackedDays: tracked.length,
    avgIn,
    inVsTarget: avgIn - profile.targetCalories,
    proteinHitDays: tracked.filter((d) => d.totals.protein >= profile.targetProtein).length,
  }
}
