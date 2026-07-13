import TrendChart from './TrendChart'
import WeightChart from './WeightChart'
import { getDailyLog, getProfile, getWeightEntries } from '../../lib/storage'
import { last7DayKeys, parseDateKey, addDays, todayKey } from '../../lib/dateUtils'

function StatTile({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3 text-center">
      <div className="text-xl font-semibold text-slate-900 dark:text-slate-50">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</div>}
    </div>
  )
}

export default function WeeklyScreen() {
  const profile = getProfile()

  const days = last7DayKeys().map((key) => ({ dateKey: key, ...getDailyLog(key) }))
  const chartData = days.map((d) => ({
    label: parseDateKey(d.dateKey).toLocaleDateString(undefined, { weekday: 'short' }),
    in: Math.round(d.totals.caloriesIn),
  }))

  const trackedDays = days.filter((d) => d.totals.caloriesIn > 0)
  const n = days.length

  const sum = (fn) => days.reduce((acc, d) => acc + fn(d), 0)
  const avg = (fn) => Math.round(sum(fn) / n)

  const totalIn = sum((d) => d.totals.caloriesIn)
  const avgProtein = avg((d) => d.totals.protein)
  const avgCarbs = avg((d) => d.totals.carbs)
  const avgFat = avg((d) => d.totals.fat)
  const avgFiber = avg((d) => d.totals.fiber)
  const avgWater = avg((d) => d.waterMl || 0)

  const inVsTarget = Math.round(avg((d) => d.totals.caloriesIn) - profile.targetCalories)
  const proteinHitDays = days.filter((d) => d.totals.protein >= profile.targetProtein).length

  // Weight: last 30 days of weigh-ins
  const cutoff = addDays(todayKey(), -30)
  const weightEntries = getWeightEntries().filter((e) => e.dateKey >= cutoff)
  const weightData = weightEntries.map((e) => ({
    label: parseDateKey(e.dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    kg: e.kg,
  }))
  const weightDelta =
    weightEntries.length >= 2 ? weightEntries[weightEntries.length - 1].kg - weightEntries[0].kg : null

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">This week</h1>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Calories</h2>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Daily average" value={avg((d) => d.totals.caloriesIn)} sub={`${totalIn} total`} />
          <StatTile
            label="vs target"
            value={`${inVsTarget > 0 ? '+' : ''}${inVsTarget}`}
            sub={`target ${profile.targetCalories}`}
          />
        </div>
        <div className="mt-3">
          <TrendChart data={chartData} target={profile.targetCalories} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Weight</h2>
        {weightData.length >= 2 ? (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <StatTile label="Latest" value={`${weightEntries[weightEntries.length - 1].kg} kg`} />
              <StatTile
                label="Last 30 days"
                value={`${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`}
                sub={`${weightEntries.length} weigh-ins`}
              />
            </div>
            <WeightChart data={weightData} />
          </>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Log your weight on the Today screen at least twice to see your trend here.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Average macros</h2>
        <div className="grid grid-cols-4 gap-2">
          <StatTile label="Protein" value={`${avgProtein}g`} />
          <StatTile label="Carbs" value={`${avgCarbs}g`} />
          <StatTile label="Fat" value={`${avgFat}g`} />
          <StatTile label="Fiber" value={`${avgFiber}g`} />
        </div>
        <p className="text-sm text-center mt-3 text-slate-600 dark:text-slate-300">
          You hit your protein goal {proteinHitDays} of {n} days
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Water</h2>
        <StatTile
          label="Daily average"
          value={`${(avgWater / 1000).toFixed(1)}L`}
          sub={`goal ${(profile.targetWaterMl / 1000).toFixed(1)}L`}
        />
      </section>

      {trackedDays.length === 0 && (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500">
          Log some food this week to see your trends here.
        </p>
      )}
    </div>
  )
}
