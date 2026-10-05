import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { CommandPalette } from './components/CommandPalette'
import { AiDrawer } from './components/AiDrawer'
import { Toasts } from './components/Toasts'
import { useSync } from './stores/sync'
import { useProgress } from './stores/progress'
import { useFocus } from './stores/focus'
import Dashboard from './pages/Dashboard'
import Boards from './pages/Boards'
import BoardDetail from './pages/BoardDetail'
import Library from './pages/Library'
import FocusPage from './pages/FocusPage'
import Progress from './pages/Progress'
import Discover from './pages/Discover'
import Community from './pages/Community'
import Settings from './pages/Settings'
import { Button } from './components/ui'
import { OwlMark } from './components/icons'

export default function App() {
  const setOnline = useSync((s) => s.setOnline)
  const ensureQuests = useProgress((s) => s.ensureQuests)

  // connectivity listeners (offline-first behavior)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [setOnline])

  // quests: generate today's + keep fresh across midnight
  useEffect(() => {
    ensureQuests()
    const t = setInterval(ensureQuests, 60_000)
    return () => clearInterval(t)
  }, [ensureQuests])

  // global focus-timer heartbeat (deadline-based, so throttled tabs stay accurate)
  useEffect(() => {
    const t = setInterval(() => useFocus.getState().tick(), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/boards" element={<Boards />} />
          <Route path="/boards/:boardId" element={<BoardDetail />} />
          <Route path="/library" element={<Library />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/community" element={<Community />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="*"
            element={
              <div className="grid place-items-center py-24 text-center">
                <OwlMark className="w-14 h-14 mb-4" />
                <div className="font-display font-semibold text-xl">This page flew away</div>
                <div className="text-sm text-ink3 mt-1 mb-5">The route you opened doesn't exist.</div>
                <Button onClick={() => (window.location.href = '/')}>Back to dashboard</Button>
              </div>
            }
          />
        </Routes>
      </AppLayout>
      <CommandPalette />
      <AiDrawer />
      <Toasts />
    </BrowserRouter>
  )
}
