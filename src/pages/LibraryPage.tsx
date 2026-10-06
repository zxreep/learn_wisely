import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Brain, FileText, Layers3, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { LibraryInput, LibraryItemView } from "../../shared/contracts";
import { api, formatDate, jsonBody } from "../lib/api";
import { queryClient } from "../lib/query";
import { Dialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage, LoadingBlock } from "../components/Status";
import { PageHeader } from "../components/PageHeader";

const icons = { note: FileText, deck: Layers3, quiz: Brain };
const labels = { note: "Note", deck: "Flashcard deck", quiz: "Quiz" };

export function LibraryPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | LibraryInput["type"]>("all");
  const [editor, setEditor] = useState<LibraryItemView | "new" | null>(null);
  const items = useQuery({ queryKey: ["library"], queryFn: () => api<LibraryItemView[]>("/library") });
  const remove = useMutation({ mutationFn: (id: string) => api(`/library/${id}`, { method: "DELETE" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] }) });
  const filtered = (items.data || []).filter((item) => (type === "all" || item.type === type) && (!query || `${item.title} ${item.subject}`.toLowerCase().includes(query.toLowerCase())));
  return <div className="page">
    <PageHeader eyebrow="Your material" title="Library" description="Notes, flashcards, and quizzes created by you. Nothing is added unless you add it." actions={<button className="button button--primary" onClick={() => setEditor("new")}><Plus size={17} /> New item</button>} />
    <div className="filter-bar glass-panel"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library" aria-label="Search library" /></label><div className="segmented" role="group" aria-label="Library type">{(["all", "note", "deck", "quiz"] as const).map((value) => <button key={value} aria-pressed={type === value} onClick={() => setType(value)}>{value === "all" ? "All" : value === "deck" ? "Decks" : `${value[0].toUpperCase()}${value.slice(1)}s`}</button>)}</div></div>
    {items.isLoading ? <LoadingBlock label="Opening library" /> : items.error ? <ErrorMessage error={items.error} /> : !items.data?.length ? <EmptyState icon={BookOpen} title="Your library is empty" text="Write a note, build a flashcard deck, or make a quiz from what you are learning." action={<button className="button button--primary" onClick={() => setEditor("new")}><Plus size={17} /> Create an item</button>} /> : filtered.length === 0 ? <EmptyState icon={Search} title="No matching material" text="Try another search or filter." /> : <div className="library-grid">{filtered.map((item) => { const Icon = icons[item.type]; const count = item.type === "note" ? `${item.body.trim().split(/\s+/).filter(Boolean).length} words` : item.type === "deck" ? `${item.cards.length} cards` : `${item.questions.length} questions`; return <article className="library-card" key={item.id}><span className={`library-icon library-icon--${item.type}`}><Icon size={20} /></span><div className="library-card-main"><span className="type-label">{labels[item.type]}</span><h2>{item.title}</h2><p>{item.subject || "No subject"} · {count}</p><small>Updated {formatDate(item.updatedAt)}</small></div><div className="library-card-actions"><button className="icon-button" aria-label={`Edit ${item.title}`} onClick={() => setEditor(item)}><Pencil size={16} /></button><button className="icon-button" aria-label={`Delete ${item.title}`} onClick={() => { if (confirm(`Delete “${item.title}”?`)) remove.mutate(item.id); }}><Trash2 size={16} /></button></div></article>; })}</div>}
    <Dialog wide open={Boolean(editor)} onClose={() => setEditor(null)} title={editor === "new" ? "Create study material" : `Edit ${editor?.title || "item"}`}><LibraryEditor item={editor === "new" ? undefined : editor || undefined} onDone={() => { setEditor(null); queryClient.invalidateQueries({ queryKey: ["library"] }); }} /></Dialog>
  </div>;
}

