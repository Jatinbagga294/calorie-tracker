export default function ProgressBar({ label, value, target, unit = '', colorClass = 'bg-brand-500' }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  const over = target > 0 && value > target

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className={over ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}>
          {Math.round(value)}
          {unit} / {Math.round(target)}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
