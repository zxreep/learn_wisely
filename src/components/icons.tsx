import {
  Book, BookOpen, Brain, Calendar, CalendarDays, Code, Compass, FileText, FlaskConical,
  Flame, Footprints, GraduationCap, Heart, KanbanSquare, Languages, Layers, LayoutGrid,
  Lightbulb, ListTodo, Map, Microscope, Moon, PenLine, Rocket, Scroll, Sparkles, Star,
  Sunrise, Target, Timer, Users, Waves, Zap, type LucideIcon,
} from 'lucide-react'

/** string-keyed icon lookup so persisted entities can store icon keys */
const ICONS: Record<string, LucideIcon> = {
  board: KanbanSquare,
  calendar: CalendarDays,
  zap: Zap,
  microscope: Microscope,
  languages: Languages,
  users: Users,
  target: Target,
  book: Book,
  bookopen: BookOpen,
  list: ListTodo,
  rocket: Rocket,
  brain: Brain,
  star: Star,
  flask: FlaskConical,
  flame: Flame,
  code: Code,
  heart: Heart,
  scroll: Scroll,
  compass: Compass,
  footprints: Footprints,
  waves: Waves,
  moon: Moon,
  sunrise: Sunrise,
  map: Map,
  cards: Layers,
  cap: GraduationCap,
  timer: Timer,
  grid: LayoutGrid,
  note: FileText,
  idea: Lightbulb,
  pen: PenLine,
  sparkles: Sparkles,
  cal: Calendar,
}

export function DynIcon({ name, className, ...rest }: { name: string; className?: string; strokeWidth?: number }) {
  const Cmp = ICONS[name] ?? Star
  return <Cmp className={className} {...rest} />
}

/** Wisely owl mark — a little scholarly owl drawn as SVG */
export function OwlMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="16" className="fill-accent" />
      {/* ear tufts */}
      <path d="M13 15 L25 20 L15 23 Z" className="fill-accent" />
      <path d="M51 15 L39 20 L49 23 Z" className="fill-accent" />
      <path d="M15 16 L24 20 L17 22 Z M49 16 L40 20 L47 22 Z" className="fill-surface" />
      {/* eyes */}
      <circle cx="23" cy="30" r="9.5" className="fill-surface" />
      <circle cx="41" cy="30" r="9.5" className="fill-surface" />
      <circle cx="25" cy="31" r="3.6" className="fill-ink" />
      <circle cx="39" cy="31" r="3.6" className="fill-ink" />
      <circle cx="26.3" cy="29.7" r="1.1" className="fill-surface" />
      <circle cx="40.3" cy="29.7" r="1.1" className="fill-surface" />
      {/* beak */}
      <path d="M32 37.5 L37 43 L32 50.5 L27 43 Z" className="fill-accent2" />
      {/* chest feather hints */}
      <path d="M24 52 q2.5 2.4 5 0 q2.5 2.4 5 0 q2.5 2.4 5 0" stroke="currentColor" strokeWidth="1.6" fill="none" className="text-surface opacity-70" strokeLinecap="round" />
    </svg>
  )
}