function LibraryEditor({ item, onDone }: { item?: LibraryItemView; onDone: () => void }) {
  const [type, setType] = useState<LibraryInput["type"]>(item?.type || "note");
  const [title, setTitle] = useState(item?.title || "");
  const [subject, setSubject] = useState(item?.subject || "");
  const [body, setBody] = useState(item?.type === "note" ? item.body : "");
  const [cards, setCards] = useState(item?.type === "deck" ? item.cards : [{ id: crypto.randomUUID(), front: "", back: "" }]);
  const [questions, setQuestions] = useState(item?.type === "quiz" ? item.questions : [{ id: crypto.randomUUID(), prompt: "", options: ["", ""], answer: 0 }]);
  const save = useMutation({ mutationFn: (input: LibraryInput) => api<LibraryItemView>(item ? `/library/${item.id}` : "/library", { method: item ? "PUT" : "POST", ...jsonBody(input) }), onSuccess: onDone });
  function submit(event: FormEvent) {
    event.preventDefault();
    const base = { type, title, subject } as any;
    if (type === "note") save.mutate({ ...base, body });
    if (type === "deck") save.mutate({ ...base, cards });
    if (type === "quiz") save.mutate({ ...base, questions });
  }
  return <form className="form-stack material-editor" onSubmit={submit}>
    {!item && <div className="material-types">{(["note", "deck", "quiz"] as const).map((value) => { const Icon = icons[value]; return <button type="button" key={value} aria-pressed={type === value} onClick={() => setType(value)}><Icon size={18} />{labels[value]}</button>; })}</div>}
    <div className="form-grid"><label>Title<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give it a clear name" /></label><label>Subject <span className="optional">optional</span><input maxLength={40} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Biology" /></label></div>
    {type === "note" && <label>Note<textarea className="large-textarea" maxLength={30000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Start writing. Plain text keeps your notes portable and safe." /></label>}
    {type === "deck" && <div className="repeat-editor"><div className="repeat-head"><div><b>Cards</b><small>Use a precise prompt and one clear answer.</small></div><button type="button" className="button button--quiet button--small" onClick={() => setCards([...cards, { id: crypto.randomUUID(), front: "", back: "" }])}><Plus size={15} /> Add card</button></div>{cards.map((card, index) => <div className="repeat-row" key={card.id}><span className="row-number">{index + 1}</span><label>Front<textarea required maxLength={500} value={card.front} onChange={(event) => setCards(cards.map((next) => next.id === card.id ? { ...next, front: event.target.value } : next))} /></label><label>Back<textarea required maxLength={1200} value={card.back} onChange={(event) => setCards(cards.map((next) => next.id === card.id ? { ...next, back: event.target.value } : next))} /></label><button type="button" className="icon-button" disabled={cards.length === 1} aria-label={`Delete card ${index + 1}`} onClick={() => setCards(cards.filter((next) => next.id !== card.id))}><Trash2 size={16} /></button></div>)}</div>}
    {type === "quiz" && <div className="repeat-editor"><div className="repeat-head"><div><b>Questions</b><small>Mark the correct option before saving.</small></div><button type="button" className="button button--quiet button--small" onClick={() => setQuestions([...questions, { id: crypto.randomUUID(), prompt: "", options: ["", ""], answer: 0 }])}><Plus size={15} /> Add question</button></div>{questions.map((question, questionIndex) => <fieldset className="question-editor" key={question.id}><legend>Question {questionIndex + 1}</legend><label>Prompt<input required maxLength={500} value={question.prompt} onChange={(event) => setQuestions(questions.map((next) => next.id === question.id ? { ...next, prompt: event.target.value } : next))} /></label><div className="option-list">{question.options.map((option, optionIndex) => <div key={optionIndex}><input type="radio" name={`answer-${question.id}`} checked={question.answer === optionIndex} onChange={() => setQuestions(questions.map((next) => next.id === question.id ? { ...next, answer: optionIndex } : next))} aria-label={`Mark option ${optionIndex + 1} correct`} /><input required maxLength={240} value={option} onChange={(event) => setQuestions(questions.map((next) => next.id === question.id ? { ...next, options: next.options.map((old, index) => index === optionIndex ? event.target.value : old) } : next))} placeholder={`Option ${optionIndex + 1}`} /><button type="button" className="icon-button icon-button--small" disabled={question.options.length <= 2} aria-label={`Delete option ${optionIndex + 1}`} onClick={() => setQuestions(questions.map((next) => next.id === question.id ? { ...next, options: next.options.filter((_, index) => index !== optionIndex), answer: Math.min(next.answer, next.options.length - 2) } : next))}><Trash2 size={14} /></button></div>)}</div><div className="question-foot"><button type="button" className="text-button" disabled={question.options.length >= 6} onClick={() => setQuestions(questions.map((next) => next.id === question.id ? { ...next, options: [...next.options, ""] } : next))}>+ Add option</button><button type="button" className="text-button text-button--danger" disabled={questions.length === 1} onClick={() => setQuestions(questions.filter((next) => next.id !== question.id))}>Delete question</button></div></fieldset>)}</div>}
    <ErrorMessage error={save.error} /><div className="dialog-actions"><button className="button button--primary" disabled={save.isPending}>{save.isPending ? "Saving…" : item ? "Save changes" : `Create ${labels[type].toLowerCase()}`}</button></div>
  </form>;
}
