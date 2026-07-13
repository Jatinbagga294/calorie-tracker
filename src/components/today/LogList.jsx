import { Utensils } from 'lucide-react'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function LogList({ log, onSelectEntry, canLog = true }) {
  const entries = [...log.foodEntries].sort((a, b) => b.timestamp - a.timestamp)

  if (entries.length === 0) {
    return (
      <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
        {canLog ? 'Nothing logged yet. Type what you ate above.' : 'Nothing logged for this day.'}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onSelectEntry(entry)}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm shadow-slate-900/[0.03] dark:shadow-none px-4 py-3 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-brand-50 dark:bg-brand-900/25 text-brand-600 dark:text-brand-400">
              <Utensils size={15} aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900 dark:text-slate-50 truncate">{entry.rawText}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatTime(entry.timestamp)}</p>
            </div>
            <span className="shrink-0 font-bold text-sm tabular-nums text-slate-800 dark:text-slate-100">
              {Math.round(entry.calories)}
              <span className="font-normal text-slate-400 ml-1">cal</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
