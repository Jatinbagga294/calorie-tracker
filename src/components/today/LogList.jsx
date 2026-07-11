function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function LogList({ log, onSelectEntry }) {
  const entries = [
    ...log.foodEntries.map((e) => ({ ...e, __type: 'food' })),
    ...log.exerciseEntries.map((e) => ({ ...e, __type: 'exercise' })),
  ].sort((a, b) => b.timestamp - a.timestamp)

  if (entries.length === 0) {
    return (
      <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
        Nothing logged yet — use the boxes above to add food or exercise.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onSelectEntry(entry.__type, entry)}
            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left"
          >
            <span className="text-xl shrink-0" aria-hidden>
              {entry.__type === 'food' ? '🍽️' : '🏃'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-slate-50 truncate">{entry.rawText}</p>
              <p className="text-xs text-slate-400">{formatTime(entry.timestamp)}</p>
            </div>
            <span
              className={`shrink-0 font-semibold text-sm ${
                entry.__type === 'food' ? 'text-slate-700 dark:text-slate-200' : 'text-brand-600 dark:text-brand-400'
              }`}
            >
              {entry.__type === 'food' ? `${Math.round(entry.calories)} cal` : `-${Math.round(entry.caloriesBurned)} cal`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
