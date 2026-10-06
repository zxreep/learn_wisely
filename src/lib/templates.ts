/**
 * Discover catalog — starter boards, shared flashcard decks and note packs.
 * Static, shipped with the app; cloning copies them into the user's workspace.
 */
import type { ID } from './types'

export interface BoardTemplate {
  id: ID
  title: string
  description: string
  icon: string
  color: string
  category: string
  uses: number
  columns: string[]
  cards: { col: number; title: string; note?: string }[]
}

export interface DeckTemplate {
  id: ID
  title: string
  description: string
  subject: string
  color: string
  downloads: number
  cards: { front: string; back: string }[]
}

export interface NotePack {
  id: ID
  title: string
  description: string
  color: string
  downloads: number
  content: string
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'bt-exam-cram',
    title: 'Exam Cram Sprint',
    description: 'A 7-day countdown board to get from "I should study" to walking in ready.',
    icon: 'zap',
    color: '#c2703e',
    category: 'Exam prep',
    uses: 12400,
    columns: ['7-day plan', 'Today', 'Done'],
    cards: [
      { col: 0, title: 'Skim all lecture slides once', note: 'Flag anything you don’t recognise.' },
      { col: 0, title: 'Build flashcards for ch. 4–6' },
      { col: 0, title: 'Do the 2024 past paper under time', note: 'Grade it honestly — gaps go to Today.' },
      { col: 0, title: 'Teach-back: hardest topic, out loud' },
      { col: 1, title: '25-min Focus: weakest chapter' },
      { col: 2, title: 'Pack bag + student card the night before' },
    ],
  },
  {
    id: 'bt-semester',
    title: 'Semester Planner',
    description: 'The whole semester on one board — deadlines, readings and milestones.',
    icon: 'calendar',
    color: '#3f7d58',
    category: 'Planning',
    uses: 22100,
    columns: ['Backlog', 'This month', 'This week', 'Done'],
    cards: [
      { col: 0, title: 'Read all syllabi; note exam dates' },
      { col: 0, title: 'Buy second-hand textbooks' },
      { col: 1, title: 'Go to office hours at least once' },
      { col: 1, title: 'Start midterm revision calendar' },
      { col: 2, title: 'Finish weekly readings before Friday' },
      { col: 3, title: 'Register for classes' },
    ],
  },
  {
    id: 'bt-research',
    title: 'Research Project',
    description: 'From question to submission: sources, outline, drafting and revision loops.',
    icon: 'microscope',
    color: '#5b7fb0',
    category: 'Projects',
    uses: 8300,
    columns: ['Sources to read', 'Outline', 'Drafting', 'Revision', 'Submitted'],
    cards: [
      { col: 0, title: 'Smith (2022) — meta-analysis', note: 'Skim abstract + conclusion first.' },
      { col: 0, title: 'Library database search: 3 keywords' },
      { col: 1, title: 'Thesis statement v1' },
      { col: 2, title: 'Methods section draft' },
      { col: 3, title: 'Citation format pass (APA)' },
    ],
  },
  {
    id: 'bt-language',
    title: 'Language Learning',
    description: 'Rotate vocab, grammar, listening and speaking so no skill rusts.',
    icon: 'languages',
    color: '#a35d8a',
    category: 'Languages',
    uses: 15700,
    columns: ['Vocab', 'Grammar', 'Listening', 'Speaking', 'Review'],
    cards: [
      { col: 0, title: '20 new words into flashcard deck' },
      { col: 1, title: 'Past tense drills' },
      { col: 2, title: 'Podcast episode at 0.9x, note 5 phrases' },
      { col: 3, title: '3 minutes of self-talk recording' },
      { col: 4, title: 'Weekly review session' },
    ],
  },
  {
    id: 'bt-group',
    title: 'Group Project HQ',
    description: 'Shared lanes for ideas, assignments and blockers — no more lost threads.',
    icon: 'users',
    color: '#96762f',
    category: 'Projects',
    uses: 6900,
    columns: ['Ideas', 'Assigned', 'In progress', 'Blocked', 'Done'],
    cards: [
      { col: 0, title: 'Topic brainstorm (everyone: 3 ideas)' },
      { col: 1, title: 'Slides skeleton — Alex' },
      { col: 2, title: 'Data collection — Priya' },
      { col: 3, title: 'Booking the presentation room' },
      { col: 4, title: 'Pick meeting time poll' },
    ],
  },
]

