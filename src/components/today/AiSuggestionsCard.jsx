import { useEffect, useRef, useState } from 'react'
import { Lightbulb, RefreshCw, Loader2 } from 'lucide-react'
import { getSmartSuggestions } from '../../lib/gemini'
import { generateSuggestions } from '../../lib/suggestions'
import { remainingToday, paceProjection, weeklyAnalytics } from '../../lib/insights'
import { todayKey } from '../../lib/dateUtils'

const CACHE_KEY = 'calorie_tracker_ai_suggestions'

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
    return cached?.date === todayKey() ? cached.items : null
  } catch {
    return null
  }
}

export default function AiSuggestionsCard({ totals, waterMl, profile, trailingDays }) {
  const [items, setItems] = useState(readCache)
  const [loading, setLoading] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)
  const autoFetched = useRef(false)

  async function fetchSuggestions() {
    setLoading(true)
    try {
      const week = weeklyAnalytics(trailingDays, profile)
      const pace = paceProjection(trailingDays, profile)
      const context = {
        goal: profile.goal,
        targetRateKgPerWeek: profile.rateOfChangeKgPerWeek,
        bodyWeightKg: profile.weightKg,
        sex: profile.sex,
        age: profile.age,
        dailyTargets: {
          calories: profile.targetCalories,
          protein: profile.targetProtein,
          carbs: profile.targetCarbs,
          fat: profile.targetFat,
          fiber: profile.targetFiber,
        },
        todaySoFar: {
          caloriesIn: totals.caloriesIn,
          caloriesBurned: totals.caloriesOut,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
        },
        remainingToday: remainingToday({ totals, waterMl, profile }),
        localHour: new Date().getHours(),
        last7LoggedDays: week.trackedDays > 0 ? week : null,
        projectedPaceKgPerWeek: pace.ready ? Number(pace.kgPerWeek.toFixed(2)) : null,
        exerciseDaysLast7: trailingDays.filter((d) => d.totals.caloriesOut > 0).length,
      }
      const result = await getSmartSuggestions(context)
      setItems(result)
      setUsedFallback(false)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey(), items: result }))
    } catch {
      // Offline / no key / quota — fall back to the deterministic goal-aware rules
      const fallback = generateSuggestions(trailingDays, profile).map((s) => s.message)
      setItems(fallback)
      setUsedFallback(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-fetch once per day on first open; the Refresh button re-runs with current data.
    if (!autoFetched.current && !readCache()) {
      autoFetched.current = true
      fetchSuggestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasItems = items && items.length > 0

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Lightbulb size={16} className="text-brand-600 dark:text-brand-400" aria-hidden /> Suggestions
        </h3>
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={loading}
          aria-label="Refresh suggestions"
          className="flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <RefreshCw size={13} aria-hidden />}
          Refresh
        </button>
      </div>

      {loading && !hasItems && (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-2">Analyzing your data…</p>
      )}

      {!loading && !hasItems && (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-2">
          Log a meal and refresh to get suggestions based on your data.
        </p>
      )}

      {hasItems && (
        <ul className="flex flex-col gap-2 mt-2">
          {items.map((text, i) => (
            <li key={i} className="text-sm text-slate-700 dark:text-slate-200 flex gap-2">
              <span className="shrink-0 w-1 h-1 rounded-full bg-brand-500 mt-2" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      )}

      {usedFallback && hasItems && (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
          Basic suggestions — couldn't reach the AI service, tap Refresh to retry.
        </p>
      )}
    </div>
  )
}
