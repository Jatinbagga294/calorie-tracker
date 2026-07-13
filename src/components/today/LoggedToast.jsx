import { CheckCircle2, X } from 'lucide-react'

export default function LoggedToast({ entry, onEdit, onDismiss }) {
  if (!entry) return null

  const summary = `${Math.round(entry.calories)} cal · ${Math.round(entry.protein)}g protein · ${Math.round(entry.carbs)}g carbs · ${Math.round(entry.fat)}g fat · ${Math.round(entry.fiber)}g fiber`

  return (
    <div className="rounded-2xl border border-brand-200/80 dark:border-brand-800/60 bg-brand-50 dark:bg-brand-900/25 shadow-sm shadow-slate-900/[0.03] dark:shadow-none p-4 flex items-start gap-3">
      <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-brand-600 dark:text-brand-400" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-900 dark:text-slate-50 truncate">{entry.rawText}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{summary}</p>
        <button
          type="button"
          onClick={onEdit}
          className="mt-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 underline underline-offset-2"
        >
          Edit
        </button>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 p-1 text-slate-400">
        <X size={16} />
      </button>
    </div>
  )
}
