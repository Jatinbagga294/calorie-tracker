import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import QuickAddFood from './QuickAddFood'
import RecentMeals from './RecentMeals'
import WaterTracker from './WaterTracker'
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
  addWater,
  setWater,
  getProfile,
  getRecentMeals,
} from '../../lib/storage'
import { todayKey, addDays, formatDisplayDate, last7DayKeys } from '../../lib/dateUtils'

const TOAST_TIMEOUT_MS = 8000

export default function TodayScreen() {
  const profile = getProfile()
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [viewMode, setViewMode] = useState('list')
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

  function handleRelog(meal) {
    const entry = addFoodEntry(selectedDate, {
      rawText: meal.rawText,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber,
    })
    refresh()
    showToast(entry)
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

  function handleAddWater(ml) {
    addWater(selectedDate, ml)
    refresh()
  }

  function handleSetWater(ml) {
    setWater(selectedDate, ml)
    refresh()
  }

  function handleSelectDate(key) {
    setSelectedDate(key)
    setViewMode('list')
  }

  const isToday = selectedDate === todayKey()

  const trailingDays = last7DayKeys().map((key) => {
    const day = getDailyLog(key)
    return { dateKey: key, totals: day.totals, waterMl: day.waterMl }
  })
  const recentMeals = getRecentMeals()

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 flex flex-col gap-5">
      {isToday && (
        <div className="flex flex-col gap-2">
          <QuickAddFood onLogged={handleFoodLogged} />
          <RecentMeals meals={recentMeals} onRelog={handleRelog} />
        </div>
      )}

      {toastEntry && (
        <LoggedToast entry={toastEntry} onEdit={handleEditFromToast} onDismiss={() => setToastEntry(null)} />
      )}

      {isToday && (
        <WaterTracker
          waterMl={log.waterMl}
          targetMl={profile.targetWaterMl}
          onAdd={handleAddWater}
          onSet={handleSetWater}
        />
      )}

      {isToday && <WeightCard onLogged={refresh} />}

      <SummaryCard totals={log.totals} targets={profile} />

      {isToday && (
        <>
          <InsightsCard totals={log.totals} waterMl={log.waterMl} profile={profile} trailingDays={trailingDays} />
          <AiSuggestionsCard totals={log.totals} waterMl={log.waterMl} profile={profile} trailingDays={trailingDays} />
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {viewMode === 'list' && (
            <>
              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, -1))}
                aria-label="Previous day"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 w-32 text-center">
                {isToday ? 'Today' : formatDisplayDate(selectedDate)}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                disabled={isToday}
                aria-label="Next day"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-30 flex items-center justify-center"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
          {viewMode === 'calendar' && <h2 className="font-semibold text-slate-800 dark:text-slate-100">Calendar</h2>}
        </div>

        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 dark:text-slate-400'}`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1 rounded-md ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <LogList log={log} onSelectEntry={(entry) => setEditing(entry)} />
      ) : (
        <CalendarView selectedDate={selectedDate} onSelectDate={handleSelectDate} />
      )}

      {editing && (
        <EditEntryModal entry={editing} onSave={handleSaveEdit} onDelete={handleDeleteEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
