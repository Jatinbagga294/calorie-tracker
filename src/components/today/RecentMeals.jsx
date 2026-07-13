// One-tap chips for recently logged meals — relogs instantly with saved macros, no AI call.
export default function RecentMeals({ meals, onRelog }) {
  if (meals.length === 0) return null

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {meals.map((meal) => (
        <button
          key={meal.rawText.toLowerCase()}
          type="button"
          onClick={() => onRelog(meal)}
          className="shrink-0 max-w-[220px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm shadow-slate-900/[0.03] dark:shadow-none text-[13px] font-medium text-slate-700 dark:text-slate-200 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
        >
          <span className="truncate">{meal.rawText}</span>
          <span className="text-xs text-slate-400 tabular-nums shrink-0">{Math.round(meal.calories)}</span>
        </button>
      ))}
    </div>
  )
}
