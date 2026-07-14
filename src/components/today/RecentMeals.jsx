// One-tap chips ranked by frequency + time of day. Combo chips relog a
// habitual pair (e.g. eggs + toast) in a single tap. No AI call either way.
export default function RecentMeals({ chips, onRelog }) {
  if (!chips || chips.length === 0) return null

  return (
    <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => {
        const calories = chip.meals.reduce((sum, m) => sum + (m.calories || 0), 0)
        return (
          <button
            key={chip.label.toLowerCase()}
            type="button"
            onClick={() => onRelog(chip.meals)}
            className="shrink-0 max-w-[240px] min-h-11 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm shadow-slate-900/[0.03] dark:shadow-none text-[13px] font-medium text-slate-700 dark:text-slate-200 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <span className="truncate">{chip.label}</span>
            <span className="text-xs text-slate-400 tabular-nums shrink-0">{Math.round(calories)}</span>
          </button>
        )
      })}
    </div>
  )
}
