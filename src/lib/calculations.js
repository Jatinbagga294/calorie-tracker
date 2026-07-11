export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise, desk job', multiplier: 1.2 },
  { value: 'light', label: 'Lightly active', description: 'Light exercise 1-3 days/week', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderately active', description: 'Moderate exercise 3-5 days/week', multiplier: 1.55 },
  { value: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week', multiplier: 1.725 },
  { value: 'very_active', label: 'Very active', description: 'Very hard exercise, physical job, or training twice a day', multiplier: 1.9 },
]

export const GOALS = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain weight' },
]

export const DEFAULT_RATE_KG_PER_WEEK = 0.5
const KCAL_PER_KG_FAT = 7700
const MIN_SAFE_CALORIES = 1200

export function feetInchesToCm(feet, inches) {
  return (Number(feet) * 12 + Number(inches)) * 2.54
}

export function cmToFeetInches(cm) {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - feet * 12)
  return { feet, inches }
}

export function activityMultiplier(activityLevel) {
  return ACTIVITY_LEVELS.find((a) => a.value === activityLevel)?.multiplier ?? 1.2
}

// Mifflin-St Jeor
export function calculateBMR({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calculateTDEE(bmr, activityLevel) {
  return bmr * activityMultiplier(activityLevel)
}

export function calculateTargetCalories({ tdee, goal, rateOfChangeKgPerWeek }) {
  const rate = rateOfChangeKgPerWeek ?? DEFAULT_RATE_KG_PER_WEEK
  const dailyAdjustment = (rate * KCAL_PER_KG_FAT) / 7

  let target = tdee
  if (goal === 'lose') target = tdee - dailyAdjustment
  if (goal === 'gain') target = tdee + dailyAdjustment

  return Math.max(Math.round(target), MIN_SAFE_CALORIES)
}

// Standard evidence-based split: ~1.8g protein/kg bodyweight, 25% of calories from fat,
// 14g fiber per 1000 kcal (IOM guideline), carbs fill the remainder.
export function calculateTargetMacros({ targetCalories, weightKg }) {
  const protein = Math.round(weightKg * 1.8)
  const proteinCal = protein * 4

  const fatCal = targetCalories * 0.25
  const fat = Math.round(fatCal / 9)

  const carbsCal = Math.max(targetCalories - proteinCal - fatCal, 0)
  const carbs = Math.round(carbsCal / 4)

  const fiber = Math.round((targetCalories / 1000) * 14)

  return { protein, carbs, fat, fiber }
}

export function calculateAllTargets(profile) {
  const heightCm = feetInchesToCm(profile.heightFeet, profile.heightInches)
  const bmr = calculateBMR({ sex: profile.sex, weightKg: profile.weightKg, heightCm, age: profile.age })
  const tdee = calculateTDEE(bmr, profile.activityLevel)
  const targetCalories = calculateTargetCalories({
    tdee,
    goal: profile.goal,
    rateOfChangeKgPerWeek: profile.rateOfChangeKgPerWeek,
  })
  const macros = calculateTargetMacros({ targetCalories, weightKg: profile.weightKg })

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), targetCalories, ...macros }
}

export function calculateBMI({ weightKg, heightFeet, heightInches }) {
  const heightM = feetInchesToCm(heightFeet, heightInches) / 100
  return weightKg / (heightM * heightM)
}

export function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}
