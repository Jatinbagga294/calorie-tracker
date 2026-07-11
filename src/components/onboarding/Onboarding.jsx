import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACTIVITY_LEVELS, GOALS, DEFAULT_RATE_KG_PER_WEEK, calculateAllTargets } from '../../lib/calculations'
import { setProfile } from '../../lib/storage'

const STEPS = ['age', 'sex', 'height', 'weight', 'activity', 'goal', 'rate', 'review']

// Buttons sit directly under the content (not pinned to the screen bottom) so they stay
// visible on phones while the keyboard is open; the form wrapper lets the keyboard's
// Enter/Go key advance the step.
function StepShell({ stepIdx, title, subtitle, children, onBack, onNext, nextDisabled, nextLabel = 'Continue' }) {
  return (
    <div className="min-h-[100dvh] max-w-lg mx-auto px-6 py-10">
      <div className="flex items-center gap-1.5 mb-8" aria-label={`Step ${stepIdx + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${i <= stepIdx ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-1">{title}</h1>
      {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm">{subtitle}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!nextDisabled) onNext()
        }}
        className="mt-8"
      >
        {children}
        <div className="flex gap-3 mt-8">
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
            type="submit"
            disabled={nextDisabled}
            className="flex-1 px-5 py-3 rounded-xl font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            {nextLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'

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

  function computeTargets(rateOverride) {
    const computed = calculateAllTargets({ ...form, rateOfChangeKgPerWeek: rateOverride ?? form.rateOfChangeKgPerWeek })
    setTargets({
      targetCalories: computed.targetCalories,
      targetProtein: computed.protein,
      targetCarbs: computed.carbs,
      targetFat: computed.fat,
      targetFiber: computed.fiber,
    })
  }

  function goNext() {
    if (step === 'goal' && form.goal === 'maintain') {
      // rate of change is meaningless for "maintain" — skip straight to review
      computeTargets(0)
      setStepIdx(STEPS.indexOf('review'))
      return
    }
    if (step === 'rate') computeTargets()
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
        stepIdx={stepIdx}
        title="How old are you?"
        subtitle="Used to estimate your calorie needs."
        onNext={goNext}
        nextDisabled={!form.age || form.age < 10 || form.age > 100}
      >
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          enterKeyHint="next"
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
        stepIdx={stepIdx}
        title="Sex"
        subtitle="Used for the metabolic rate calculation."
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
              className={`py-4 rounded-xl border font-medium capitalize transition-colors ${
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
        stepIdx={stepIdx}
        title="Height"
        subtitle="Feet and inches."
        onBack={goBack}
        onNext={goNext}
        nextDisabled={form.heightFeet === '' || form.heightInches === ''}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Feet</label>
            <input
              type="number"
              inputMode="numeric"
              enterKeyHint="next"
              className={inputClass}
              placeholder="5"
              value={form.heightFeet}
              onChange={(e) => set('heightFeet')(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1.5">Inches</label>
            <input
              type="number"
              inputMode="numeric"
              enterKeyHint="next"
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
        stepIdx={stepIdx}
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
          enterKeyHint="next"
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
        stepIdx={stepIdx}
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
              className={`text-left p-4 rounded-xl border transition-colors ${
                form.activityLevel === a.value
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{a.label}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{a.description}</div>
            </button>
          ))}
        </div>
      </StepShell>
    )
  }

  if (step === 'goal') {
    return (
      <StepShell stepIdx={stepIdx} title="Goal" onBack={goBack} onNext={goNext} nextDisabled={!form.goal}>
        <div className="flex flex-col gap-2">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => set('goal')(g.value)}
              className={`p-4 rounded-xl border font-medium text-sm text-left transition-colors ${
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
        stepIdx={stepIdx}
        title="Rate of change"
        subtitle={`How fast do you want to ${verb} weight? ${DEFAULT_RATE_KG_PER_WEEK} kg/week is a sustainable default.`}
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
            enterKeyHint="next"
            className={inputClass}
            value={form.rateOfChangeKgPerWeek}
            onChange={(e) => set('rateOfChangeKgPerWeek')(e.target.value)}
          />
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">kg / week</span>
        </div>
      </StepShell>
    )
  }

  // review
  return (
    <ReviewStep
      stepIdx={stepIdx}
      form={form}
      targets={targets}
      setTargets={setTargets}
      onBack={goBack}
      onFinish={finish}
    />
  )
}

function ReviewStep({ stepIdx, form, targets, setTargets, onBack, onFinish }) {
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
      stepIdx={stepIdx}
      title="Your daily targets"
      subtitle={`Based on a BMR of ${calc.bmr} kcal and a TDEE of ${calc.tdee} kcal. Adjust any value if you'd rather set your own.`}
      onBack={onBack}
      onNext={onFinish}
      nextDisabled={!targets || fields.some((f) => targets[f.key] === '' || targets[f.key] == null)}
      nextLabel="Get started"
    >
      <div className="flex flex-col gap-3">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{f.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                className={`${inputClass} w-28 text-right !text-base !py-2.5`}
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
