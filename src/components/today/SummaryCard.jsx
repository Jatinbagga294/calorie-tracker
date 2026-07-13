import ProgressBar from '../shared/ProgressBar'

export default function SummaryCard({ totals, targets }) {
  const diff = targets.targetCalories - totals.caloriesIn
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
        : `Goal hit — ${amount} cal past target`
      : goal === 'maintain' && onPlan
        ? `On target — ${amount} cal ${isUnder ? 'under' : 'over'}`
        : `${amount} cal ${isUnder ? 'under' : 'over'} target`

  const statusClass = onPlan
    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
    : goal === 'maintain'
      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      : 'bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300'

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="text-center mb-3">
        <span className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
          {Math.round(totals.caloriesIn)}
        </span>
        <span className="text-slate-400 dark:text-slate-500 text-lg font-medium">
          {' '}
          / {Math.round(targets.targetCalories)} cal
        </span>
      </div>

      <div className={`text-center rounded-xl py-2 mb-4 font-medium text-sm ${statusClass}`}>{statusText}</div>

      <div className="flex flex-col gap-3">
        <ProgressBar label="Calories" value={totals.caloriesIn} target={targets.targetCalories} unit="" />
        <ProgressBar label="Protein" value={totals.protein} target={targets.targetProtein} unit="g" colorClass="bg-rose-500" />
        <ProgressBar label="Carbs" value={totals.carbs} target={targets.targetCarbs} unit="g" colorClass="bg-amber-500" />
        <ProgressBar label="Fat" value={totals.fat} target={targets.targetFat} unit="g" colorClass="bg-violet-500" />
        <ProgressBar label="Fiber" value={totals.fiber} target={targets.targetFiber} unit="g" colorClass="bg-teal-500" />
      </div>
    </div>
  )
}
