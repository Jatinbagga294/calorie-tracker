import { useState } from 'react'
import { Scale } from 'lucide-react'
import { getWeightEntries, logWeight } from '../../lib/storage'
import { todayKey, formatDisplayDate } from '../../lib/dateUtils'

export default function WeightCard({ onLogged }) {
  const [input, setInput] = useState('')
  const entries = getWeightEntries()
  const latest = entries[entries.length - 1]
  const previous = entries[entries.length - 2]
  const delta = latest && previous ? latest.kg - previous.kg : null

  function submit(e) {
    e.preventDefault()
    const kg = Number(input)
    if (!kg || kg <= 0) return
    logWeight(todayKey(), kg)
    setInput('')
    if (onLogged) onLogged()
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Scale size={16} className="text-slate-400" aria-hidden /> Weight
        </h3>
        {latest && (
          <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            {latest.kg} kg · {latest.dateKey === todayKey() ? 'today' : formatDisplayDate(latest.dateKey)}
            {delta !== null && Math.abs(delta) >= 0.05 && (
              <span className={delta < 0 ? 'text-brand-600 dark:text-brand-400' : 'text-amber-600 dark:text-amber-400'}>
                {' '}
                ({delta > 0 ? '+' : ''}
                {delta.toFixed(1)})
              </span>
            )}
          </span>
        )}
      </div>
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <input
          type="number"
          step="0.1"
          min="20"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Today's weight (kg)"
          className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!input}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium disabled:opacity-40"
        >
          Log
        </button>
      </form>
    </div>
  )
}
