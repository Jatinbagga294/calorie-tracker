import { useMemo, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { primaryButton } from '../../lib/ui'

const MULTIPLIER_STEP = 0.25
const MIN_MULTIPLIER = 0.25

function multiplierLabel(m) {
  if (m === 1) return null
  return `× ${m}`
}

// Editable AI estimates from a photo. Household units the user can eyeball,
// one tap to accept everything, and every adjustment is a training signal
// that gets persisted by the caller.
export default function PhotoConfirmSheet({ items: initialItems, onLog, onClose }) {
  const [items, setItems] = useState(() => initialItems.map((item) => ({ ...item, multiplier: 1, removed: false })))

  const active = useMemo(() => items.filter((i) => !i.removed), [items])
  const totalCalories = active.reduce((sum, i) => sum + Math.round(i.calories * i.multiplier), 0)

  function bump(idx, delta) {
    setItems((list) =>
      list.map((item, i) =>
        i === idx ? { ...item, multiplier: Math.max(MIN_MULTIPLIER, item.multiplier + delta) } : item,
      ),
    )
  }

  function remove(idx) {
    setItems((list) => list.map((item, i) => (i === idx ? { ...item, removed: true } : item)))
  }

  function confirm() {
    onLog(
      active.map((item) => ({
        name: item.name,
        householdAmount: item.householdAmount,
        confidence: item.confidence,
        multiplier: item.multiplier,
        estimated: {
          grams: item.grams,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
        },
        final: {
          grams: Math.round(item.grams * item.multiplier),
          calories: Math.round(item.calories * item.multiplier),
          protein: Math.round(item.protein * item.multiplier * 10) / 10,
          carbs: Math.round(item.carbs * item.multiplier * 10) / 10,
          fat: Math.round(item.fat * item.multiplier * 10) / 10,
          fiber: Math.round(item.fiber * item.multiplier * 10) / 10,
        },
      })),
    )
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85svh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Here's what it looks like</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
          Adjust anything that's off, then log it.
        </p>

        <ul className="flex flex-col gap-2.5 mt-4">
          {items.map((item, idx) =>
            item.removed ? null : (
              <li
                key={idx}
                className={`rounded-xl border px-3.5 py-3 ${
                  item.confidence === 'low'
                    ? 'border-brand-400/70 dark:border-brand-600/70 bg-brand-50/50 dark:bg-brand-900/15'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                      about {item.householdAmount}
                      {multiplierLabel(item.multiplier) && (
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {' '}
                          {multiplierLabel(item.multiplier)}
                        </span>
                      )}
                      {item.confidence === 'low' && (
                        <span className="text-brand-700 dark:text-brand-300"> · not sure, check this</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    aria-label={`Remove ${item.name}`}
                    className="shrink-0 w-8 h-8 -mr-1 -mt-1 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-slate-500"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {Math.round(item.calories * item.multiplier)}
                    <span className="font-normal text-slate-400 dark:text-slate-500"> cal</span>
                  </span>
                  <div className="flex items-center gap-1.5" aria-label={`Adjust amount of ${item.name}`}>
                    <button
                      type="button"
                      onClick={() => bump(idx, -MULTIPLIER_STEP)}
                      aria-label="Less"
                      className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                    >
                      <Minus size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => bump(idx, MULTIPLIER_STEP)}
                      aria-label="More"
                      className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
          >
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={active.length === 0} className={`flex-1 ${primaryButton}`}>
            Log {active.length === 1 ? 'it' : `${active.length} items`} · {totalCalories} cal
          </button>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-center">
          Next time, include your hand or a fork in the shot for better portion estimates.
        </p>
      </div>
    </div>
  )
}
