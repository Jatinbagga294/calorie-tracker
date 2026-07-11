import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react'
import QuickAddFood from './QuickAddFood'
import QuickAddExercise from './QuickAddExercise'
import WaterTracker from './WaterTracker'
import SummaryCard from './SummaryCard'
import InsightsCard from './InsightsCard'
import LogList from './LogList'
import LoggedToast from './LoggedToast'
import EditEntryModal from './EditEntryModal'
import CalendarView from '../calendar/CalendarView'
import {
  getDailyLog,
  addFoodEntry,
  addExerciseEntry,
  updateFoodEntry,
  updateExerciseEntry,
  deleteFoodEntry,
  deleteExerciseEntry,
  addWater,
  setWater,
  getProfile,
} from '../../lib/storage'
import { todayKey, addDays, formatDisplayDate, last7DayKeys } from '../../lib/dateUtils'
import { generateSuggestions } from '../../lib/suggestions'

const TOAST_TIMEOUT_MS = 8000

export default function TodayScreen() {
  const profile = getProfile()
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [viewMode, setViewMode] = useState('list')
  const [, setRefreshTick] = useState(0)
  const [toast, setToast] = useState(null)
  const [editing, setEditing] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Recomputed directly (not memoized) so refreshTick/selectedDate changes always reflect the latest storage state.
  const log = getDailyLog(selectedDate)

  function refresh() {
    setRefreshTick((t) => t + 1)
  }

  function showToast(type, entry) {
    clearTimeout(toastTimer.current)
    setToast({ type, entry })
    toastTimer.current = setTimeout(() => setToast(null), TOAST_TIMEOUT_MS)
  }

  function handleFoodLogged(parsed) {
    const entry = addFoodEntry(selectedDate, parsed)
    refresh()
    showToast('food', entry)
  }

  function handleExerciseLogged(parsed) {
    const entry = addExerciseEntry(selectedDate, parsed)
    refresh()
    showToast('exercise', entry)
  }

  function handleEditFromToast() {
    setEditing({ type: toast.type, entry: toast.entry })
    clearTimeout(toastTimer.current)
    setToast(null)
  }

  function handleSaveEdit(updates) {
    if (editing.type === 'food') updateFoodEntry(selectedDate, editing.entry.id, updates)
    else updateExerciseEntry(selectedDate, editing.entry.id, updates)
    refresh()
    setEditing(null)
  }

  function handleDeleteEdit() {
    if (editing.type === 'food') deleteFoodEntry(selectedDate, editing.entry.id)
    else deleteExerciseEntry(selectedDate, editing.entry.id)
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
  const suggestions = generateSuggestions(trailingDays, profile)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 flex flex-col gap-5">
      {isToday && (
        <>
          <QuickAddFood onLogged={handleFoodLogged} />
          <QuickAddExercise onLogged={handleExerciseLogged} />
        </>
      )}

      {toast && <LoggedToast toast={toast} onEdit={handleEditFromToast} onDismiss={() => setToast(null)} />}

      {isToday && (
        <WaterTracker
          waterMl={log.waterMl}
          targetMl={profile.targetWaterMl}
          onAdd={handleAddWater}
          onSet={handleSetWater}
        />
      )}

      <SummaryCard totals={log.totals} targets={profile} />

      {isToday && (
        <InsightsCard totals={log.totals} waterMl={log.waterMl} profile={profile} trailingDays={trailingDays} />
      )}

      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-brand-50/60 dark:bg-brand-900/20 p-4 flex flex-col gap-2">
          <h3 className="font-medium text-brand-800 dark:text-brand-300 text-sm flex items-center gap-2">
            <Lightbulb size={15} aria-hidden /> Suggestions
          </h3>
          {suggestions.map((s) => (
            <p key={s.type} className="text-sm text-slate-700 dark:text-slate-300">
              {s.message}
            </p>
          ))}
        </div>
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
        <LogList log={log} onSelectEntry={(type, entry) => setEditing({ type, entry })} />
      ) : (
        <CalendarView selectedDate={selectedDate} onSelectDate={handleSelectDate} />
      )}

      {editing && (
        <EditEntryModal
          type={editing.type}
          entry={editing.entry}
          onSave={handleSaveEdit}
          onDelete={handleDeleteEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
