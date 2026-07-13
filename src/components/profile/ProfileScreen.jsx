import { useState } from 'react'
import { getProfile, updateProfile } from '../../lib/storage'
import { ACTIVITY_LEVELS, GOALS, calculateAllTargets } from '../../lib/calculations'
import { card, sectionLabel } from '../../lib/ui'

const inputClass =
  'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500'
const selectClass = inputClass

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

export default function ProfileScreen() {
  const [form, setForm] = useState(() => getProfile())
  const [savedAt, setSavedAt] = useState(null)

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setSavedAt(null)
  }

  function save() {
    const numeric = {
      ...form,
      age: Number(form.age),
      heightFeet: Number(form.heightFeet),
      heightInches: Number(form.heightInches),
      weightKg: Number(form.weightKg),
      rateOfChangeKgPerWeek: Number(form.rateOfChangeKgPerWeek),
      targetCalories: Number(form.targetCalories),
      targetProtein: Number(form.targetProtein),
      targetCarbs: Number(form.targetCarbs),
      targetFat: Number(form.targetFat),
      targetFiber: Number(form.targetFiber),
    }
    updateProfile(numeric)
    setForm(numeric)
    setSavedAt(Date.now())
  }

  function recalculate() {
    const computed = calculateAllTargets(form)
    setForm((f) => ({
      ...f,
      targetCalories: computed.targetCalories,
      targetProtein: computed.protein,
      targetCarbs: computed.carbs,
      targetFat: computed.fat,
      targetFiber: computed.fiber,
    }))
    setSavedAt(null)
  }

  if (!form) return null

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28 flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Profile</h1>
        <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Your stats and daily targets</p>
      </header>

      <section className={`${card} p-4 flex flex-col gap-4`}>
        <h2 className={sectionLabel}>Personal info</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input type="number" className={inputClass} value={form.age} onChange={(e) => set('age', e.target.value)} />
          </Field>
          <Field label="Sex">
            <select className={selectClass} value={form.sex} onChange={(e) => set('sex', e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Height (ft)">
            <input type="number" className={inputClass} value={form.heightFeet} onChange={(e) => set('heightFeet', e.target.value)} />
          </Field>
          <Field label="Height (in)">
            <input type="number" className={inputClass} value={form.heightInches} onChange={(e) => set('heightInches', e.target.value)} />
          </Field>
          <Field label="Weight (kg)">
            <input type="number" className={inputClass} value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
          </Field>
          <Field label="Rate (kg/week)">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={form.rateOfChangeKgPerWeek}
              onChange={(e) => set('rateOfChangeKgPerWeek', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Activity level">
          <select className={selectClass} value={form.activityLevel} onChange={(e) => set('activityLevel', e.target.value)}>
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Goal">
          <select className={selectClass} value={form.goal} onChange={(e) => set('goal', e.target.value)}>
            {GOALS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className={`${card} p-4 flex flex-col gap-4`}>
        <div className="flex items-center justify-between">
          <h2 className={sectionLabel}>Daily targets</h2>
          <button type="button" onClick={recalculate} className="text-sm font-semibold text-brand-600 dark:text-brand-400">
            Recalculate
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories">
            <input type="number" className={inputClass} value={form.targetCalories} onChange={(e) => set('targetCalories', e.target.value)} />
          </Field>
          <Field label="Protein (g)">
            <input type="number" className={inputClass} value={form.targetProtein} onChange={(e) => set('targetProtein', e.target.value)} />
          </Field>
          <Field label="Carbs (g)">
            <input type="number" className={inputClass} value={form.targetCarbs} onChange={(e) => set('targetCarbs', e.target.value)} />
          </Field>
          <Field label="Fat (g)">
            <input type="number" className={inputClass} value={form.targetFat} onChange={(e) => set('targetFat', e.target.value)} />
          </Field>
          <Field label="Fiber (g)">
            <input type="number" className={inputClass} value={form.targetFiber} onChange={(e) => set('targetFiber', e.target.value)} />
          </Field>
        </div>
      </section>

      <button
        type="button"
        onClick={save}
        className="px-5 py-3.5 rounded-2xl font-semibold text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all"
      >
        Save changes
      </button>
      {savedAt && <p className="text-center text-sm text-brand-600 dark:text-brand-400">Saved.</p>}
    </div>
  )
}
