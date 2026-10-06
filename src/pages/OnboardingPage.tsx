import { ArrowLeft, ArrowRight, Check, Clock3, GraduationCap, Sparkles } from "lucide-react";
import { useState } from "react";
import { EXAMS, SUBJECTS } from "../../shared/constants";
import { api, jsonBody } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ErrorMessage } from "../components/Status";

export function OnboardingPage() {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [subjects, setSubjects] = useState<string[]>(user?.subjects || []);
  const [exams, setExams] = useState<string[]>(user?.exams || []);
  const [goal, setGoal] = useState(user?.dailyGoalMinutes || 30);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const toggle = (value: string, list: string[], setter: (next: string[]) => void) => setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  async function finish() {
    setBusy(true); setError(undefined);
    try { await api("/profile", { method: "PATCH", ...jsonBody({ subjects, exams, dailyGoalMinutes: goal, onboarded: true }) }); await refresh(); }
    catch (nextError) { setError(nextError); setBusy(false); }
  }
  return <main className="onboarding-page">
    <header className="onboarding-brand"><img src="/mark.svg" alt="" /><span>learn <b>wisely</b></span><span className="step-count">{step + 1} / 3</span></header>
    <div className="onboarding-progress"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
    <section className="onboarding-card glass-card">
      {step === 0 && <><span className="onboarding-icon"><GraduationCap /></span><p className="eyebrow">Shape your space</p><h1>What are you learning?</h1><p className="page-description">Choose what belongs on your desk now. You can change this any time.</p><div className="choice-grid">{SUBJECTS.map((subject) => <button key={subject} className={subjects.includes(subject) ? "is-selected" : ""} aria-pressed={subjects.includes(subject)} onClick={() => toggle(subject, subjects, setSubjects)}>{subjects.includes(subject) && <Check size={15} />}{subject}</button>)}</div></>}
      {step === 1 && <><span className="onboarding-icon"><Sparkles /></span><p className="eyebrow">Give it context</p><h1>Are you preparing for something?</h1><p className="page-description">Optional. This helps your coach make suggestions that fit your goal.</p><div className="choice-grid">{EXAMS.map((exam) => <button key={exam} className={exams.includes(exam) ? "is-selected" : ""} aria-pressed={exams.includes(exam)} onClick={() => toggle(exam, exams, setExams)}>{exams.includes(exam) && <Check size={15} />}{exam}</button>)}</div></>}
      {step === 2 && <><span className="onboarding-icon"><Clock3 /></span><p className="eyebrow">Keep it realistic</p><h1>Your daily focus goal</h1><p className="page-description">A goal should be small enough to repeat. Only completed timers count.</p><div className="goal-picker"><strong>{goal}</strong><span>minutes a day</span><input aria-label="Daily focus goal in minutes" type="range" min="10" max="120" step="5" value={goal} onChange={(event) => setGoal(Number(event.target.value))} /><div><span>10 min</span><span>2 hours</span></div></div><div className="honesty-callout"><Check size={18} /><p><b>Your space begins honestly empty.</b><br />No fake classmates, pre-filled activity, or invented progress.</p></div></>}
      <ErrorMessage error={error} />
      <footer className="onboarding-actions"><button className="button button--quiet" disabled={step === 0 || busy} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17} /> Back</button>{step < 2 ? <button className="button button--primary" onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight size={17} /></button> : <button className="button button--primary" disabled={busy} onClick={finish}>{busy ? "Saving…" : "Open my desk"}<ArrowRight size={17} /></button>}</footer>
    </section>
  </main>;
}
