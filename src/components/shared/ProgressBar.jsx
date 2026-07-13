export default function ProgressBar({ label, value, target, unit = '', colorClass = 'bg-brand-500' }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const over = target > 0 && value > target

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="text-[13px] tabular-nums">
          <span className={over ? 'font-semibold text-amber-600 dark:text-amber-400' : 'font-semibold text-slate-700 dark:text-slate-200'}>
            {Math.round(value)}
            {unit}
          </span>
          <span className="text-slate-400 dark:text-slate-500">
            {' '}
            / {Math.round(target)}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-amber-500' : colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
