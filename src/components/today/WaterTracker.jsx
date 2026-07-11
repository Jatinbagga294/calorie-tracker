import { useState } from 'react'

const QUICK_AMOUNTS = [250, 500, 1000]

export default function WaterTracker({ waterMl, targetMl, onAdd }) {
  const [manual, setManual] = useState('')
  const pct = targetMl > 0 ? Math.min(100, Math.round((waterMl / targetMl) * 100)) : 0

  function addManual(e) {
    e.preventDefault()
    const amount = Number(manual)
    if (!amount || amount <= 0) return
    onAdd(amount)
    setManual('')
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex justify-between items-baseline mb-2">
        <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
          <span aria-hidden>💧</span> Water
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {(waterMl / 1000).toFixed(2)}L / {(targetMl / 1000).toFixed(1)}L
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-3">
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => onAdd(ml)}
            className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-sm font-medium"
          >
            +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
          </button>
        ))}
        <form onSubmit={addManual} className="flex items-center gap-1.5 ml-auto">
          <input
            type="number"
            inputMode="numeric"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="ml"
            className="w-16 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-2 py-1.5 text-sm text-slate-900 dark:text-slate-50"
          />
          <button
            type="submit"
            disabled={!manual}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm disabled:opacity-40"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
