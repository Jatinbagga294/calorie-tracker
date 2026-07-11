export default function LoggedToast({ toast, onEdit, onDismiss }) {
  if (!toast) return null
  const { type, entry } = toast

  const summary =
    type === 'food'
      ? `${Math.round(entry.calories)} cal, ${Math.round(entry.protein)}g protein, ${Math.round(entry.carbs)}g carbs, ${Math.round(entry.fat)}g fat, ${Math.round(entry.fiber)}g fiber`
      : `${Math.round(entry.caloriesBurned)} cal burned · ${entry.durationMin} min`

  return (
    <div className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 p-4 flex items-start gap-3">
      <span className="text-xl" aria-hidden>
        {type === 'food' ? '✅' : '🔥'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-slate-50 truncate">Logged: {entry.rawText}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{summary}</p>
      </div>
      <div className="flex flex-col gap-1 items-end shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-brand-700 dark:text-brand-300 px-2 py-1"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-slate-400 px-2"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
