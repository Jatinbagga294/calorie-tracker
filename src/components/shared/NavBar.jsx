import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Today', icon: '🍽️', end: true },
  { to: '/weekly', label: 'Weekly', icon: '📊' },
  { to: '/bmi', label: 'BMI', icon: '⚖️' },
  { to: '/profile', label: 'Profile', icon: '⚙️' },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)] z-20">
      <div className="max-w-lg mx-auto grid grid-cols-4">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
