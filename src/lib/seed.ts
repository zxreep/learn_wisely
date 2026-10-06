/**
 * First-run workspace seed. Everything is generated relative to "today"
 * so streaks, heatmaps and due dates look real the moment the app opens.
 * Persisted to localStorage after first run; regenerating only happens
 * after a full workspace reset.
 */
import { uid, mulberry32 } from './utils'
import { addDays, todayKey } from './dates'
import type {
  Board, DayLog, Deck, FileItem, Flashcard, Folder, Note,
} from './types'

export function seedLibrary() {
  const now = Date.now()
  const fBio: Folder = { id: uid('fld'), name: 'Biology 201', color: '#3f7d58' }
  const fHis: Folder = { id: uid('fld'), name: 'History 110', color: '#a35d8a' }
  const fMath: Folder = { id: uid('fld'), name: 'Calculus II', color: '#5b7fb0' }
  const fLife: Folder = { id: uid('fld'), name: 'Personal', color: '#c2703e' }
  const folders = [fBio, fHis, fMath, fLife]

  const notes: Note[] = [
    {
      id: uid('nte'),
      title: 'Mitosis — cell division overview',
      folderId: fBio.id,
      tags: ['cells', 'exam-2'],
      color: '#3f7d58',
      favorite: true,
      createdAt: now - 12 * 86400000,
      updatedAt: now - 2 * 3600000,
      content: `# Mitosis — cell division overview

Mitosis is the process of cell division that produces two genetically identical daughter cells from a single parent cell. It is the main way multicellular organisms grow, repair tissue and replace worn-out cells.

## The four phases

Prophase is the first phase of mitosis. During prophase, chromatin condenses into visible chromosomes, the nuclear envelope breaks down, and the spindle apparatus begins to form.

Metaphase refers to the stage where chromosomes line up across the middle of the cell, at a plane called the metaphase plate. Each chromosome is attached to spindle fibers from opposite poles.

Anaphase is the phase when sister chromatids are pulled apart toward opposite poles of the cell. The cell begins to elongate.

Telophase means the final phase of mitosis: two new nuclei form around the separated chromosomes, and the chromosomes begin to decondense.

## After mitosis

Cytokinesis is the division of the cytoplasm that follows mitosis, and it produces two separate daughter cells. In animal cells, cytokinesis occurs through a cleavage furrow; in plant cells, a cell plate forms.

The cell cycle includes interphase (G1, S and G2) plus the M phase. The S phase is when DNA replication happens, duplicating each chromosome before mitosis begins.

Mitosis is different from meiosis. Meiosis is a special division that produces four non-identical sex cells (gametes) with half the chromosome number, while mitosis maintains the chromosome number in ==identical somatic cells==.`,
    },
    {
      id: uid('nte'),
      title: 'Photosynthesis — light & dark reactions',
      folderId: fBio.id,
      tags: ['plants', 'exam-2'],
      favorite: false,
      createdAt: now - 9 * 86400000,
      updatedAt: now - 26 * 3600000,
      content: `# Photosynthesis

Photosynthesis is the process by which plants, algae and some bacteria convert light energy into chemical energy stored in glucose. The overall equation is: 6CO2 + 6H2O + light → C6H12O6 + 6O2.

## Light-dependent reactions

The light-dependent reactions occur in the thylakoid membranes of the chloroplasts. They capture light energy and use it to produce ATP and NADPH, releasing oxygen as a byproduct. Water is split in a process called photolysis, which replaces the lost electrons of chlorophyll.

## Calvin cycle (light-independent)

The Calvin cycle is the set of reactions that build glucose from carbon dioxide. It takes place in the stroma of the chloroplast. Carbon fixation refers to the incorporation of CO2 into an organic molecule, carried out by the enzyme RuBisCO.

Chlorophyll is the green pigment that absorbs light most strongly in the blue and red wavelengths, which is why plants appear green.`,
    },
    {
      id: uid('nte'),
      title: 'French Revolution — underlying causes',
      folderId: fHis.id,
      tags: ['essay', 'unit-3'],
      color: '#a35d8a',
      favorite: true,
      createdAt: now - 20 * 86400000,
      updatedAt: now - 50 * 3600000,
      content: `# French Revolution — causes

The French Revolution began in 1789. Historians usually point to a combination of long-term structural causes and short-term triggers.

## Long-term causes

The Estates System was the rigid social hierarchy dividing France into three estates: clergy (First), nobility (Second) and everyone else (Third). The Third Estate paid nearly all taxes while having almost no political power.

The Enlightenment refers to the intellectual movement that spread ideas of liberty, equality and popular sovereignty. Thinkers like Rousseau and Voltaire questioned absolute monarchy and the divine right of kings.

France's financial crisis was severe. Decades of war, including support for the American Revolution, emptied the treasury. In 1788, the monarchy was effectively bankrupt.

## Short-term triggers

In 1788, a poor harvest caused bread prices to soar, and ordinary Parisians spent most of their income on bread. In May 1789, Louis XVI called the Estates-General for the first time since 1614. On July 14, 1789, a crowd stormed the Bastille, a royal fortress and prison, which became the symbolic start of the Revolution.

==Essay angle==: argue whether the financial crisis or Enlightenment ideas mattered more.`,
    },
    {
      id: uid('nte'),
      title: 'Derivatives — cheat sheet',
      folderId: fMath.id,
      tags: ['formulas'],
      color: '#5b7fb0',
      favorite: false,
      createdAt: now - 15 * 86400000,
      updatedAt: now - 4 * 86400000,
      content: `# Derivatives — cheat sheet

The derivative of a function measures its instantaneous rate of change: the slope of the tangent line at a point.

## Core rules

- The power rule: d/dx [xⁿ] = n·xⁿ⁻¹
- The product rule: (fg)' = f'g + fg'
- The quotient rule: (f/g)' = (f'g − fg') / g²
- The chain rule: d/dx f(g(x)) = f'(g(x)) · g'(x). The chain rule is used whenever one function is nested inside another.

## Common derivatives

- d/dx [sin x] = cos x
- d/dx [cos x] = −sin x
- d/dx [eˣ] = eˣ
- d/dx [ln x] = 1/x

A critical point is a point where the derivative equals zero or is undefined. The second derivative describes concavity: when f''(x) > 0 the graph is concave up.`,
    },
    {
      id: uid('nte'),
      title: 'Essay plan — climate policy',
      folderId: fLife.id,
      tags: ['writing'],
      favorite: false,
      createdAt: now - 5 * 86400000,
      updatedAt: now - 8 * 3600000,
      content: `# Essay plan — climate policy

Working thesis: ==Carbon pricing works best when paired with direct investment in public transit==, because price signals alone can't change behavior where alternatives don't exist.

- Argument 1: elasticity — demand for driving is inelastic in car-dependent cities (evidence: Houston vs Amsterdam modal share).
- Argument 2: regressive impact — flat carbon taxes hit low-income rural drivers hardest; rebates + transit fix this.
- Counterargument: "pricing alone is more efficient" — concede efficiency, attack feasibility.

Open questions: find a specific case study (British Columbia carbon tax? Stockholm congestion charge?).`,
    },
    {
      id: uid('nte'),
      title: 'Reading log — Deep Work',
      folderId: fLife.id,
      tags: ['book', 'productivity'],
      favorite: false,
      createdAt: now - 30 * 86400000,
      updatedAt: now - 6 * 86400000,
      content: `# Deep Work — Cal Newport (notes)

Deep work refers to professional activities performed in a state of distraction-free concentration that push your cognitive capabilities to their limit.

- The ability to perform deep work is becoming *increasingly rare* at exactly the time it is becoming *increasingly valuable*.
- Attention residue: every time you switch tasks, part of your attention stays stuck on the previous one.
- Rule of thumb: schedule every minute of the workday; treat shallow work as the exception.
- "Clarity about what matters provides clarity about what does not."

Try this week: one 90-minute deep work block every morning before checking messages.`,
    },
  ]

  const files: FileItem[] = [
    { id: uid('fil'), name: 'Bio201_syllabus.pdf', mime: 'application/pdf', size: 184320, folderId: fBio.id, createdAt: now - 18 * 86400000 },
    { id: uid('fil'), name: 'Lab_report_template.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 40960, folderId: fBio.id, createdAt: now - 11 * 86400000 },
    { id: uid('fil'), name: 'Formula_sheet_scan.png', mime: 'image/png', size: 925696, folderId: fMath.id, createdAt: now - 7 * 86400000 },
  ]

  // ----- decks & flashcards -----
  const dBio: Deck = { id: uid('dck'), title: 'Cell structure & organelles', description: 'Organelles and what they actually do.', color: '#3f7d58', favorite: true, createdAt: now - 13 * 86400000 }
  const dSpa: Deck = { id: uid('dck'), title: 'Spanish survival phrases', description: 'A1 phrases for the exchange trip.', color: '#c2703e', favorite: false, createdAt: now - 8 * 86400000 }
  const dHis: Deck = { id: uid('dck'), title: 'French Revolution dates', description: 'Anchor dates for unit 3.', color: '#a35d8a', favorite: false, createdAt: now - 6 * 86400000 }
  const decks = [dBio, dSpa, dHis]

  const mk = (deckId: string, front: string, back: string, daysAgoReviewed: number | null, interval: number): Flashcard => {
    const reviewed = daysAgoReviewed === null
    return {
      id: uid('crd'), deckId, front, back,
      interval, ease: 2.5,
      reps: reviewed ? 0 : Math.max(1, Math.round(interval / 2)),
      due: reviewed ? now : now - daysAgoReviewed * 86400000 + interval * 86400000,
      lastRating: reviewed ? undefined : 'good',
    }
  }

  const cards: Flashcard[] = [
    mk(dBio.id, 'What is the function of the mitochondria?', 'Produces ATP through cellular respiration — the "powerhouse" of the cell.', 1, 2),
    mk(dBio.id, 'Rough ER vs Smooth ER?', 'Rough ER has ribosomes and makes proteins; smooth ER makes lipids and detoxifies.', 2, 3),
    mk(dBio.id, 'What does the Golgi apparatus do?', 'Modifies, sorts and packages proteins for transport.', 0, 1),
    mk(dBio.id, 'Where does photosynthesis occur?', 'In the chloroplasts (light reactions in thylakoids, Calvin cycle in the stroma).', null, 0),
    mk(dBio.id, 'Function of the cell membrane?', 'Selective barrier: controls what enters and leaves the cell.', 3, 4),
    mk(dBio.id, 'What are lysosomes for?', 'Digestion and recycling of cellular waste using enzymes.', null, 0),
    mk(dBio.id, 'What does the nucleus contain?', 'The cell’s DNA (chromatin) and the nucleolus, which makes ribosomes.', 1, 2),
    mk(dBio.id, 'Cell wall vs cell membrane?', 'Wall = rigid support (plants, fungi, bacteria); membrane = all cells, controls transport.', null, 0),
    mk(dSpa.id, '"Where is the library?"', '¿Dónde está la biblioteca?', 0, 1),
    mk(dSpa.id, '"I would like a coffee, please."', 'Quisiera un café, por favor.', 1, 2),
    mk(dSpa.id, '"How much does it cost?"', '¿Cuánto cuesta?', null, 0),
    mk(dSpa.id, '"I don’t understand."', 'No entiendo.', 2, 3),
    mk(dSpa.id, '"Can you help me?"', '¿Me puedes ayudar?', null, 0),
    mk(dSpa.id, '"Excuse me / sorry"', 'Perdón / disculpe.', 0, 1),
    mk(dHis.id, 'When did the French Revolution begin?', '1789 — Estates-General in May, Bastille on July 14.', 1, 2),
    mk(dHis.id, 'When was the Declaration of the Rights of Man?', 'August 1789.', 2, 3),
    mk(dHis.id, 'When was Louis XVI executed?', 'January 21, 1793.', null, 0),
    mk(dHis.id, 'When did the Reign of Terror begin?', 'September 1793 (Committee of Public Safety, Robespierre).', 0, 1),
    mk(dHis.id, 'When did Napoleon crown himself Emperor?', '1804 — effectively ending the revolutionary republic.', null, 0),
  ]

  return { folders, notes, files, decks, cards }
}

export function seedBoards(): Board[] {
  const now = Date.now()
  const c = (title: string, note?: string, extra?: Partial<Board['cards'][number]>) => ({
    id: uid('bcd'), columnId: '', title, note, tags: [], createdAt: now - Math.random() * 86400000 * 3, done: false, ...extra,
  })
  const due = (n: number) => addDays(todayKey(), n)

  const semester: Board = {
    id: uid('brd'), title: 'Semester plan', icon: 'calendar', color: '#3f7d58',
    description: 'Everything due this semester, spread across sane weeks.',
    favorite: true, createdAt: now - 30 * 86400000, updatedAt: now - 3600000,
    columns: [
      { id: uid('col'), title: 'Backlog' },
      { id: uid('col'), title: 'This week' },
      { id: uid('col'), title: 'Doing' },
      { id: uid('col'), title: 'Done' },
    ],
    cards: [
      c('Finish Bio ch. 7 notes', 'Photosynthesis section is half done', { tags: ['bio'], priority: 'high', due: due(1) }),
      c('History essay outline', undefined, { tags: ['history', 'essay'], priority: 'med', due: due(3) }),
      c('Problem set 6 — integrals', undefined, { tags: ['math'], priority: 'high', due: due(2) }),
      c('Renew library books', undefined, { tags: ['admin'], priority: 'low' }),
      c('Spanish vocab: 40 new words', undefined, { tags: ['spanish'] }),
      c('Sign up for study room slot', undefined, { done: true, tags: ['admin'] }),
    ],
  }
  semester.cards[0].columnId = semester.columns[1].id
  semester.cards[1].columnId = semester.columns[1].id
  semester.cards[2].columnId = semester.columns[2].id
  semester.cards[3].columnId = semester.columns[0].id
  semester.cards[4].columnId = semester.columns[0].id
  semester.cards[5].columnId = semester.columns[3].id

  const cram: Board = {
    id: uid('brd'), title: 'Bio exam sprint', icon: 'zap', color: '#c2703e',
    description: 'Ten days out from the midterm.',
    favorite: true, createdAt: now - 4 * 86400000, updatedAt: now - 7200000,
    columns: [
      { id: uid('col'), title: 'To review' },
      { id: uid('col'), title: 'Reviewing' },
      { id: uid('col'), title: 'Mastered' },
    ],
    cards: [
      c('Cell cycle & mitosis phases', 'Use flashcards + teach-back', { tags: ['ch.5'], priority: 'high' }),
      c('Photosynthesis light reactions', undefined, { tags: ['ch.6'], priority: 'med' }),
      c('Past paper 2024, section B', undefined, { tags: ['practice'], due: due(4), priority: 'high' }),
      c('Labeled diagram: mitochondria', undefined, { tags: ['ch.4'] }),
      c('Osmosis & tonicity problem set', undefined, { tags: ['ch.7'], done: true }),
    ],
  }
  cram.cards[0].columnId = cram.columns[1].id
  cram.cards[1].columnId = cram.columns[0].id
  cram.cards[2].columnId = cram.columns[0].id
  cram.cards[3].columnId = cram.columns[0].id
  cram.cards[4].columnId = cram.columns[2].id

  return [semester, cram]
}

/** deterministic-but-plausible 26-week activity history + today's streak */
export function seedActivity(): { log: Record<string, DayLog>; streak: { current: number; longest: number; lastActive: string }; xp: number } {
  const rand = mulberry32(20261005)
  const log: Record<string, DayLog> = {}
  let xp = 0
  const today = todayKey()
  for (let i = 181; i >= 0; i--) {
    const key = addDays(today, -i)
    const withinStreak = i <= 5
    const r = rand()
    const studied = withinStreak || r < 0.55
    if (!studied) continue
    const sessions = withinStreak ? 1 + Math.floor(rand() * 3) : rand() < 0.6 ? 1 : 2 + Math.floor(rand() * 3)
    const minutes = Math.round((12 + rand() * 90) * sessions * (withinStreak ? 0.8 : 1)) || 25
    const cards = Math.round(rand() * 40)
    const dayXp = minutes * 2 + sessions * 20 + cards * 3
    log[key] = { minutes, xp: dayXp, cards, sessions }
    xp += dayXp
    if (i === 0) {
      // make "today" partially complete: a bit of study already done
      log[key].minutes = Math.min(24, log[key].minutes)
      log[key].sessions = 1
    }
  }
  xp += 340 // account level head-start
  return { log, streak: { current: 6, longest: 11, lastActive: today }, xp }
}
