import TrendChart from './TrendChart'
import { getDailyLog, getProfile } from '../../lib/storage'
import { last7DayKeys, parseDateKey } from '../../lib/dateUtils'

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
    out: Math.round(d.totals.caloriesOut),
    net: Math.round(d.totals.caloriesNet),
  }))

  const trackedDays = days.filter((d) => d.totals.caloriesIn > 0)
  const n = days.length

  const sum = (fn) => days.reduce((acc, d) => acc + fn(d), 0)
  const avg = (fn) => Math.round(sum(fn) / n)

  const totalIn = sum((d) => d.totals.caloriesIn)
  const totalOut = sum((d) => d.totals.caloriesOut)
  const totalNet = sum((d) => d.totals.caloriesNet)

  const avgProtein = avg((d) => d.totals.protein)
  const avgCarbs = avg((d) => d.totals.carbs)
  const avgFat = avg((d) => d.totals.fat)
  const avgFiber = avg((d) => d.totals.fiber)
  const avgWater = avg((d) => d.waterMl || 0)

  const netVsTarget = Math.round(avg((d) => d.totals.caloriesNet) - profile.targetCalories)
  const proteinHitDays = days.filter((d) => d.totals.protein >= profile.targetProtein).length

  const exerciseDays = days.filter((d) => d.exerciseEntries.length > 0).length
  const totalExerciseMin = sum((d) => d.exerciseEntries.reduce((s, e) => s + (e.durationMin || 0), 0))

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">This week</h1>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Calories</h2>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="In (avg)" value={avg((d) => d.totals.caloriesIn)} sub={`${totalIn} total`} />
          <StatTile label="Out (avg)" value={avg((d) => d.totals.caloriesOut)} sub={`${totalOut} total`} />
          <StatTile label="Net (avg)" value={avg((d) => d.totals.caloriesNet)} sub={`${totalNet} total`} />
        </div>
        <p className="text-sm text-center mt-3 text-slate-600 dark:text-slate-300">
          {netVsTarget <= 0
            ? `You averaged ${Math.abs(netVsTarget)} cal under target this week`
            : `You averaged ${netVsTarget} cal over target this week`}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Daily trend</h2>
        <TrendChart data={chartData} />
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
        <h2 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Workouts</h2>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Days exercised" value={`${exerciseDays}/${n}`} />
          <StatTile label="Total time" value={`${totalExerciseMin}m`} />
          <StatTile label="Cal burned" value={totalOut} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h2 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Water</h2>
        <StatTile label="Daily average" value={`${(avgWater / 1000).toFixed(1)}L`} sub={`goal ${(profile.targetWaterMl / 1000).toFixed(1)}L`} />
      </section>

      {trackedDays.length === 0 && (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500">
          Log some food this week to see your trends here.
        </p>
      )}
    </div>
  )
}
