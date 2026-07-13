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
            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
              <Utensils size={15} aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-900 dark:text-slate-50 truncate">{entry.rawText}</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatTime(entry.timestamp)}</p>
            </div>
            <span className="shrink-0 font-semibold text-sm tabular-nums text-slate-700 dark:text-slate-200">
              {Math.round(entry.calories)}
              <span className="font-normal text-slate-400 ml-1">cal</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
