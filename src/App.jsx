import { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Onboarding from './components/onboarding/Onboarding'
import TodayScreen from './components/today/TodayScreen'
import WeeklyScreen from './components/weekly/WeeklyScreen'
import BmiCalculator from './components/bmi/BmiCalculator'
import ProfileScreen from './components/profile/ProfileScreen'
import NavBar from './components/shared/NavBar'
import { hasProfile } from './lib/storage'

function RequireProfile({ children }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!hasProfile()) navigate('/onboarding', { replace: true })
  }, [navigate])

  if (!hasProfile()) return null
  return children
}

export default function App() {
  const location = useLocation()
  const showNav = location.pathname !== '/onboarding'

  return (
    <>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/"
          element={
            <RequireProfile>
              <TodayScreen />
            </RequireProfile>
          }
        />
        <Route
          path="/weekly"
          element={
            <RequireProfile>
              <WeeklyScreen />
            </RequireProfile>
          }
        />
        <Route path="/bmi" element={<BmiCalculator />} />
        <Route
          path="/profile"
          element={
            <RequireProfile>
              <ProfileScreen />
            </RequireProfile>
          }
        />
      </Routes>
      {showNav && <NavBar />}
    </>
  )
}
