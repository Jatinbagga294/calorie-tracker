import ProgressBar from '../shared/ProgressBar'
import { card } from '../../lib/ui'

// Segments cycle through caramel tones so adjacent entries stay distinguishable.
const SEGMENT_CLASSES = [
  'bg-brand-500 dark:bg-brand-500',
  'bg-brand-300 dark:bg-brand-700',
  'bg-brand-600 dark:bg-brand-400',
]

// The day ledger: each logged entry is one segment, sized by its calories,
// filling toward the target tick. The day reads as a strip of what you ate.
function DayLedger({ entries, target, eaten }) {
  const scale = Math.max(target, eaten) || 1
  const ordered = [...entries].sort((a, b) => a.timestamp - b.timestamp)
  const tickPct = (target / scale) * 100

  return (
    <div className="relative pt-1.5 pb-0.5" aria-hidden>
      <div className="h-2.5 rounded-full bg-slate-200/70 dark:bg-slate-800 flex gap-[3px] overflow-hidden">
        {ordered.map((entry, i) => (
          <div
            key={entry.id}
            className={`h-full ${SEGMENT_CLASSES[i % SEGMENT_CLASSES.length]} ${i === 0 ? 'rounded-l-full' : ''}`}
            style={{ width: `${(Math.max(entry.calories, 0) / scale) * 100}%` }}
            title={`${entry.rawText} · ${Math.round(entry.calories)} cal`}
          />
        ))}
      </div>
      {eaten > target && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 rounded-full"
          style={{ left: `${tickPct}%` }}
        />
      )}
    </div>
  )
}

export default function SummaryCard({ totals, targets, entries = [] }) {
  const target = targets.targetCalories
  const eaten = totals.caloriesIn
  const diff = target - eaten
  const isUnder = diff >= 0
  const amount = Math.round(Math.abs(diff))

  // Goal-aware: a deficit is good when losing, bad when gaining; maintain wants to land near target.
  const goal = targets.goal
  const offPlan = goal === 'lose' ? !isUnder : goal === 'gain' ? false : Math.abs(diff) > 50 && !isUnder

  const statusText =
    goal === 'gain'
      ? isUnder
        ? `${amount} cal to go`
        : `goal hit, ${amount} cal past target`
      : isUnder
        ? `${amount} cal left`
        : `${amount} cal over`

  return (
    <div className={`${card} px-5 pt-5 pb-4`}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex items-baseline gap-2 whitespace-nowrap">
          <span className="font-display text-[44px] leading-none font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
            {Math.round(eaten).toLocaleString()}
          </span>
          <span className="text-[14px] font-medium text-slate-400 dark:text-slate-500">
            of {Math.round(target).toLocaleString()} cal
          </span>
        </div>
        <span
          className={`shrink-0 text-[13px] font-semibold tabular-nums pb-1 ${
            offPlan ? 'text-red-500 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {statusText}
        </span>
      </div>

      <div className="mt-3">
        <DayLedger entries={entries} target={target} eaten={eaten} />
      </div>

      <div className="flex flex-col gap-3 mt-5">
        <ProgressBar label="Protein" value={totals.protein} target={targets.targetProtein} unit="g" colorClass="bg-macro-protein dark:bg-macro-protein-dark" />
        <ProgressBar label="Carbs" value={totals.carbs} target={targets.targetCarbs} unit="g" colorClass="bg-macro-carbs dark:bg-macro-carbs-dark" />
        <ProgressBar label="Fat" value={totals.fat} target={targets.targetFat} unit="g" colorClass="bg-macro-fat dark:bg-macro-fat-dark" />
        <ProgressBar label="Fiber" value={totals.fiber} target={targets.targetFiber} unit="g" colorClass="bg-macro-fiber dark:bg-macro-fiber-dark" />
      </div>
    </div>
  )
}
