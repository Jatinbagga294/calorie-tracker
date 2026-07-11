import ProgressBar from '../shared/ProgressBar'

export default function SummaryCard({ totals, targets }) {
  const adjustedAllowance = targets.targetCalories + totals.caloriesOut
  const diff = adjustedAllowance - totals.caloriesIn
  const isUnder = diff >= 0
  // Within 50 cal of the allowance counts as landing on target
  const onTarget = Math.abs(diff) <= 50
  const statusText = onTarget
    ? `On target — ${Math.round(Math.abs(diff))} cal ${isUnder ? 'under' : 'over'}`
    : isUnder
      ? `${Math.round(Math.abs(diff))} cal under target`
      : `${Math.round(Math.abs(diff))} cal over target`

  const statusClass = onTarget
    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
    : isUnder
      ? 'bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300'
      : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{Math.round(totals.caloriesIn)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Eaten</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{Math.round(totals.caloriesOut)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Burned</div>
        </div>
        <div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{Math.round(totals.caloriesNet)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Net</div>
        </div>
      </div>

      <div className={`text-center rounded-xl py-2 mb-4 font-medium text-sm ${statusClass}`}>
        {statusText}
        <span className="block text-xs font-normal opacity-80 mt-0.5">
          {Math.round(targets.targetCalories)} target + {Math.round(totals.caloriesOut)} burned = {Math.round(adjustedAllowance)} allowance
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <ProgressBar label="Calories" value={totals.caloriesIn} target={adjustedAllowance} unit="" />
        <ProgressBar label="Protein" value={totals.protein} target={targets.targetProtein} unit="g" colorClass="bg-rose-500" />
        <ProgressBar label="Carbs" value={totals.carbs} target={targets.targetCarbs} unit="g" colorClass="bg-amber-500" />
        <ProgressBar label="Fat" value={totals.fat} target={targets.targetFat} unit="g" colorClass="bg-violet-500" />
        <ProgressBar label="Fiber" value={totals.fiber} target={targets.targetFiber} unit="g" colorClass="bg-teal-500" />
      </div>
    </div>
  )
}
