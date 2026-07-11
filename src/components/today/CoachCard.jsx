import { useState } from 'react'
import { Sparkles, RefreshCw, Loader2, TrendingDown, TrendingUp, MoveRight } from 'lucide-react'
import { remainingToday, paceProjection, paceText } from '../../lib/insights'
import { getCoachAdvice } from '../../lib/gemini'
import { todayKey } from '../../lib/dateUtils'

const CACHE_KEY = 'calorie_tracker_coach_advice'

function readCachedTips() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
    return cached?.date === todayKey() ? cached.tips : null
  } catch {
    return null
  }
}

function Chip({ label, value, over }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-center">
      <div
        className={`text-base font-semibold tabular-nums ${
          over ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}

export default function CoachCard({ totals, waterMl, profile, trailingDays }) {
  const [tips, setTips] = useState(readCachedTips)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const left = remainingToday({ totals, waterMl, profile })
  const pace = paceProjection(trailingDays, profile)
  const PaceIcon = !pace.ready ? MoveRight : pace.kgPerWeek < -0.05 ? TrendingDown : pace.kgPerWeek > 0.05 ? TrendingUp : MoveRight

  async function fetchTips() {
    setLoading(true)
    setError('')
    try {
      const context = {
        goal: profile.goal,
        targetRateKgPerWeek: profile.rateOfChangeKgPerWeek,
        dailyTargets: {
          calories: profile.targetCalories,
          protein: profile.targetProtein,
          carbs: profile.targetCarbs,
          fat: profile.targetFat,
          fiber: profile.targetFiber,
          waterMl: profile.targetWaterMl,
        },
        todaySoFar: {
          caloriesIn: totals.caloriesIn,
          caloriesBurned: totals.caloriesOut,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          waterMl: waterMl || 0,
        },
        remainingToday: left,
        localHour: new Date().getHours(),
        recentPaceKgPerWeek: pace.ready ? Number(pace.kgPerWeek.toFixed(2)) : null,
      }
      const result = await getCoachAdvice(context)
      setTips(result)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey(), tips: result }))
    } catch (err) {
      setError(err.message || 'Could not get advice right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Sparkles size={16} className="text-brand-600 dark:text-brand-400" aria-hidden /> Coach
        </h3>
        <button
          type="button"
          onClick={fetchTips}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <RefreshCw size={13} aria-hidden />}
          {tips ? 'Refresh' : 'Get advice'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Chip
          label={left.calories >= 0 ? 'cal left' : 'cal over'}
          value={Math.abs(left.calories)}
          over={left.calories < 0}
        />
        <Chip
          label={left.protein >= 0 ? 'g protein left' : 'g protein extra'}
          value={Math.abs(left.protein)}
          over={false}
        />
        <Chip
          label={left.waterMl >= 0 ? 'ml water left' : 'ml water extra'}
          value={Math.abs(left.waterMl)}
          over={false}
        />
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
        <PaceIcon size={15} className="shrink-0 mt-0.5 text-slate-400" aria-hidden />
        {paceText(pace, profile.goal)}
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}

      {tips && tips.length > 0 && (
        <ul className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm text-slate-700 dark:text-slate-200 flex gap-2">
              <span className="shrink-0 w-1 h-1 rounded-full bg-brand-500 mt-2" aria-hidden />
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
