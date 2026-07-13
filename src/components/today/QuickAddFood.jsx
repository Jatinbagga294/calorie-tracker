import { useState } from 'react'
import { Utensils, Loader2 } from 'lucide-react'
import { parseFoodText } from '../../lib/gemini'

export default function QuickAddFood({ onLogged, placeholder = 'What did you eat?' }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!text.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const parsed = await parseFoodText(text.trim())
      setText('')
      onLogged(parsed)
    } catch (err) {
      setError(err.message || 'Could not parse that. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 shadow-sm focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
        <Utensils size={18} className="shrink-0 text-slate-400" aria-hidden />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent outline-none text-base text-slate-900 dark:text-slate-50 placeholder:text-slate-400"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-40 transition-colors"
        >
          {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
          {loading ? 'Logging' : 'Log'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 px-1">{error}</p>}
    </form>
  )
}
