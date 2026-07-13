const MIN_TRACKED_DAYS = 3

function average(nums) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

// Deterministic, goal-aware fallback used when the AI suggestion call is unavailable.
// Numbers-only: never names foods. days: [{ dateKey, totals, waterMl }], oldest -> newest.
export function generateSuggestions(days, targets) {
  if (!targets) return []

  const goal = targets.goal
  const suggestions = []
  const trackedDays = days.filter((d) => d.totals.caloriesIn > 0)

  if (trackedDays.length >= MIN_TRACKED_DAYS) {
    const avgProtein = average(trackedDays.map((d) => d.totals.protein))
    if (targets.targetProtein > 0 && avgProtein < targets.targetProtein * 0.85) {
      suggestions.push({
        type: 'protein_low',
        severity: 'info',
        message: `Protein has averaged ${Math.round(avgProtein)}g/day, ${Math.round(targets.targetProtein - avgProtein)}g short of your ${targets.targetProtein}g target.`,
      })
    }

    // Calorie adherence flag depends on the goal: a surplus hurts a cut, a shortfall hurts a bulk.
    if (goal === 'gain') {
      const underDays = trackedDays.filter((d) => d.totals.caloriesIn < targets.targetCalories)
      if (underDays.length / trackedDays.length >= 0.6) {
        suggestions.push({
          type: 'calories_short',
          severity: 'warning',
          message: `You ate below your calorie target ${underDays.length} of the last ${trackedDays.length} logged days. Hard to gain without a consistent surplus.`,
        })
      }
    } else {
      const overDays = trackedDays.filter((d) => d.totals.caloriesIn > targets.targetCalories)
      if (overDays.length / trackedDays.length >= 0.6) {
        suggestions.push({
          type: 'calories_over',
          severity: 'warning',
          message: `You've been over your calorie target ${overDays.length} of the last ${trackedDays.length} days you logged.`,
        })
      }
    }

    const avgFiber = average(trackedDays.map((d) => d.totals.fiber))
    if (targets.targetFiber > 0 && avgFiber < targets.targetFiber * 0.7) {
      suggestions.push({
        type: 'fiber_low',
        severity: 'info',
        message: `Fiber has averaged ${Math.round(avgFiber)}g/day, ${Math.round(targets.targetFiber - avgFiber)}g below your ${targets.targetFiber}g target.`,
      })
    }
  }

  if (days.length >= 7 && trackedDays.length > 0 && trackedDays.length < 5) {
    suggestions.push({
      type: 'log_consistency',
      severity: 'info',
      message: `You logged food on ${trackedDays.length} of the last 7 days. Your averages and pace projection get more accurate with every logged day.`,
    })
  }

  return suggestions
}
