import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Send, Sparkles, Trash2 } from "lucide-react";
import type { CoachMessageView } from "../../shared/contracts";
import { COACH_STARTERS } from "../../shared/constants";
import { api, jsonBody } from "../lib/api";
import { queryClient } from "../lib/query";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage, LoadingBlock } from "../components/Status";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";

export function CoachPage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const messages = useQuery({ queryKey: ["coach-messages"], queryFn: () => api<CoachMessageView[]>("/coach/messages") });
  const send = useMutation({ mutationFn: (message: string) => api<CoachMessageView[]>("/coach/messages", { method: "POST", ...jsonBody({ message }) }), onSuccess: (next) => { queryClient.setQueryData<CoachMessageView[]>(["coach-messages"], (old) => [...(old || []), ...next]); setDraft(""); } });
  const clear = useMutation({ mutationFn: () => api("/coach/messages", { method: "DELETE" }), onSuccess: () => queryClient.setQueryData(["coach-messages"], []) });
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.data?.length, send.isPending]);
  function submit(event: FormEvent) { event.preventDefault(); if (draft.trim()) send.mutate(draft.trim()); }
  return <div className="page coach-page"><PageHeader eyebrow="AI study support" title="Coach" description="Wisely uses your profile and recent library items to give grounded study guidance." actions={Boolean(messages.data?.length) && <button className="button button--quiet button--small" onClick={() => { if (confirm("Clear your coach conversation?")) clear.mutate(); }}><Trash2 size={15} /> Clear</button>} />
    <div className="coach-layout"><section className="coach-chat glass-card"><header><span className="coach-orb"><Sparkles size={20} /></span><div><b>Wisely</b><small>Powered by Groq · can make mistakes</small></div><span className="live-dot">Ready</span></header><div className="coach-messages">{messages.isLoading ? <LoadingBlock label="Opening conversation" /> : messages.error ? <ErrorMessage error={messages.error} /> : !messages.data?.length ? <EmptyState icon={Bot} title="What should we work on?" text="Ask for a plan, an explanation, or a quiz based on material you have actually saved." /> : messages.data.map((message) => <div key={message.id} className={`coach-message coach-message--${message.role}`}>{message.role === "assistant" ? <span className="coach-mini"><Sparkles size={15} /></span> : <Avatar name={user!.name} color={user!.avatarColor} size={30} />}<div><span>{message.role === "assistant" ? "Wisely" : "You"}</span><p>{message.content}</p></div></div>)}{send.isPending && <div className="coach-message coach-message--assistant"><span className="coach-mini"><Sparkles size={15} /></span><div><span>Wisely</span><p className="thinking"><i /><i /><i /></p></div></div>}<div ref={endRef} /></div><form className="coach-composer" onSubmit={submit}><textarea aria-label="Message the coach" value={draft} onChange={(event) => setDraft(event.target.value)} required maxLength={3000} placeholder="Ask about your study plan or saved material…" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button className="icon-button icon-button--gold" aria-label="Send to coach" disabled={send.isPending || !draft.trim()}><Send size={18} /></button></form><ErrorMessage error={send.error || clear.error} /></section>
      <aside className="coach-sidebar"><div className="side-card"><p className="eyebrow">Try asking</p>{COACH_STARTERS.map((starter) => <button key={starter} onClick={() => setDraft(starter)}>{starter}</button>)}</div><div className="side-card coach-trust"><Bot size={18} /><h2>Grounded in your desk</h2><p>The coach receives your subjects, goals, and a small excerpt of recent notes. It never receives your password or private chats.</p><p>Do not rely on AI for medical, legal, or high-stakes decisions.</p></div></aside></div>
  </div>;
}
