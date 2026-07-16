import { useRef, useState } from 'react'
import { getProfile, updateProfile } from '../../lib/storage'
import { ACTIVITY_LEVELS, GOALS, calculateAllTargets } from '../../lib/calculations'
import { getThemePreference, setThemePreference } from '../../lib/theme'
import { downloadBackup, readBackupFile, applyBackup } from '../../lib/backup'
import { card, sectionLabel, pageTitle, pageSubtitle } from '../../lib/ui'

const THEME_OPTIONS = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function ThemeToggle() {
  const [pref, setPref] = useState(getThemePreference)

  function choose(value) {
    setThemePreference(value)
    setPref(value)
  }

  return (
    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => choose(opt.value)}
          aria-pressed={pref === opt.value}
          className={`min-h-11 rounded-lg text-sm font-medium transition-colors ${
            pref === opt.value
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm shadow-slate-900/[0.06] dark:shadow-none'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const dataButton =
  'min-h-11 px-4 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors'

// Download everything as one file; restore replaces this device's data after
// an explicit confirm that shows what the chosen file contains.
function BackupSection() {
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null) // { parsed, summary }
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function exportNow() {
    setError('')
    try {
      downloadBackup()
      setMessage('Backup saved to your downloads.')
    } catch {
      setError('Could not create the backup. Try again.')
    }
  }

  async function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setMessage('')
    try {
      setPending(await readBackupFile(file))
    } catch (err) {
      setError(err.message)
    }
  }

  function restore() {
    try {
      applyBackup(pending.parsed)
      window.location.reload()
    } catch {
      setPending(null)
      setError('Restore failed. Nothing was changed that a reload will not fix. Try the file again.')
    }
  }

  const exportedOn = pending?.summary.exportedAt ? new Date(pending.summary.exportedAt).toLocaleDateString() : null

  return (
    <section className={`${card} p-4 flex flex-col gap-3`}>
      <h2 className={sectionLabel}>Your data</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Everything is stored on this phone. Download a backup before clearing the app or switching phones, then
        restore it to pick up where you left off.
      </p>

      {!pending ? (
        <div className="flex gap-2">
          <button type="button" onClick={exportNow} className={`flex-1 ${dataButton}`}>
            Download backup
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={`flex-1 ${dataButton}`}>
            Restore backup
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={pickFile} className="hidden" aria-hidden tabIndex={-1} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {exportedOn ? `Backup from ${exportedOn}` : 'Backup file'} with {pending.summary.days}{' '}
            {pending.summary.days === 1 ? 'day' : 'days'} of food logs and {pending.summary.weighIns}{' '}
            {pending.summary.weighIns === 1 ? 'weigh-in' : 'weigh-ins'}. Restoring replaces everything currently on
            this phone.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPending(null)} className={`flex-1 ${dataButton}`}>
              Cancel
            </button>
            <button
              type="button"
              onClick={restore}
              className="flex-1 min-h-11 px-4 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
            >
              Restore
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {error && <p className="text-sm text-red-500 dark:text-red-300">{error}</p>}
    </section>
  )
}

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
        <h1 className={pageTitle}>Profile</h1>
        <p className={pageSubtitle}>Your stats and daily targets</p>
      </header>

      <section className={`${card} p-4 flex flex-col gap-3`}>
        <h2 className={sectionLabel}>Appearance</h2>
        <ThemeToggle />
      </section>

      <BackupSection />

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
