const MIN_TRACKED_DAYS = 3

const PROTEIN_FOODS = ['chicken', 'dal', 'eggs', 'paneer', 'greek yogurt', 'tofu', 'lentils', 'fish']
const FIBER_FOODS = ['vegetables', 'fruit', 'whole grains', 'chickpeas', 'oats', 'beans']

function average(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

// days: array of { dateKey, totals: {caloriesIn, caloriesOut, caloriesNet, protein, carbs, fat, fiber}, waterMl }
// ordered oldest -> newest, typically the trailing 3-7 days.
export function generateSuggestions(days, targets) {
  if (!targets) return []

  const suggestions = []
  const trackedDays = days.filter((d) => d.totals.caloriesIn > 0)

  if (trackedDays.length >= MIN_TRACKED_DAYS) {
    const avgProtein = average(trackedDays.map((d) => d.totals.protein))
    if (targets.targetProtein > 0 && avgProtein < targets.targetProtein * 0.85) {
      suggestions.push({
        type: 'protein_low',
        severity: 'info',
        message: `Your protein has averaged ${Math.round(avgProtein)}g/day, below your ${targets.targetProtein}g target. Try adding ${PROTEIN_FOODS.slice(0, 4).join(', ')}.`,
      })
    }

    const overCalorieDays = trackedDays.filter((d) => d.totals.caloriesIn > targets.targetCalories + d.totals.caloriesOut)
    if (overCalorieDays.length / trackedDays.length >= 0.6) {
      suggestions.push({
        type: 'calories_over',
        severity: 'warning',
        message: `You've been over your calorie target ${overCalorieDays.length} of the last ${trackedDays.length} days you logged.`,
      })
    }

    const avgFiber = average(trackedDays.map((d) => d.totals.fiber))
    if (targets.targetFiber > 0 && avgFiber < targets.targetFiber * 0.7) {
      suggestions.push({
        type: 'fiber_low',
        severity: 'info',
        message: `Fiber has averaged ${Math.round(avgFiber)}g/day, below your ${targets.targetFiber}g target. Try more ${FIBER_FOODS.slice(0, 3).join(', ')}.`,
      })
    }
  }

  if (days.length >= MIN_TRACKED_DAYS && targets.targetWaterMl > 0) {
    const avgWater = average(days.map((d) => d.waterMl || 0))
    if (avgWater < targets.targetWaterMl * 0.8) {
      suggestions.push({
        type: 'water_low',
        severity: 'info',
        message: `You're averaging ${(avgWater / 1000).toFixed(1)}L of water a day, under your ${(targets.targetWaterMl / 1000).toFixed(1)}L goal. Keep a bottle nearby as a reminder.`,
      })
    }
  }

  return suggestions
}
