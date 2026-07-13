import { useState } from 'react'

const numInputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-50 tabular-nums focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'

const FOOD_FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
]

export default function EditEntryModal({ entry, onSave, onDelete, onClose }) {
  const [values, setValues] = useState({
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber,
  })

  function setField(key, value) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function save() {
    const updates = {}
    for (const [k, v] of Object.entries(values)) updates[k] = Number(v)
    onSave(updates)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85svh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1">Edit entry</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 italic">"{entry.rawText}"</p>

        <div className="flex flex-col gap-3">
          {FOOD_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <label className="text-slate-700 dark:text-slate-300">{f.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className={`${numInputClass} w-24 text-right`}
                  value={values[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
                <span className="text-slate-400 text-sm w-10">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2.5 rounded-xl font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
          >
            Cancel
          </button>
          <button type="button" onClick={save} className="flex-1 px-4 py-2.5 rounded-xl font-medium text-white bg-brand-600">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