export const DECK_TEMPLATES: DeckTemplate[] = [
  {
    id: 'dt-capitals',
    title: 'World Capitals',
    description: 'The 40 capital-city pairings that show up on every geography test — starter set.',
    subject: 'Geography',
    color: '#3f7d58',
    downloads: 31200,
    cards: [
      { front: 'Capital of France?', back: 'Paris' },
      { front: 'Capital of Japan?', back: 'Tokyo' },
      { front: 'Capital of Brazil?', back: 'Brasília (not Rio or São Paulo)' },
      { front: 'Capital of Canada?', back: 'Ottawa' },
      { front: 'Capital of Australia?', back: 'Canberra (not Sydney)' },
      { front: 'Capital of Egypt?', back: 'Cairo' },
      { front: 'Capital of Kenya?', back: 'Nairobi' },
      { front: 'Capital of Norway?', back: 'Oslo' },
      { front: 'Capital of Chile?', back: 'Santiago' },
      { front: 'Capital of Poland?', back: 'Warsaw' },
      { front: 'Capital of India?', back: 'New Delhi' },
      { front: 'Capital of South Korea?', back: 'Seoul' },
    ],
  },
  {
    id: 'dt-anatomy',
    title: 'Human Anatomy Basics',
    description: 'Organs, bones and systems — the foundations before physiology.',
    subject: 'Biology',
    color: '#c2703e',
    downloads: 24800,
    cards: [
      { front: 'What is the largest organ of the human body?', back: 'The skin (~2 m², 3–4 kg).' },
      { front: 'How many chambers does the heart have?', back: 'Four: two atria and two ventricles.' },
      { front: 'Longest bone in the human body?', back: 'The femur (thigh bone).' },
      { front: 'Where is insulin produced?', back: 'In the beta cells of the pancreas (islets of Langerhans).' },
      { front: 'What does the cerebellum control?', back: 'Coordination, balance and fine motor control.' },
      { front: 'Where are red blood cells produced?', back: 'In the red bone marrow.' },
      { front: 'Functional unit of the kidney?', back: 'The nephron (~1 million per kidney).' },
      { front: 'Normal core body temperature?', back: '≈ 37 °C (98.6 °F).' },
      { front: 'Which muscle straightens the arm?', back: 'The triceps brachii (extends the elbow).' },
      { front: 'What do alveoli do?', back: 'Tiny air sacs in the lungs where gas exchange happens.' },
    ],
  },
  {
    id: 'dt-ochem',
    title: 'Organic Chem: Functional Groups',
    description: 'Recognise the group, predict the behaviour. Ten patterns you must know cold.',
    subject: 'Chemistry',
    color: '#5b7fb0',
    downloads: 18600,
    cards: [
      { front: 'Alcohol group?', back: '–OH (hydroxyl), e.g. ethanol.' },
      { front: 'Aldehyde?', back: '–CHO: a carbonyl (C=O) at the end of a chain.' },
      { front: 'Ketone?', back: 'C=O between two carbons, e.g. acetone.' },
      { front: 'Carboxylic acid?', back: '–COOH: carbonyl + hydroxyl on the same carbon.' },
      { front: 'Amine?', back: '–NH₂ (basic), derived from ammonia.' },
      { front: 'Ester?', back: '–COO–: acid + alcohol; often fruity smells.' },
      { front: 'Amide?', back: '–CONH₂: carbonyl bonded to nitrogen (peptide bonds).' },
      { front: 'Alkene?', back: 'At least one C=C double bond.' },
      { front: 'Alkyne?', back: 'At least one C≡C triple bond.' },
      { front: 'Ether?', back: 'R–O–R′: oxygen between two carbon chains.' },
    ],
  },
  {
    id: 'dt-js',
    title: 'JavaScript Fundamentals',
    description: 'Interview-grade essentials for intro web dev courses.',
    subject: 'Computer Science',
    color: '#96762f',
    downloads: 27400,
    cards: [
      { front: 'let vs const?', back: 'let is reassignable; const is not (but its object contents can mutate).' },
      { front: 'map vs forEach?', back: 'map returns a new array; forEach returns undefined and is for side effects.' },
      { front: 'What is a closure?', back: 'A function that remembers variables from the scope where it was created.' },
      { front: 'What is hoisting?', back: 'Declarations (var/function) are moved to the top of their scope before execution.' },
      { front: '== vs ===?', back: '== coerces types first; === compares value AND type. Prefer ===.' },
      { front: 'Three states of a Promise?', back: 'pending, fulfilled, rejected.' },
      { front: 'What does the spread operator (...) do?', back: 'Expands iterables into elements or copies properties into new objects/arrays.' },
      { front: 'What is destructuring?', back: 'Unpacking values: const {a, b} = obj or const [x, y] = arr.' },
    ],
  },
  {
    id: 'dt-ushistory',
    title: 'US History: Key Dates',
    description: 'Eight anchor dates every survey course expects you to know.',
    subject: 'History',
    color: '#a35d8a',
    downloads: 12900,
    cards: [
      { front: 'Declaration of Independence signed?', back: '1776 (July 4).' },
      { front: 'Constitution ratified?', back: '1788 (took effect 1789).' },
      { front: 'Civil War years?', back: '1861–1865.' },
      { front: 'US enters WWI?', back: '1917.' },
      { front: 'New Deal begins?', back: '1933 (FDR’s first 100 days).' },
      { front: 'Attack on Pearl Harbor?', back: 'December 7, 1941.' },
      { front: 'Moon landing?', back: 'July 20, 1969 (Apollo 11).' },
      { front: 'Berlin Wall falls?', back: 'November 9, 1989.' },
    ],
  },
]

