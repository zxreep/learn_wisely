import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Flag, Info, Sparkles, TriangleAlert, Trophy, X } from 'lucide-react'
import { useToastStore, type ToastKind } from '../stores/toast'
import { cn } from '../lib/utils'

const ICONS: Record<ToastKind, { icon: React.ComponentType<{ className?: string }>; classes: string }> = {
  info: { icon: Info, classes: 'bg-surface2 text-ink2' },
  success: { icon: CheckCircle2, classes: 'bg-ok/15 text-ok' },
  xp: { icon: Sparkles, classes: 'bg-accent2/15 text-accent2' },
  badge: { icon: Trophy, classes: 'bg-accent2/15 text-accent2' },
  quest: { icon: Flag, classes: 'bg-accent/15 text-accent' },
  warn: { icon: TriangleAlert, classes: 'bg-warn/15 text-warn' },
}

export function Toasts() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const { icon: Icon, classes } = ICONS[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-surface/95 backdrop-blur px-3.5 py-3 shadow-pop"
            >
              <div className={cn('grid place-items-center w-8 h-8 rounded-xl shrink-0', classes)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold leading-tight">{t.title}</div>
                {t.desc && <div className="text-[12px] text-ink3 mt-0.5 leading-snug">{t.desc}</div>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink3 hover:text-ink transition-colors p-0.5"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
