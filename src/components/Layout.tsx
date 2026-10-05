import { useEffect } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Cloud, CloudOff, Compass, Flame, LayoutDashboard, Layers, LibraryBig,
  Menu, Moon, RefreshCw, Search, Settings, Sun, Timer, Trophy, Users, WifiOff, X,
} from 'lucide-react'
import { cn, timeAgo } from '../lib/utils'
import { useSettings } from '../stores/settings'
import { useSync } from '../stores/sync'
import { useProgress } from '../stores/progress'
import { useUi } from '../stores/ui'
import { useAuth } from '../stores/auth'
import { allDue, useLibrary } from '../stores/library'
import { OwlMark } from './icons'
import { Avatar } from './ui'

const NAV = [
  {
    section: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/boards', label: 'Study boards', icon: Layers },
      { to: '/library', label: 'Library', icon: LibraryBig },
      { to: '/focus', label: 'Focus mode', icon: Timer },
      { to: '/progress', label: 'Progress', icon: Trophy },
    ],
  },
  {
    section: 'Explore',
    items: [
      { to: '/discover', label: 'Discover', icon: Compass },
      { to: '/community', label: 'Communities', icon: Users },
    ],
  },
]

function ThemeToggle() {
  const { theme, setTheme } = useSettings()
  const cycle = () => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  const Icon = theme === 'system' ? Sun : theme === 'dark' ? Moon : Sun
  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme} (click to change)`}
      className="p-2 rounded-xl text-ink3 hover:text-ink hover:bg-surface2 transition-colors"
      aria-label="Toggle theme"
    >
      <Icon className="w-[18px] h-[18px]" />
    </button>
  )
}

export function SyncChip() {
  const { online, pending, status, lastSyncedAt, syncNow } = useSync()
  const user = useAuth((s) => s.user)
  const openAuth = useUi((s) => s.openAuth)

  if (!user) {
    return (
      <button
        onClick={() => openAuth('Sign in to sync your workspace across devices.')}
        title="Everything lives on this device only. Sign in to sync."
        className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-medium glass-subtle text-ink3 hover:text-ink2 transition-colors"
      >
        <CloudOff className="w-3.5 h-3.5" />
        Local only
      </button>
    )
  }

  const styles = cn(
    'hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-medium transition-colors',
    !online
      ? 'glass-subtle text-warn'
      : status === 'syncing'
        ? 'glass-subtle text-accent2'
        : 'glass-subtle text-ink3 hover:text-ink2',
  )
  return (
    <button
      onClick={() => void syncNow()}
      title={
        !online
          ? 'You are offline. Changes are stored locally and will sync when you reconnect.'
          : status === 'syncing'
            ? 'Syncing changes…'
            : pending > 0
              ? `${pending} change${pending === 1 ? '' : 's'} waiting to sync`
              : `Synced ${lastSyncedAt ? timeAgo(lastSyncedAt) : 'just now'}`
      }
      className={styles}
    >
      {!online ? (
        <WifiOff className="w-3.5 h-3.5" />
      ) : status === 'syncing' ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      ) : pending > 0 ? (
        <CloudOff className="w-3.5 h-3.5" />
      ) : (
        <Cloud className="w-3.5 h-3.5 text-ok" />
      )}
      {!online ? `Offline${pending > 0 ? ` · ${pending}` : ''}` : status === 'syncing' ? 'Syncing…' : status === 'conflict' ? 'Resolving…' : pending > 0 ? `${pending} to sync` : 'Synced'}
    </button>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { name } = useSettings()
  const user = useAuth((s) => s.user)
  const openAuth = useUi((s) => s.openAuth)
  const streak = useProgress((s) => s.streak)
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-full">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pt-5 pb-6 group">
        <OwlMark className="w-9 h-9 transition-transform group-hover:rotate-3" />
        <div>
          <div className="font-display font-bold text-[19px] leading-none tracking-tight">Wisely</div>
          <div className="text-[11px] text-ink3 mt-0.5">Study workspace</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-5">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink3">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 h-10 rounded-xl text-[13.5px] font-medium transition-colors relative',
                      isActive ? 'text-ink' : 'text-ink2 hover:text-ink hover:bg-surface2',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 glass rounded-xl"
                          transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                        />
                      )}
                      <item.icon className={cn('w-[17px] h-[17px] relative', isActive && 'text-accent')} />
                      <span className="relative">{item.label}</span>
                      {item.label === 'Library' && <DuePip />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-line/60 space-y-1.5">
        <button
          onClick={() => { onNavigate?.(); navigate('/progress') }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface2 transition-colors text-left"
          title="View your progress"
        >
          <div className="grid place-items-center w-8 h-8 rounded-lg bg-accent2/15 text-accent2">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight">{streak.current}-day streak</div>
            <div className="text-[11px] text-ink3">Best: {streak.longest} days</div>
          </div>
        </button>
        <div className="flex items-center gap-1 px-1.5">
          {user ? (
            <Link
              to="/settings"
              onClick={onNavigate}
              className="flex items-center gap-2 flex-1 min-w-0 px-1.5 py-1.5 rounded-xl hover:bg-surface2 transition-colors"
            >
              <Avatar name={user.name} color={user.color} size={26} />
              <span className="text-[13px] font-medium truncate">{user.name}</span>
            </Link>
          ) : (
            <button
              onClick={() => { onNavigate?.(); openAuth('Sign in to sync, join rooms and chat.') }}
              className="flex items-center gap-2 flex-1 min-w-0 px-1.5 py-1.5 rounded-xl hover:bg-surface2 transition-colors"
            >
              <Avatar name={name} color="#7a7f85" size={26} />
              <span className="text-[13px] font-medium truncate text-ink2">Guest — sign in</span>
            </button>
          )}
          <ThemeToggle />
          <Link
            to="/settings"
            onClick={onNavigate}
            className="p-2 rounded-xl text-ink3 hover:text-ink hover:bg-surface2 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function DuePip() {
  const due = useLibrary((s) => allDue(s.cards).length)
  if (due === 0) return null
  return (
    <span className="relative ml-auto text-[10px] font-bold bg-accent2/15 text-accent2 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
      {due > 99 ? '99+' : due}
    </span>
  )
}

export function OfflineBanner() {
  const { online, pending } = useSync()
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-warn/12 border-b border-warn/25 overflow-hidden"
        >
          <div className="px-4 py-1.5 text-center text-[12px] font-medium text-warn flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            You're offline — everything keeps working locally
            {pending > 0 && ` · ${pending} change${pending === 1 ? '' : 's'} will sync when you reconnect`}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Topbar() {
  const { online, pending } = useSync()
  const { setPaletteOpen, setSidebarOpen } = useUi()
  return (
    <header className="sticky top-0 z-30 glass-strong border-x-0 border-t-0 border-b border-line/40">
      <div className="flex items-center gap-2 px-3 sm:px-6 h-14">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl text-ink2 hover:bg-surface2 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => setPaletteOpen(true)}
          className="flex-1 sm:flex-none flex items-center gap-2.5 h-9 sm:w-[340px] px-3 rounded-xl border border-line bg-surface text-ink3 hover:border-ink3/40 transition-colors text-[13px]"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left truncate">Search notes, boards, decks…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold bg-surface2 border border-line rounded-md px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {!online && pending > 0 && (
            <span className="sm:hidden inline-flex items-center gap-1 text-[11px] font-semibold text-warn">
              <WifiOff className="w-3.5 h-3.5" /> {pending}
            </span>
          )}
          <SyncChip />
        </div>
      </div>
    </header>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUi()
  const theme = useSettings((s) => s.theme)

  // apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  return (
    <div className="min-h-screen flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:block w-[248px] shrink-0 border-r border-white/10 bg-surface/40 backdrop-blur-2xl backdrop-saturate-150 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink/30 dark:bg-black/50 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 bottom-0 z-50 w-[270px] glass-strong border-y-0 border-l-0 border-r border-line/40 lg:hidden"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-3 p-1.5 rounded-lg text-ink3 hover:bg-surface2"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent onNavigate={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar />
        <OfflineBanner />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
