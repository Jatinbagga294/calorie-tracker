import { useState } from 'react'
import { parseExerciseText } from '../../lib/gemini'

export default function QuickAddExercise({ onLogged }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!text.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const parsed = await parseExerciseText(text.trim())
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
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500">
        <span className="text-lg" aria-hidden>
          🏃
        </span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Log exercise, e.g. ran 30 min, lifted weights 45 min"
          className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium disabled:opacity-40"
        >
          {loading ? '…' : 'Log'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 px-1">{error}</p>}
    </form>
  )
}
