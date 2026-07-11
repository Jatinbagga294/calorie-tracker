import { NavLink } from 'react-router-dom'
import { Home, BarChart3, Scale, Settings } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Today', Icon: Home, end: true },
  { to: '/weekly', label: 'Weekly', Icon: BarChart3 },
  { to: '/bmi', label: 'BMI', Icon: Scale },
  { to: '/profile', label: 'Profile', Icon: Settings },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)] z-20">
      <div className="max-w-lg mx-auto grid grid-cols-4">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium tracking-wide ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`
            }
          >
            <Icon size={20} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
