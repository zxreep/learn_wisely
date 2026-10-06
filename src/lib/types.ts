export type ID = string

/* ------------------------------- Library -------------------------------- */
export interface Folder {
  id: ID
  name: string
  color?: string
  parentId?: ID | null
}

export interface Note {
  id: ID
  title: string
  content: string
  folderId: ID | null
  tags: string[]
  color?: string
  favorite: boolean
  createdAt: number
  updatedAt: number
}

export interface FileItem {
  id: ID
  name: string
  mime: string
  size: number
  dataUrl?: string
  folderId: ID | null
  createdAt: number
}

export interface Deck {
  id: ID
  title: string
  description: string
  color: string
  favorite: boolean
  createdAt: number
  fromDiscover?: boolean
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface Flashcard {
  id: ID
  deckId: ID
  front: string
  back: string
  // spaced repetition state
  interval: number // days
  ease: number // easiness factor
  reps: number
  due: number // timestamp ms
  lastRating?: Rating
}

/* -------------------------------- Boards -------------------------------- */
export interface BoardColumn {
  id: ID
  title: string
}

export interface BoardCard {
  id: ID
  columnId: ID
  title: string
  note?: string
  tags: string[]
  due?: string // dayKey
  priority?: 'low' | 'med' | 'high'
  linkedNoteId?: ID
  createdAt: number
  done: boolean
}

export interface Board {
  id: ID
  title: string
  icon: string // lucide icon name key
  color: string
  description?: string
  columns: BoardColumn[]
  cards: BoardCard[]
  favorite: boolean
  createdAt: number
  updatedAt: number
  fromDiscover?: boolean
}

/* ------------------------------ Gamification ---------------------------- */
export type Metric =
  | 'focus-minutes'
  | 'sessions'
  | 'cards-reviewed'
  | 'notes-created'
  | 'tasks-completed'
  | 'content-added'
  | 'communities-joined'

export interface DayLog {
  minutes: number
  xp: number
  cards: number
  sessions: number
}

export interface Quest {
  id: ID
  kind: 'daily' | 'weekly'
  title: string
  desc?: string
  metric: Metric
  target: number
  progress: number
  xp: number
  periodKey: string // dayKey or weekKey
  done: boolean
}

export interface XpEvent {
  id: ID
  label: string
  xp: number
  at: number
}

export interface Streak {
  current: number
  longest: number
  lastActive: string // dayKey
}

/* -------------------------------- Focus --------------------------------- */
export type FocusPhase = 'work' | 'short' | 'long'

export interface FocusSession {
  id: ID
  startedAt: number
  minutes: number
  label: string
  mode: string
  roomId?: string
}

export interface FocusSettings {
  workMin: number
  shortMin: number
  longMin: number
  cycles: number
  autoBreaks: boolean
}
