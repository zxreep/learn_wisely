import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import type { QuizQuestion } from '../lib/ai'
import { Button, ProgressBar } from './ui'
import { cn } from '../lib/utils'
import { useProgress } from '../stores/progress'

/**
 * Presentational multiple-choice quiz runner. Used by the AI drawer
 * ("Quiz me") and by deck study sessions.
 */
export function QuizRunner({
  questions, onClose, title = 'Quiz',
}: { questions: QuizQuestion[]; onClose: () => void; title?: string }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [round, setRound] = useState(0)
  const q = questions[i]
  const awardXp = useProgress((s) => s.awardXp)

  const correctCount = useMemo(() => score, [score])

  if (!q) return null

  const pick = (o: number) => {
    if (picked !== null) return
    setPicked(o)
    if (o === q.answer) {
      setScore((s) => s + 1)
    }
  }

  const next = () => {
    if (i + 1 >= questions.length) {
      setFinished(true)
      const earned = (score * 8) + (score === questions.length ? 20 : 0)
      awardXp(earned, `Quiz: ${score}/${questions.length} correct`)
    } else {
      setI((x) => x + 1)
      setPicked(null)
    }
  }

  const restart = () => {
    setI(0); setPicked(null); setScore(0); setFinished(false); setRound((r) => r + 1)
  }

  return (
    <div className="p-5 sm:p-6" key={round}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-display font-semibold">{title}</div>
        <div className="text-[12px] text-ink3">{Math.min(i + 1, questions.length)} / {questions.length}</div>
      </div>
      <ProgressBar value={((i + (picked !== null ? 1 : 0)) / questions.length) * 100} className="mb-5" />

      <AnimatePresence mode="wait">
        {finished ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-6"
          >
            <div className="font-display text-4xl font-bold">
              {Math.round((correctCount / questions.length) * 100)}%
            </div>
            <div className="text-sm text-ink3 mt-1">
              {correctCount} of {questions.length} correct · +{(correctCount * 8) + (correctCount === questions.length ? 20 : 0)} XP
            </div>
            <div className="mt-3 font-hand text-2xl text-accent">
              {correctCount === questions.length
                ? 'Perfect — frame it!'
                : correctCount >= questions.length * 0.6
                  ? 'Solid. One more round?'
                  : 'These cards go back in the pile.'}
            </div>
            <div className="flex items-center justify-center gap-2 mt-5">
              <Button variant="subtle" onClick={restart}>
                <RotateCcw className="w-4 h-4" /> Retake
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={q.id + String(i)}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >
            <div className="text-[15px] font-medium leading-snug mb-4">{q.prompt}</div>
            <div className="space-y-2">
              {q.options.map((opt, o) => {
                const isAnswer = o === q.answer
                const isPicked = o === picked
                return (
                  <button
                    key={o}
                    onClick={() => pick(o)}
                    disabled={picked !== null}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 rounded-xl border text-[13.5px] transition-all',
                      picked === null && 'border-line bg-surface hover:border-accent/50 hover:bg-accent/5',
                      picked !== null && isAnswer && 'border-ok/60 bg-ok/10',
                      picked !== null && isPicked && !isAnswer && 'border-danger/60 bg-danger/10',
                      picked !== null && !isPicked && !isAnswer && 'border-line opacity-55',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex-1">{opt}</span>
                      {picked !== null && isAnswer && <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />}
                      {picked !== null && isPicked && !isAnswer && <XCircle className="w-4 h-4 text-danger shrink-0" />}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={next} disabled={picked === null} size="sm">
                {i + 1 >= questions.length ? 'See results' : 'Next'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
