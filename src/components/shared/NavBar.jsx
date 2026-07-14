import { NavLink } from 'react-router-dom'
import { Home, MessageCircle, BarChart3, Scale, Settings } from 'lucide-react'

const TABS = [
  { to: '/', label: 'Today', Icon: Home, end: true },
  { to: '/chat', label: 'Chat', Icon: MessageCircle },
  { to: '/weekly', label: 'Weekly', Icon: BarChart3 },
  { to: '/bmi', label: 'BMI', Icon: Scale },
  { to: '/profile', label: 'Profile', Icon: Settings },
]

export default function NavBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 border-t border-slate-200 dark:border-slate-800 bg-white/92 dark:bg-slate-950/92 backdrop-blur-md pb-[env(safe-area-inset-bottom)] z-20">
      <div className="max-w-lg mx-auto grid grid-cols-5 px-2 pt-1.5 pb-1">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="flex flex-col items-center gap-0.5 min-h-11 justify-center">
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                    isActive
                      ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Icon size={19} strokeWidth={2.1} />
                </span>
                <span
                  className={`text-[10.5px] font-medium tracking-wide ${
                    isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
