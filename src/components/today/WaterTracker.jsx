import { useState } from 'react'
import { Droplets, Minus, Plus } from 'lucide-react'

const QUICK_AMOUNTS = [250, 500, 1000]

export default function WaterTracker({ waterMl, targetMl, onAdd, onSet }) {
  const [manual, setManual] = useState('')
  const pct = targetMl > 0 ? Math.min(100, Math.round((waterMl / targetMl) * 100)) : 0

  function applyManual(mode) {
    const amount = Number(manual)
    if (Number.isNaN(amount) || manual === '' || amount < 0) return
    if (mode === 'add') onAdd(amount)
    else onSet(amount)
    setManual('')
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Droplets size={16} className="text-sky-500" aria-hidden /> Water
        </h3>
        <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
          {(waterMl / 1000).toFixed(2)} / {(targetMl / 1000).toFixed(1)} L
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-3">
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onAdd(-250)}
          disabled={waterMl === 0}
          aria-label="Remove 250 ml"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => onAdd(ml)}
            className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-sm font-medium"
          >
            <Plus size={12} aria-hidden />
            {ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Custom ml"
          className="w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => applyManual('add')}
          disabled={manual === ''}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => applyManual('set')}
          disabled={manual === ''}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium disabled:opacity-40"
          title="Overwrite today's total with this amount"
        >
          Set total
        </button>
      </div>
    </div>
  )
}
