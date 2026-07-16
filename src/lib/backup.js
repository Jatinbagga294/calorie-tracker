// Backup and restore. Everything the app knows lives in localStorage under
// one prefix, so a backup is a single JSON file of those keys. Restoring
// replaces the app's data wholesale and re-runs migration, so an old backup
// opened by a newer app version still lands safely.

import { migrateStorage } from './storage.js'

const PREFIX = 'calorie_tracker'
const FILE_MARKER = 'calorie-tracker-backup'

function collectBackup() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PREFIX)) continue
    const raw = localStorage.getItem(key)
    try {
      data[key] = JSON.parse(raw)
    } catch {
      data[key] = raw
    }
  }
  return { app: FILE_MARKER, exportedAt: new Date().toISOString(), data }
}

export function downloadBackup() {
  const backup = collectBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `calorie-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// Parses and validates a chosen file. Returns the parsed backup plus a
// summary for the confirm step; throws a plain message on anything invalid.
export async function readBackupFile(file) {
  let parsed
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('That file is not a backup from this app.')
  }
  if (parsed?.app !== FILE_MARKER || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('That file is not a backup from this app.')
  }
  const days = Object.keys(parsed.data[`${PREFIX}_daily_logs`] || {}).length
  const weighIns = Object.keys(parsed.data[`${PREFIX}_weight_log`] || {}).length
  return { parsed, summary: { days, weighIns, exportedAt: parsed.exportedAt || null } }
}

// Replaces everything on this device with the backup's contents.
export function applyBackup(parsed) {
  const stale = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) stale.push(key)
  }
  stale.forEach((key) => localStorage.removeItem(key))

  for (const [key, value] of Object.entries(parsed.data)) {
    if (!key.startsWith(PREFIX)) continue
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  }
  migrateStorage()
}
