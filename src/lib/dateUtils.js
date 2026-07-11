const pad = (n) => String(n).padStart(2, '0')

// Local-time YYYY-MM-DD key (never UTC — avoids day-boundary bugs for the user's timezone).
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey() {
  return dateKey(new Date())
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, delta) {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + delta)
  return dateKey(d)
}

export function formatDisplayDate(key) {
  const d = parseDateKey(key)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatMonthYear(key) {
  const d = parseDateKey(key)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

// Rolling 7-day window ending today, oldest first.
export function last7DayKeys() {
  const today = todayKey()
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
}

export function startOfCalendarMonth(key) {
  const d = parseDateKey(key)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function daysInMonth(key) {
  const d = parseDateKey(key)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}
