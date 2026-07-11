import { calculateAllTargets } from './calculations'

const KCAL_PER_KG_FAT = 7700
const MIN_DAYS_FOR_PACE = 3

// What's left to eat/drink today. Calories account for exercise (target + burned = allowance).
export function remainingToday({ totals, waterMl, profile }) {
  const allowance = profile.targetCalories + totals.caloriesOut
  return {
    calories: Math.round(allowance - totals.caloriesIn),
    protein: Math.round(profile.targetProtein - totals.protein),
    carbs: Math.round(profile.targetCarbs - totals.carbs),
    fat: Math.round(profile.targetFat - totals.fat),
    fiber: Math.round(profile.targetFiber - totals.fiber),
    waterMl: Math.round(profile.targetWaterMl - (waterMl || 0)),
  }
}

// Projects weight change per week from the average energy balance of recent tracked days.
// days: [{ totals, waterMl }], oldest first. Returns null until enough days are logged.
export function paceProjection(days, profile) {
  const tracked = days.filter((d) => d.totals.caloriesIn > 0)
  if (tracked.length < MIN_DAYS_FOR_PACE) {
    return { ready: false, daysNeeded: MIN_DAYS_FOR_PACE - tracked.length }
  }

  const tdee = calculateAllTargets(profile).tdee
  const avgNet = tracked.reduce((sum, d) => sum + d.totals.caloriesNet, 0) / tracked.length
  const dailyBalance = avgNet - tdee // negative = deficit
  const kgPerWeek = (dailyBalance * 7) / KCAL_PER_KG_FAT

  return { ready: true, kgPerWeek, trackedDays: tracked.length }
}

export function paceText(pace, goal) {
  if (!pace.ready) {
    return `Log ${pace.daysNeeded} more day${pace.daysNeeded > 1 ? 's' : ''} to see your projected pace.`
  }
  const kg = Math.abs(pace.kgPerWeek)
  const rounded = kg.toFixed(kg < 0.15 ? 2 : 1)

  let trend
  if (pace.kgPerWeek < -0.05) trend = `losing ~${rounded} kg/week`
  else if (pace.kgPerWeek > 0.05) trend = `gaining ~${rounded} kg/week`
  else trend = 'holding steady'

  const aligned =
    (goal === 'lose' && pace.kgPerWeek < -0.05) ||
    (goal === 'gain' && pace.kgPerWeek > 0.05) ||
    (goal === 'maintain' && Math.abs(pace.kgPerWeek) <= 0.05)

  return `At your ${pace.trackedDays}-day pace you're ${trend} — ${aligned ? 'on track for your goal' : 'not matching your goal yet'}.`
}
