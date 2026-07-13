import ProgressBar from '../shared/ProgressBar'
import { card } from '../../lib/ui'

const RADIUS = 62
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function SummaryCard({ totals, targets }) {
  const target = targets.targetCalories
  const eaten = totals.caloriesIn
  const diff = target - eaten
  const isUnder = diff >= 0
  const amount = Math.round(Math.abs(diff))

  // Goal-aware: a deficit is good when losing, bad when gaining; maintain wants to land near target.
  const goal = targets.goal
  const onPlan = goal === 'lose' ? isUnder : goal === 'gain' ? !isUnder : Math.abs(diff) <= 50

  // Language matches the goal: a bulk counts up to a goal, a cut guards a budget.
  const statusText =
    goal === 'gain'
      ? isUnder
        ? `${amount} cal to go`
        : `Goal hit, ${amount} cal past target`
      : goal === 'maintain' && onPlan
        ? `On target, ${amount} cal ${isUnder ? 'under' : 'over'}`
        : `${amount} cal ${isUnder ? 'under' : 'over'} target`

  const pillClass = onPlan
    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
    : goal === 'maintain'
      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      : 'bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300'

  const ringClass = onPlan
    ? 'stroke-brand-500'
    : goal === 'maintain'
      ? 'stroke-amber-500'
      : 'stroke-red-500'

  const pct = target > 0 ? Math.min(1, eaten / target) : 0

  return (
    <div className={`${card} p-5`}>
      <div className="flex flex-col items-center">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
            <circle
              cx="72"
              cy="72"
              r={RADIUS}
              fill="none"
              strokeWidth="9"
              className="stroke-slate-100 dark:stroke-slate-800"
            />
            <circle
              cx="72"
              cy="72"
              r={RADIUS}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${pct * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              className={`${ringClass} transition-all duration-700 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[40px] leading-none font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
              {Math.round(eaten)}
            </span>
            <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500 mt-1.5">
              of {Math.round(target)} cal
            </span>
          </div>
        </div>

        <div className={`mt-2 px-4 py-1.5 rounded-full text-[13px] font-semibold ${pillClass}`}>{statusText}</div>
      </div>

      <div className="flex flex-col gap-3.5 mt-6">
        <ProgressBar label="Protein" value={totals.protein} target={targets.targetProtein} unit="g" colorClass="bg-rose-500" />
        <ProgressBar label="Carbs" value={totals.carbs} target={targets.targetCarbs} unit="g" colorClass="bg-amber-500" />
        <ProgressBar label="Fat" value={totals.fat} target={targets.targetFat} unit="g" colorClass="bg-violet-500" />
        <ProgressBar label="Fiber" value={totals.fiber} target={targets.targetFiber} unit="g" colorClass="bg-teal-500" />
      </div>
    </div>
  )
}
