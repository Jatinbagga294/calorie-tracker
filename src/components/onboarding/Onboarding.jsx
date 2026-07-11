import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACTIVITY_LEVELS, GOALS, DEFAULT_RATE_KG_PER_WEEK, calculateAllTargets } from '../../lib/calculations'
import { setProfile } from '../../lib/storage'

const STEPS = ['age', 'sex', 'height', 'weight', 'activity', 'goal', 'rate', 'review']

function StepShell({ title, subtitle, children, onBack, onNext, nextDisabled, nextLabel = 'Next' }) {
  return (
    <div className="flex flex-col min-h-[100svh] max-w-lg mx-auto px-6 py-8">
      <div className="flex-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 mb-1">{title}</h1>
        {subtitle && <p className="text-slate-500 dark:text-slate-400 mb-6">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <div className="flex gap-3 pt-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1 px-5 py-3 rounded-xl font-medium text-white bg-brand-600 disabled:opacity-40 disabled:pointer-events-none"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500'

export default function Onboarding({ onComplete }) {
  const navigate = useNavigate()
  const [stepIdx, setStepIdx] = useState(0)
  const [form, setForm] = useState({
    age: '',
    sex: '',
    heightFeet: '',
    heightInches: '',
    weightKg: '',
    activityLevel: '',
    goal: '',
    rateOfChangeKgPerWeek: DEFAULT_RATE_KG_PER_WEEK,
  })
  const [targets, setTargets] = useState(null)

  const step = STEPS[stepIdx]

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  function goNext() {
    if (step === 'goal' && form.goal === 'maintain') {
      // rate of change is meaningless for "maintain" — skip straight to review
      const computed = calculateAllTargets({ ...form, rateOfChangeKgPerWeek: 0 })
      setTargets({
        targetCalories: computed.targetCalories,
        targetProtein: computed.protein,
        targetCarbs: computed.carbs,
        targetFat: computed.fat,
        targetFiber: computed.fiber,
      })
      setStepIdx(STEPS.indexOf('review'))
      return
    }
    if (step === 'rate') {
      const computed = calculateAllTargets(form)
      setTargets({
        targetCalories: computed.targetCalories,
        targetProtein: computed.protein,
        targetCarbs: computed.carbs,
        targetFat: computed.fat,
        targetFiber: computed.fiber,
      })
    }
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1))
  }

  function goBack() {
    setStepIdx((i) => Math.max(i - 1, 0))
  }

  function finish() {
    const profile = {
      ...form,
      age: Number(form.age),
      heightFeet: Number(form.heightFeet),
      heightInches: Number(form.heightInches),
      weightKg: Number(form.weightKg),
      rateOfChangeKgPerWeek: form.goal === 'maintain' ? 0 : Number(form.rateOfChangeKgPerWeek),
      ...targets,
      targetWaterMl: 2500,
    }
    setProfile(profile)
    if (onComplete) onComplete(profile)
    navigate('/', { replace: true })
  }

  if (step === 'age') {
    return (
      <StepShell
        title="How old are you?"
        subtitle="Used to estimate your calorie needs."
        onNext={goNext}
        nextDisabled={!form.age || form.age < 10 || form.age > 100}
      >
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          className={inputClass}
          placeholder="Age"
          value={form.age}
          onChange={(e) => set('age')(e.target.value)}
        />
      </StepShell>
    )
  }

  if (step === 'sex') {
    return (
      <StepShell
        title="Sex"
        subtitle="Used for the BMR calculation."
        onBack={goBack}
        onNext={goNext}
        nextDisabled={!form.sex}
      >
        <div className="grid grid-cols-2 gap-3">
          {['male', 'female'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set('sex')(s)}
              className={`py-4 rounded-xl border-2 font-medium capitalize ${
                form.sex === s
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </StepShell>
    )
  }

  if (step === 'height') {
    return (
      <StepShell
        title="Height"
        subtitle="Feet and inches."
        onBack={goBack}
        onNext={goNext}
        nextDisabled={form.heightFeet === '' || form.heightInches === ''}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Feet</label>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              placeholder="5"
              value={form.heightFeet}
              onChange={(e) => set('heightFeet')(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Inches</label>
            <input
              type="number"
              inputMode="numeric"
              className={inputClass}
              placeholder="8"
              value={form.heightInches}
              onChange={(e) => set('heightInches')(e.target.value)}
            />
          </div>
        </div>
      </StepShell>
    )
  }

  if (step === 'weight') {
    return (
      <StepShell
        title="Weight"
        subtitle="In kilograms."
        onBack={goBack}
        onNext={goNext}
        nextDisabled={!form.weightKg || form.weightKg <= 0}
      >
        <input
          type="number"
          inputMode="decimal"
          autoFocus
          className={inputClass}
          placeholder="Weight (kg)"
          value={form.weightKg}
          onChange={(e) => set('weightKg')(e.target.value)}
        />
      </StepShell>
    )
  }

  if (step === 'activity') {
    return (
      <StepShell
        title="Activity level"
        onBack={goBack}
        onNext={goNext}
        nextDisabled={!form.activityLevel}
      >
        <div className="flex flex-col gap-2">
          {ACTIVITY_LEVELS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => set('activityLevel')(a.value)}
              className={`text-left p-4 rounded-xl border-2 ${
                form.activityLevel === a.value
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="font-medium text-slate-800 dark:text-slate-100">{a.label}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{a.description}</div>
            </button>
          ))}
        </div>
      </StepShell>
    )
  }

  if (step === 'goal') {
    return (
      <StepShell title="Goal" onBack={goBack} onNext={goNext} nextDisabled={!form.goal}>
        <div className="flex flex-col gap-2">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => set('goal')(g.value)}
              className={`p-4 rounded-xl border-2 font-medium text-left ${
                form.goal === g.value
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </StepShell>
    )
  }

  if (step === 'rate') {
    const verb = form.goal === 'lose' ? 'lose' : 'gain'
    return (
      <StepShell
        title="Rate of change"
        subtitle={`Optional — how fast do you want to ${verb} weight? Defaults to a moderate ${DEFAULT_RATE_KG_PER_WEEK}kg/week.`}
        onBack={goBack}
        onNext={goNext}
      >
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="1.5"
            inputMode="decimal"
            className={inputClass}
            value={form.rateOfChangeKgPerWeek}
            onChange={(e) => set('rateOfChangeKgPerWeek')(e.target.value)}
          />
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">kg / week</span>
        </div>
      </StepShell>
    )
  }

  // review
  return <ReviewStep form={form} targets={targets} setTargets={setTargets} onBack={goBack} onFinish={finish} />
}

function ReviewStep({ form, targets, setTargets, onBack, onFinish }) {
  const calc = useMemo(() => calculateAllTargets(form), [form])

  const setTarget = (key) => (value) => setTargets((t) => ({ ...t, [key]: value === '' ? '' : Number(value) }))

  const fields = [
    { key: 'targetCalories', label: 'Calories', unit: 'kcal' },
    { key: 'targetProtein', label: 'Protein', unit: 'g' },
    { key: 'targetCarbs', label: 'Carbs', unit: 'g' },
    { key: 'targetFat', label: 'Fat', unit: 'g' },
    { key: 'targetFiber', label: 'Fiber', unit: 'g' },
  ]

  return (
    <StepShell
      title="Your daily targets"
      subtitle={`BMR ${calc.bmr} kcal · TDEE ${calc.tdee} kcal. Calculated from your info below — edit any value if you'd rather set your own.`}
      onBack={onBack}
      onNext={onFinish}
      nextDisabled={!targets || fields.some((f) => targets[f.key] === '' || targets[f.key] == null)}
      nextLabel="Get started"
    >
      <div className="flex flex-col gap-4">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <label className="text-slate-700 dark:text-slate-300 font-medium">{f.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                className={`${inputClass} w-28 text-right`}
                value={targets?.[f.key] ?? ''}
                onChange={(e) => setTarget(f.key)(e.target.value)}
              />
              <span className="text-slate-400 text-sm w-8">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </StepShell>
  )
}
