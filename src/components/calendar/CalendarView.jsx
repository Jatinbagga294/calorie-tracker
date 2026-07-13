import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dateKey, parseDateKey, formatMonthYear, todayKey } from '../../lib/dateUtils'
import { getAllDailyLogs } from '../../lib/storage'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CalendarView({ selectedDate, onSelectDate }) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = parseDateKey(selectedDate)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const loggedDays = new Set()
  for (const [key, day] of Object.entries(getAllDailyLogs())) {
    if (day.foodEntries?.length) loggedDays.add(key)
  }

  const today = todayKey()
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  function changeMonth(delta) {
    setMonthCursor(new Date(year, month + delta, 1))
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm shadow-slate-900/[0.03] dark:shadow-none p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="px-3 py-1 text-slate-500 dark:text-slate-400"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="font-medium text-slate-800 dark:text-slate-100">{formatMonthYear(dateKey(monthCursor))}</h3>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="px-3 py-1 text-slate-500 dark:text-slate-400"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const key = dateKey(new Date(year, month, d))
          const isToday = key === today
          const isSelected = key === selectedDate
          const hasData = loggedDays.has(key)

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(key)}
              className={`relative aspect-square rounded-lg text-sm flex items-center justify-center ${
                isSelected
                  ? 'bg-brand-600 text-white font-semibold'
                  : isToday
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {d}
              {hasData && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
