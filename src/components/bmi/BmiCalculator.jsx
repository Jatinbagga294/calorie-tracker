import { useState } from 'react'
import { getProfile } from '../../lib/storage'
import { calculateBMI, bmiCategory } from '../../lib/calculations'

const inputClass =
  'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500'

const CATEGORY_COLORS = {
  Underweight: 'text-sky-600 dark:text-sky-400',
  Normal: 'text-brand-600 dark:text-brand-400',
  Overweight: 'text-amber-600 dark:text-amber-400',
  Obese: 'text-red-600 dark:text-red-400',
}

export default function BmiCalculator() {
  const profile = getProfile()
  const [heightFeet, setHeightFeet] = useState(profile?.heightFeet ?? '')
  const [heightInches, setHeightInches] = useState(profile?.heightInches ?? '')
  const [weightKg, setWeightKg] = useState(profile?.weightKg ?? '')

  const valid = heightFeet !== '' && heightInches !== '' && weightKg > 0
  const bmi = valid ? calculateBMI({ weightKg: Number(weightKg), heightFeet: Number(heightFeet), heightInches: Number(heightInches) }) : null
  const category = bmi ? bmiCategory(bmi) : null

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">BMI Calculator</h1>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Height (ft)</label>
            <input type="number" inputMode="numeric" className={inputClass} value={heightFeet} onChange={(e) => setHeightFeet(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Height (in)</label>
            <input type="number" inputMode="numeric" className={inputClass} value={heightInches} onChange={(e) => setHeightInches(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Weight (kg)</label>
          <input type="number" inputMode="decimal" className={inputClass} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </div>
      </div>

      {bmi && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
          <div className="text-4xl font-bold text-slate-900 dark:text-slate-50">{bmi.toFixed(1)}</div>
          <div className={`mt-1 font-medium ${CATEGORY_COLORS[category]}`}>{category}</div>
        </div>
      )}
    </div>
  )
}
