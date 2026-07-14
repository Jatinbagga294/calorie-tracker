import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { primaryButton, textInput } from '../../lib/ui'

// Confirm a database product before logging: adjust the amount, fill any gaps.
// One tap to accept the default portion; nothing is ever logged silently.
export default function ProductConfirmSheet({ product, onLog, onClose }) {
  const hasServing = product.servingGrams != null
  const [servings, setServings] = useState(1)
  const [grams, setGrams] = useState(100)
  // Gaps in database nutrition are asked, not logged as zeros.
  const [fills, setFills] = useState({})

  const activeGrams = hasServing ? product.servingGrams * servings : grams

  const scaled = useMemo(() => {
    const result = {}
    for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber']) {
      const per100 = product.per100g[key]
      result[key] = per100 === null ? null : (per100 * activeGrams) / 100
    }
    return result
  }, [product, activeGrams])

  const missing = Object.keys(scaled).filter((k) => scaled[k] === null)
  const canLog = missing.every((k) => fills[k] !== undefined && fills[k] !== '')

  function log() {
    const values = {}
    for (const [k, v] of Object.entries(scaled)) {
      values[k] = v === null ? Number(fills[k]) || 0 : v
    }
    const amountText = hasServing
      ? `${servings} serving${servings === 1 ? '' : 's'}`
      : `${Math.round(activeGrams)}g`
    onLog({
      rawText: `${product.name}${product.brand ? ` (${product.brand})` : ''}, ${amountText}`,
      calories: Math.round(values.calories),
      protein: Math.round(values.protein * 10) / 10,
      carbs: Math.round(values.carbs * 10) / 10,
      fat: Math.round(values.fat * 10) / 10,
      fiber: Math.round(values.fiber * 10) / 10,
    })
  }

  const macroLine = ['protein', 'carbs', 'fat']
    .filter((k) => scaled[k] !== null)
    .map((k) => `${Math.round(scaled[k])}g ${k}`)
    .join(' · ')

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85svh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{product.name}</h2>
        {product.brand && <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{product.brand}</p>}

        <div className="flex items-center justify-between mt-4">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {hasServing ? `Servings (${product.servingSizeText || `${product.servingGrams}g`})` : 'Amount (g)'}
          </span>
          {hasServing ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}
                aria-label="Less"
                className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {servings}
              </span>
              <button
                type="button"
                onClick={() => setServings((s) => s + 0.5)}
                aria-label="More"
                className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={grams}
              onChange={(e) => setGrams(Number(e.target.value) || 0)}
              className={`${textInput} !w-24 text-right`}
              aria-label="Amount in grams"
            />
          )}
        </div>

        <div className="mt-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 px-4 py-3">
          {scaled.calories !== null ? (
            <p className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {Math.round(scaled.calories)} cal
              {macroLine && <span className="font-normal text-slate-500 dark:text-slate-400"> · {macroLine}</span>}
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No calorie data for this product.</p>
          )}
        </div>

        {missing.length > 0 && (
          <div className="mt-4 flex flex-col gap-2.5">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The database is missing some values. Fill in what you know:
            </p>
            {missing.map((k) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <label className="text-sm capitalize text-slate-600 dark:text-slate-300">{k}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={fills[k] ?? ''}
                  onChange={(e) => setFills((f) => ({ ...f, [k]: e.target.value }))}
                  className={`${textInput} !w-24 text-right`}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
          >
            Cancel
          </button>
          <button type="button" onClick={log} disabled={!canLog} className={`flex-1 ${primaryButton}`}>
            Log it
          </button>
        </div>
      </div>
    </div>
  )
}
