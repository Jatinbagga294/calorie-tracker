import { useState } from 'react'
import { Scale } from 'lucide-react'
import { getWeightEntries, logWeight } from '../../lib/storage'
import { todayKey, formatDisplayDate } from '../../lib/dateUtils'
import { card, sectionLabel } from '../../lib/ui'

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
    <div className={`${card} p-4`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className={`${sectionLabel} flex items-center gap-1.5`}>
          <Scale size={13} aria-hidden /> Weight
        </h3>
        {latest && (
          <span className="text-[13px] text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{latest.kg} kg</span>
            {' · '}
            {latest.dateKey === todayKey() ? 'today' : formatDisplayDate(latest.dateKey)}
            {delta !== null && Math.abs(delta) >= 0.05 && (
              <span className="text-slate-400 dark:text-slate-500">
                {' '}
                ({delta > 0 ? '+' : ''}
                {delta.toFixed(1)})
              </span>
            )}
          </span>
        )}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          min="20"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Today's weight (kg)"
          className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={!input}
          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold disabled:opacity-30 transition-opacity"
        >
          Log
        </button>
      </form>
    </div>
  )
}
