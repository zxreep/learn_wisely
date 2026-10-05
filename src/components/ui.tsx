import { type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn, initials } from '../lib/utils'

/* ------------------------------- Button --------------------------------- */
type BtnVariant = 'primary' | 'accent2' | 'ghost' | 'subtle' | 'outline' | 'danger'

export function Button({
  variant = 'primary', size = 'md', className, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' | 'icon' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-xl transition-all select-none',
        'active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-[38px] px-4 text-sm',
        size === 'lg' && 'h-11 px-5 text-[15px]',
        size === 'icon' && 'h-9 w-9',
        variant === 'primary' && 'bg-accent text-surface hover:brightness-110 shadow-sm',
        variant === 'accent2' && 'bg-accent2 text-surface hover:brightness-110 shadow-sm',
        variant === 'ghost' && 'hover:bg-surface2 text-ink2 hover:text-ink',
        variant === 'subtle' && 'bg-surface2 hover:bg-surface3 text-ink border border-line/60',
        variant === 'outline' && 'border border-line hover:bg-surface2 text-ink',
        variant === 'danger' && 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/25',
        className,
      )}
      {...props}
    />
  )
}

/* --------------------------------- Card --------------------------------- */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface border border-line/70 rounded-2xl shadow-card', className)}
      {...props}
    />
  )
}

export function SectionTitle({ title, desc, right, className }: { title: ReactNode; desc?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-end justify-between gap-3', className)}>
      <div>
        <h3 className="font-display font-semibold text-[17px] tracking-tight">{title}</h3>
        {desc && <div className="text-[13px] text-ink3 mt-0.5">{desc}</div>}
      </div>
      {right}
    </div>
  )
}

/* --------------------------------- Chip --------------------------------- */
export function Chip({ children, className, color }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-surface2 text-ink2 border border-line/60', className)}
      style={color ? { backgroundColor: color + '22', color, borderColor: color + '44' } : undefined}
    >
      {children}
    </span>
  )
}

/* --------------------------------- Modal -------------------------------- */
export function Modal({
  open, onClose, children, wide, tall,
}: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] dark:bg-black/50"
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cn(
              'relative w-full bg-surface border border-line rounded-3xl shadow-pop overflow-hidden outline-none',
              wide ? 'max-w-3xl' : 'max-w-lg',
              tall && 'max-h-[86vh] flex flex-col',
            )}
          >
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-lg text-ink3 hover:text-ink hover:bg-surface2 transition-colors"
              aria-label="Close"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* --------------------------------- Inputs ------------------------------- */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-[38px] w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink3',
        'focus:border-accent/60 focus:ring-2 focus:ring-accent/15 outline-none transition-shadow',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink3',
        'focus:border-accent/60 focus:ring-2 focus:ring-accent/15 outline-none transition-shadow resize-y min-h-[80px]',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-[38px] rounded-xl border border-line bg-surface px-2.5 text-sm text-ink',
        'focus:border-accent/60 outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors shrink-0',
        checked ? 'bg-accent' : 'bg-surface3 border border-line',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  )
}

/* ------------------------------- Progress ------------------------------- */
export function ProgressBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn('h-1.5 rounded-full bg-surface3 overflow-hidden', className)}>
      <motion.div
        className="h-full rounded-full bg-accent"
        style={color ? { backgroundColor: color } : undefined}
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: 'spring', damping: 24, stiffness: 220 }}
      />
    </div>
  )
}

export function ProgressRing({
  value, size = 84, stroke = 7, color, track, children, className,
}: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; className?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, value))
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface3" style={track ? { stroke: track } : undefined} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className="stroke-accent"
          style={color ? { stroke: color } : undefined}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: 'spring', damping: 28, stiffness: 160 }}
        />
      </svg>
      {children}
    </div>
  )
}

/* --------------------------------- Tabs --------------------------------- */
export function Tabs<T extends string>({
  options, value, onChange, className,
}: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 rounded-xl bg-surface2 border border-line/60 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative px-3 h-[30px] rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap',
            value === o.value ? 'text-ink' : 'text-ink3 hover:text-ink2',
          )}
        >
          {value === o.value && (
            <motion.span layoutId={undefined} className="absolute inset-0 bg-surface rounded-lg shadow-sm border border-line/50" />
          )}
          <span className="relative flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/* -------------------------------- Avatar -------------------------------- */
export function Avatar({ name, color, size = 34, className }: { name: string; color: string; size?: number; className?: string }) {
  return (
    <div
      className={cn('grid place-items-center rounded-full font-semibold text-white shrink-0', className)}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  )
}

/* ------------------------------ Empty state ----------------------------- */
export function EmptyState({ icon, title, desc, action, className }: { icon?: ReactNode; title: string; desc?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      {icon && <div className="mb-3 text-ink3">{icon}</div>}
      <div className="font-display font-semibold text-[16px]">{title}</div>
      {desc && <div className="text-sm text-ink3 mt-1 max-w-xs">{desc}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ------------------------------ Stat block ------------------------------ */
export function Stat({ label, value, icon, hint, className }: { label: string; value: ReactNode; icon?: ReactNode; hint?: string; className?: string }) {
  return (
    <Card className={cn('px-4 py-3.5 flex items-center gap-3.5', className)}>
      {icon && (
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-surface2 text-accent shrink-0">{icon}</div>
      )}
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-ink3 uppercase tracking-wide">{label}</div>
        <div className="text-lg font-semibold font-display leading-tight truncate">{value}</div>
        {hint && <div className="text-[11px] text-ink3">{hint}</div>}
      </div>
    </Card>
  )
}

/* ------------------------------ Page shell ------------------------------ */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-up', className)}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-[26px] font-semibold tracking-tight leading-tight">{title}</h1>
        {subtitle && <div className="text-sm text-ink3 mt-1">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