export const NOTE_PACKS: NotePack[] = [
  {
    id: 'np-cornell',
    title: 'Cornell Notes starter',
    description: 'Cues / notes / summary layout that makes revision 10x easier.',
    color: '#3f7d58',
    downloads: 9800,
    content: `# Cornell Notes — Topic:

## Cues (questions & keywords)
- Write questions the notes answer
- Keywords: ==highlight== important terms

## Notes
- Main ideas go here during class
- Keep it short: fragments beat sentences

## Summary (write within 24h)
One paragraph, in your own words: what was this about, and why does it matter?`,
  },
  {
    id: 'np-examweek',
    title: 'Exam-week checklist',
    description: 'A calm, concrete checklist for the 7 days before a big exam.',
    color: '#c2703e',
    downloads: 14200,
    content: `# Exam-week checklist

**T-7** — Gather everything: syllabus, notes, past papers. One folder, physical or digital.
**T-6** — Diagnostic: do one past paper cold. List the 3 weakest topics.
**T-5** — Flashcards for weakest topic #1. One Focus session minimum.
**T-4** — Weakest topic #2. Explain it out loud to a wall/plant/patient friend.
**T-3** — Weakest topic #3 + spaced review of T-5 cards.
**T-2** — Full timed practice paper. Grade, log mistakes.
**T-1** — Light review only. Sleep 8h. Pack: ID, pens, water, watch.
**T-0** — Breathe. You’ve done the work.`,
  },
  {
    id: 'np-essay',
    title: 'Essay planner',
    description: 'Thesis → arguments → evidence → conclusion. Never stare at a blank page again.',
    color: '#5b7fb0',
    downloads: 7600,
    content: `# Essay planner

## Working thesis
One sentence I could argue *against* (if I can’t, it’s not a thesis yet):

## Argument 1
Claim → Evidence → Why it matters:

## Argument 2
Claim → Evidence → Why it matters:

## Counterargument (steal-man it)
The strongest objection, and my reply:

## Conclusion
Don’t repeat — answer “so what?”: what should the reader now see differently?`,
  },
]
