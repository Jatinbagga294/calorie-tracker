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
          className="shrink-0 max-w-[220px] flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
        >
          <span className="truncate">{meal.rawText}</span>
          <span className="text-xs text-slate-400 tabular-nums shrink-0">{Math.round(meal.calories)}</span>
        </button>
      ))}
    </div>
  )
}
