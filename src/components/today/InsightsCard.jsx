import { Gauge, Activity, Target, CheckCircle2, TrendingDown, TrendingUp, MoveRight } from 'lucide-react'
import { remainingToday, paceProjection, paceText, weeklyAnalytics } from '../../lib/insights'

function Chip({ label, value, over }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-center">
      <div
        className={`text-base font-semibold tabular-nums ${
          over ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}

function StatRow({ Icon, children }) {
  return (
    <li className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
      <Icon size={15} className="shrink-0 mt-0.5 text-slate-400" aria-hidden />
      <span>{children}</span>
    </li>
  )
}

export default function InsightsCard({ totals, waterMl, profile, trailingDays }) {
  const left = remainingToday({ totals, waterMl, profile })
  const pace = paceProjection(trailingDays, profile)
  const week = weeklyAnalytics(trailingDays, profile)

  const PaceIcon = !pace.ready
    ? MoveRight
    : pace.kgPerWeek < -0.05
      ? TrendingDown
      : pace.kgPerWeek > 0.05
        ? TrendingUp
        : MoveRight

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
        <Gauge size={16} className="text-brand-600 dark:text-brand-400" aria-hidden /> Insights
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Chip
          label={
            left.calories >= 0
              ? profile.goal === 'gain'
                ? 'cal to go'
                : 'cal left'
              : profile.goal === 'gain'
                ? 'cal past goal'
                : 'cal over'
          }
          value={Math.abs(left.calories)}
          over={left.calories < 0 && profile.goal !== 'gain'}
        />
        <Chip
          label={left.protein >= 0 ? 'g protein left' : 'g protein extra'}
          value={Math.abs(left.protein)}
          over={false}
        />
        <Chip
          label={left.waterMl >= 0 ? 'ml water left' : 'ml water extra'}
          value={Math.abs(left.waterMl)}
          over={false}
        />
      </div>

      <ul className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
        <StatRow Icon={PaceIcon}>{paceText(pace, profile.goal)}</StatRow>

        {week.trackedDays >= 3 && (
          <>
            <StatRow Icon={Activity}>
              7-day average: {week.avgIn} cal in · {week.avgOut} out · {week.avgNet} net
            </StatRow>
            <StatRow Icon={Target}>
              Net is {Math.abs(week.netVsTarget)} cal/day {week.netVsTarget > 0 ? 'above' : 'below'} your{' '}
              {profile.targetCalories} target
            </StatRow>
            <StatRow Icon={CheckCircle2}>
              Protein target hit {week.proteinHitDays} of {week.trackedDays} logged days
            </StatRow>
          </>
        )}
      </ul>
    </div>
  )
}
