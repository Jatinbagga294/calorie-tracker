import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import QuickAddFood from './QuickAddFood'
import RecentMeals from './RecentMeals'
import WeightCard from './WeightCard'
import SummaryCard from './SummaryCard'
import InsightsCard from './InsightsCard'
import AiSuggestionsCard from './AiSuggestionsCard'
import LogList from './LogList'
import LoggedToast from './LoggedToast'
import EditEntryModal from './EditEntryModal'
import CalendarView from '../calendar/CalendarView'
import {
  getDailyLog,
  addFoodEntry,
  updateFoodEntry,
  deleteFoodEntry,
  getProfile,
} from '../../lib/storage'
import { getRankedChips } from '../../lib/recents'
import { todayKey, addDays, formatDisplayDate, formatFullDate, last7DayKeys } from '../../lib/dateUtils'
import { sectionLabel, iconButton, pageTitle, pageSubtitle } from '../../lib/ui'

const TOAST_TIMEOUT_MS = 8000

export default function TodayScreen() {
  const profile = getProfile()
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [showCalendar, setShowCalendar] = useState(false)
  const [, setRefreshTick] = useState(0)
  const [toastEntry, setToastEntry] = useState(null)
  const [editing, setEditing] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Recomputed directly (not memoized) so refreshTick/selectedDate changes always reflect the latest storage state.
  const log = getDailyLog(selectedDate)

  function refresh() {
    setRefreshTick((t) => t + 1)
  }

  function showToast(entry) {
    clearTimeout(toastTimer.current)
    setToastEntry(entry)
    toastTimer.current = setTimeout(() => setToastEntry(null), TOAST_TIMEOUT_MS)
  }

  function handleFoodLogged(parsed) {
    const entry = addFoodEntry(selectedDate, parsed)
    refresh()
    showToast(entry)
  }

  // Chips pass one meal (single) or two (combo); photo logging passes each
  // plate item. Every meal becomes its own entry so history and pair
  // detection keep working.
  function handleRelog(meals) {
    let lastEntry = null
    for (const meal of meals) {
      lastEntry = addFoodEntry(selectedDate, {
        rawText: meal.rawText,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        ...(meal.grams != null ? { grams: meal.grams } : {}),
      })
    }
    refresh()
    if (lastEntry) showToast(lastEntry)
  }

  function handleEditFromToast() {
    setEditing(toastEntry)
    clearTimeout(toastTimer.current)
    setToastEntry(null)
  }

  function handleSaveEdit(updates) {
    updateFoodEntry(selectedDate, editing.id, updates)
    refresh()
    setEditing(null)
  }

  function handleDeleteEdit() {
    deleteFoodEntry(selectedDate, editing.id)
    refresh()
    setEditing(null)
  }

  function handleSelectDate(key) {
    setSelectedDate(key)
    setShowCalendar(false)
  }

  const isToday = selectedDate === todayKey()
  // YYYY-MM-DD keys compare correctly as strings.
  const isFuture = selectedDate > todayKey()

  const trailingDays = last7DayKeys().map((key) => {
    const day = getDailyLog(key)
    return { dateKey: key, totals: day.totals }
  })
  const recentChips = getRankedChips()

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className={pageTitle}>{isToday ? 'Today' : formatDisplayDate(selectedDate)}</h1>
          <p className={pageSubtitle}>{formatFullDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, -1))}
            aria-label="Previous day"
            className={iconButton}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            disabled={isToday}
            aria-label="Next day"
            className={iconButton}
          >
            <ChevronRight size={17} />
          </button>
          <button
            type="button"
            onClick={() => setShowCalendar((v) => !v)}
            aria-label="Open calendar"
            className={`${iconButton} ${showCalendar ? '!text-brand-600 dark:!text-brand-400 !border-brand-300 dark:!border-brand-800' : ''}`}
          >
            <CalendarDays size={16} />
          </button>
        </div>
      </header>

      {showCalendar && <CalendarView selectedDate={selectedDate} onSelectDate={handleSelectDate} />}

      {!isFuture && (
        <div className="flex flex-col gap-2">
          {!isToday && (
            <p className="text-[13px] font-medium text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/25 border border-brand-200/70 dark:border-brand-800/50 rounded-xl px-4 py-2.5">
              Adding food to {formatDisplayDate(selectedDate)}
            </p>
          )}
          <RecentMeals chips={recentChips} onRelog={handleRelog} />
          <QuickAddFood
            onLogged={handleFoodLogged}
            onLoggedMany={handleRelog}
            placeholder={isToday ? undefined : `What did you eat on ${formatDisplayDate(selectedDate)}?`}
          />
        </div>
      )}

      {toastEntry && (
        <LoggedToast entry={toastEntry} onEdit={handleEditFromToast} onDismiss={() => setToastEntry(null)} />
      )}

      <SummaryCard totals={log.totals} targets={profile} entries={log.foodEntries} />

      {isToday && <WeightCard onLogged={refresh} />}

      {isToday && (
        <>
          <InsightsCard totals={log.totals} profile={profile} trailingDays={trailingDays} />
          <AiSuggestionsCard totals={log.totals} profile={profile} trailingDays={trailingDays} />
        </>
      )}

      <div className="mt-1">
        <h2 className={`${sectionLabel} px-1 mb-2`}>{isToday ? "Today's log" : 'Log'}</h2>
        <LogList log={log} canLog={!isFuture} onSelectEntry={(entry) => setEditing(entry)} />
      </div>

      {editing && (
        <EditEntryModal entry={editing} onSave={handleSaveEdit} onDelete={handleDeleteEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
