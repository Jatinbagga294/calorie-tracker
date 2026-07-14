// Theme preference: 'light' | 'dark' | 'system'. index.html applies the saved
// value before first paint; this module keeps <html> and the meta tag in sync
// when the user changes it.

const THEME_KEY = 'calorie_tracker_theme'

export function getThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function isDarkActive() {
  const pref = getThemePreference()
  return pref === 'dark' || (pref === 'system' && systemPrefersDark())
}

export function applyTheme() {
  const dark = isDarkActive()
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#151412' : '#f4f4f1')
}

export function setThemePreference(pref) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, pref)
  } catch {
    // Quota or private mode; the toggle still works for this session.
  }
  applyTheme()
}

// Follow OS changes while in system mode.
export function watchSystemTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (getThemePreference() === 'system') applyTheme()
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
