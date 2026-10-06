import { useState } from 'react'
import { Cloud, Loader2, Lock, Sparkles, User as UserIcon } from 'lucide-react'
import { Button, Input, Modal } from './ui'
import { useAuth } from '../stores/auth'
import { useUi } from '../stores/ui'
import { cn } from '../lib/utils'

const COLORS = ['#2f7a57', '#1f3f7a', '#5b4b8a', '#8f3b2f', '#b0851f', '#4a8fa3']

export default function AuthModal() {
  const { open, hint } = useUi((s) => s.authPrompt)
  const closeAuth = useUi((s) => s.closeAuth)
  const { login, signup, busy, error, clearError } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const submit = async () => {
    const okFn = mode === 'login' ? () => login(name, password) : () => signup(name, password, color)
    if (await okFn()) {
      setName('')
      setPassword('')
      closeAuth()
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        clearError()
        closeAuth()
      }}
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent/12 text-accent">
            <Cloud className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </span>
          <div>
            <h2 className="font-display text-[19px] font-semibold tracking-tight">
              {mode === 'login' ? 'Sign in to Wisely' : 'Create your account'}
            </h2>
            <p className="text-[12px] text-ink3">{hint ?? 'Sync, communities, rooms and the leaderboard all use real accounts.'}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-xl bg-ink/5 dark:bg-white/5">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                clearError()
              }}
              className={cn(
                'h-8 rounded-lg text-[12.5px] font-semibold transition-all',
                mode === m ? 'glass-strong text-ink shadow-glass-sm' : 'text-ink3 hover:text-ink',
              )}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink2">
              <UserIcon className="w-3 h-3" /> Display name
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'signup' ? 'e.g. Ada of the Pines' : 'Your name'}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink2">
              <Lock className="w-3 h-3" /> Password
            </span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 4 characters' : 'Your password'}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </label>
          {mode === 'signup' && (
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink2">
                <Sparkles className="w-3 h-3" /> Your color (rooms & leaderboard)
              </span>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn('w-7 h-7 rounded-full transition-transform', color === c && 'scale-110 ring-2 ring-offset-2 ring-ink/30 dark:ring-offset-surface')}
                    style={{ backgroundColor: c }}
                    aria-label={`color ${c}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-[12.5px] text-bad">{error}</div>
        )}

        <Button
          variant="primary"
          className="w-full mt-4 h-10"
          disabled={busy || name.trim().length < 2 || password.length < 4}
          onClick={submit}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
        <p className="mt-3 text-center text-[11px] text-ink3 leading-snug">
          Your workspace lives on this device first — signing in syncs it to this account on every device.
        </p>
      </div>
    </Modal>
  )
}
