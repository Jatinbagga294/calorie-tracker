import { Gauge, Activity, Target, CheckCircle2, TrendingDown, TrendingUp, MoveRight } from 'lucide-react'
import { remainingToday, paceProjection, paceText, weeklyAnalytics } from '../../lib/insights'
import { card, sectionLabel } from '../../lib/ui'

function Chip({ label, value, over }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5 text-center">
      <div
        className={`text-lg font-bold tabular-nums tracking-tight ${
          over ? 'text-red-500 dark:text-red-300' : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}

function StatRow({ Icon, children }) {
  return (
    <li className="text-[13px] text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
      <Icon size={15} className="shrink-0 mt-0.5 text-slate-400" aria-hidden />
      <span>{children}</span>
    </li>
  )
}

export default function InsightsCard({ totals, profile, trailingDays }) {
  const left = remainingToday({ totals, profile })
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
    <div className={`${card} p-4`}>
      <h3 className={`${sectionLabel} flex items-center gap-1.5 mb-3`}>
        <Gauge size={13} aria-hidden /> Insights
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-3">
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
      </div>

      <ul className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <StatRow Icon={PaceIcon}>{paceText(pace, profile.goal)}</StatRow>

        {week.trackedDays >= 3 && (
          <>
            <StatRow Icon={Activity}>7-day average intake: {week.avgIn} cal/day</StatRow>
            <StatRow Icon={Target}>
              {Math.abs(week.inVsTarget)} cal/day {week.inVsTarget > 0 ? 'above' : 'below'} your{' '}
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
