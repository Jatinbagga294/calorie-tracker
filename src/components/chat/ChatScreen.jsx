import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Trash2, CheckCircle2 } from 'lucide-react'
import { chatWithCoach } from '../../lib/gemini'
import { getProfile, getDailyLog, addFoodEntry, getWeightEntries } from '../../lib/storage'
import { remainingToday, paceProjection, weeklyAnalytics } from '../../lib/insights'
import { todayKey, last7DayKeys } from '../../lib/dateUtils'

const HISTORY_KEY = 'calorie_tracker_chat_history'
const MAX_STORED_MESSAGES = 100

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch {
    return []
  }
}

function saveHistory(messages) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)))
}

function buildContext() {
  const profile = getProfile()
  const log = getDailyLog(todayKey())
  const trailingDays = last7DayKeys().map((key) => {
    const day = getDailyLog(key)
    return { dateKey: key, totals: day.totals, waterMl: day.waterMl }
  })
  const pace = paceProjection(trailingDays, profile)
  const weighIns = getWeightEntries().slice(-3)

  return {
    goal: profile.goal,
    targetRateKgPerWeek: profile.rateOfChangeKgPerWeek,
    bodyWeightKg: profile.weightKg,
    sex: profile.sex,
    age: profile.age,
    dailyTargets: {
      calories: profile.targetCalories,
      protein: profile.targetProtein,
      carbs: profile.targetCarbs,
      fat: profile.targetFat,
      fiber: profile.targetFiber,
      waterMl: profile.targetWaterMl,
    },
    todaySoFar: { ...log.totals, waterMl: log.waterMl },
    remainingToday: remainingToday({ totals: log.totals, waterMl: log.waterMl, profile }),
    last7LoggedDays: weeklyAnalytics(trailingDays, profile),
    projectedPaceKgPerWeek: pace.ready ? Number(pace.kgPerWeek.toFixed(2)) : null,
    recentWeighInsKg: weighIns,
    localHour: new Date().getHours(),
    todayDate: todayKey(),
  }
}

export default function ChatScreen() {
  const [messages, setMessages] = useState(readHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const withUser = [...messages, { role: 'user', text, ts: Date.now() }]
    setMessages(withUser)
    saveHistory(withUser)
    setInput('')
    setError('')
    setLoading(true)

    try {
      const { reply, foodToLog } = await chatWithCoach({
        history: messages,
        message: text,
        context: buildContext(),
      })

      let logged = null
      if (foodToLog?.description && foodToLog.calories > 0) {
        logged = addFoodEntry(todayKey(), {
          rawText: foodToLog.description,
          calories: Math.round(foodToLog.calories),
          protein: foodToLog.protein,
          carbs: foodToLog.carbs,
          fat: foodToLog.fat,
          fiber: foodToLog.fiber,
        })
      }

      const withReply = [
        ...withUser,
        { role: 'model', text: reply, ts: Date.now(), loggedFood: logged ? logged.rawText : null },
      ]
      setMessages(withReply)
      saveHistory(withReply)
    } catch (err) {
      setError(err.message || 'Could not reach the AI service.')
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([])
    saveHistory([])
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[100dvh] pb-14">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Chat</h1>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            aria-label="Clear chat history"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <Trash2 size={16} />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-sm text-slate-400 dark:text-slate-500 text-center mt-10 flex flex-col gap-2">
            <p className="font-medium text-slate-500 dark:text-slate-400">Ask anything about your data.</p>
            <p>"How's my week going?"</p>
            <p>"Can I afford a big dinner today?"</p>
            <p>"I ate 2 rotis and dal" — logs it for you.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'
              }`}
            >
              {m.text}
              {m.loggedFood && (
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-700 dark:text-brand-300 font-medium">
                  <CheckCircle2 size={13} aria-hidden /> Logged: {m.loggedFood}
                </span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <Loader2 size={16} className="animate-spin text-slate-400" aria-hidden />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message"
          enterKeyHint="send"
          className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="shrink-0 w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
