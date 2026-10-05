import { ArrowRight, BookOpen, Check, MessageCircle, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ErrorMessage } from "../components/Status";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const { login, signup } = useAuth();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined); setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "login") await login({ email: String(data.email), password: String(data.password) });
      else await signup({ name: String(data.name), handle: String(data.handle).toLowerCase(), email: String(data.email), password: String(data.password) });
    } catch (nextError) { setError(nextError); setBusy(false); }
  }
  return <main className="auth-page">
    <section className="auth-story">
      <div className="ambient ambient--one" /><div className="ambient ambient--two" />
      <div className="auth-brand"><img src="/mark.svg" alt="" /><span>learn <b>wisely</b></span></div>
      <div className="auth-copy"><p className="eyebrow"><Sparkles size={14} /> Your study space, made calmer</p><h1>One clear place for the work that matters.</h1><p>Build a study board, keep your own notes, learn with real people, and ask an AI coach that uses your actual study context.</p>
        <ul className="feature-list"><li><BookOpen /><span><b>Your material, not a demo feed</b><small>Every note, deck, quiz, and board starts with you.</small></span></li><li><UsersRound /><span><b>Communities with real members</b><small>No fabricated posts, activity, rankings, or testimonials.</small></span></li><li><MessageCircle /><span><b>Private conversations</b><small>Message classmates by their unique handle.</small></span></li></ul>
      </div>
      <p className="privacy-note"><ShieldCheck size={16} /> Your Groq and MongoDB credentials stay on the server.</p>
    </section>
    <section className="auth-form-wrap">
      <div className="auth-card glass-card">
        <div className="auth-tabs" role="tablist" aria-label="Account action"><button role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(undefined); }}>Create account</button><button role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(undefined); }}>Sign in</button></div>
        <div className="auth-heading"><span className="auth-spark"><Sparkles size={21} /></span><h2>{mode === "signup" ? "Make room for better study" : "Welcome back"}</h2><p>{mode === "signup" ? "Start empty, then shape the desk around how you learn." : "Your board and conversations are waiting."}</p></div>
        <form onSubmit={submit} className="form-stack">
          {mode === "signup" && <div className="form-grid"><label>Full name<input name="name" autoComplete="name" required maxLength={60} placeholder="Your name" /></label><label>Handle<span className="input-prefix"><span>@</span><input name="handle" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" placeholder="study_handle" /></span></label></div>}
          <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 10 : 1} maxLength={128} placeholder={mode === "signup" ? "At least 10 characters" : "Your password"} /></label>
          {mode === "signup" && <p className="password-hint"><Check size={14} /> Use 10 or more characters. A short passphrase works well.</p>}
          <ErrorMessage error={error} />
          <button className="button button--primary button--large" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create my study space" : "Sign in"}<ArrowRight size={18} /></button>
        </form>
        <p className="auth-switch">{mode === "signup" ? "Already have a space?" : "New to Learn Wisely?"} <button onClick={() => setMode(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Sign in" : "Create an account"}</button></p>
      </div>
    </section>
  </main>;
}
