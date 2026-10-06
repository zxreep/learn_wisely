import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckSquare2, ChevronDown, Clock3, FileText, LayoutDashboard, Pause, Play, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { BoardView, Widget } from "../../shared/contracts";
import { WIDGET_LABELS } from "../../shared/constants";
import { api, jsonBody } from "../lib/api";
import { queryClient } from "../lib/query";
import { Dialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage, LoadingBlock } from "../components/Status";

const widgetIcons = { note: FileText, tasks: CheckSquare2, timer: Clock3, countdown: CalendarDays };
const widgetDefaults: Record<Widget["type"], Record<string, unknown>> = {
  note: { text: "" }, tasks: { title: "Tasks", items: [] }, timer: { minutes: 25 }, countdown: { title: "", date: "" },
};

export function BoardPage() {
  const boards = useQuery({ queryKey: ["boards"], queryFn: () => api<BoardView[]>("/boards") });
  const [activeId, setActiveId] = useState<string>();
  const [newOpen, setNewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const active = boards.data?.find((board) => board.id === activeId) || boards.data?.[0];
  const create = useMutation({ mutationFn: (name: string) => api<BoardView>("/boards", { method: "POST", ...jsonBody({ name }) }), onSuccess: async (board) => { await queryClient.invalidateQueries({ queryKey: ["boards"] }); setActiveId(board.id); setNewOpen(false); } });
  const update = useMutation({
    mutationFn: ({ id, value }: { id: string; value: Partial<BoardView> }) => api<BoardView>(`/boards/${id}`, { method: "PATCH", ...jsonBody(value) }),
    scope: { id: "board-save" },
    onMutate: ({ id, value }) => queryClient.setQueryData<BoardView[]>(["boards"], (old) => old?.map((item) => item.id === id ? { ...item, ...value } : item)),
    onSuccess: (board) => queryClient.setQueryData<BoardView[]>(["boards"], (old) => old?.map((item) => item.id === board.id ? board : item)),
    onError: () => queryClient.invalidateQueries({ queryKey: ["boards"] }),
  });
  const remove = useMutation({ mutationFn: (id: string) => api(`/boards/${id}`, { method: "DELETE" }), onSuccess: async () => { setActiveId(undefined); await queryClient.invalidateQueries({ queryKey: ["boards"] }); } });
  function submitBoard(event: FormEvent<HTMLFormElement>) { event.preventDefault(); create.mutate(String(new FormData(event.currentTarget).get("name"))); }
  function addWidget(type: Widget["type"]) {
    if (!active) return;
    const count = active.widgets.length;
    const widget: Widget = { id: crypto.randomUUID(), type, x: (count % 3) * 320, y: Math.floor(count / 3) * 260, w: 300, h: type === "timer" ? 260 : 230, config: structuredClone(widgetDefaults[type]) };
    update.mutate({ id: active.id, value: { widgets: [...active.widgets, widget] } }); setAddOpen(false);
  }
  function updateWidget(id: string, config: Record<string, unknown>) {
    if (!active) return;
    update.mutate({ id: active.id, value: { widgets: active.widgets.map((widget) => widget.id === id ? { ...widget, config } : widget) } });
  }
  function deleteWidget(id: string) { if (active) update.mutate({ id: active.id, value: { widgets: active.widgets.filter((widget) => widget.id !== id) } }); }
  if (boards.isLoading) return <div className="page"><LoadingBlock label="Loading boards" /></div>;
  return <div className="page board-page">
    <header className="board-toolbar glass-panel"><div className="board-title-wrap"><LayoutDashboard size={19} /><div><span className="eyebrow">Study board</span>{active ? <select aria-label="Active board" value={active.id} onChange={(event) => setActiveId(event.target.value)}>{boards.data?.map((board) => <option value={board.id} key={board.id}>{board.name}</option>)}</select> : <strong>No board yet</strong>}</div><ChevronDown size={15} className="select-chevron" /></div><div className="toolbar-actions">{active && <button className="button button--quiet button--small" onClick={() => setAddOpen(true)}><Plus size={16} /> Add widget</button>}<button className="button button--primary button--small" onClick={() => setNewOpen(true)}><Plus size={16} /> New board</button>{active && <button className="icon-button" aria-label="Delete board" title="Delete board" onClick={() => { if (confirm(`Delete “${active.name}”? This cannot be undone.`)) remove.mutate(active.id); }}><Trash2 size={17} /></button>}</div></header>
    {(boards.error || update.error || remove.error) && <ErrorMessage error={boards.error || update.error || remove.error} />}
    {!active ? <EmptyState icon={LayoutDashboard} title="A clear desk to begin" text="Create a board, then add only the tools you need." action={<button className="button button--primary" onClick={() => setNewOpen(true)}><Plus size={17} /> Create your first board</button>} /> : active.widgets.length === 0 ? <div className="board-canvas empty-canvas"><EmptyState icon={Plus} title="This board is ready for you" text="Add a note, task list, focus timer, or countdown. Nothing is pre-filled." action={<button className="button button--primary" onClick={() => setAddOpen(true)}>Add a widget</button>} /></div> : <div className="board-canvas"><div className="widget-grid">{active.widgets.map((widget) => <BoardWidget key={widget.id} widget={widget} onChange={(config) => updateWidget(widget.id, config)} onDelete={() => deleteWidget(widget.id)} />)}</div>{update.isPending && <span className="saving-indicator"><Save size={13} /> Saving…</span>}</div>}
    <Dialog open={newOpen} onClose={() => setNewOpen(false)} title="Create a study board"><form className="form-stack" onSubmit={submitBoard}><label>Board name<input name="name" required maxLength={60} autoFocus placeholder="e.g. Midterm week" /></label><ErrorMessage error={create.error} /><div className="dialog-actions"><button type="button" className="button button--quiet" onClick={() => setNewOpen(false)}>Cancel</button><button className="button button--primary" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create board"}</button></div></form></Dialog>
    <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add to this board"><div className="widget-picker">{(Object.keys(WIDGET_LABELS) as Widget["type"][]).map((type) => { const Icon = widgetIcons[type]; return <button key={type} onClick={() => addWidget(type)}><span><Icon size={21} /></span><div><b>{WIDGET_LABELS[type].title}</b><small>{WIDGET_LABELS[type].description}</small></div></button>; })}</div></Dialog>
  </div>;
}

function BoardWidget({ widget, onChange, onDelete }: { widget: Widget; onChange: (config: Record<string, unknown>) => void; onDelete: () => void }) {
  const Icon = widgetIcons[widget.type];
  return <article className={`board-widget board-widget--${widget.type}`}><header><span className="widget-kind"><Icon size={16} />{WIDGET_LABELS[widget.type].title}</span><button className="icon-button icon-button--small" onClick={onDelete} aria-label={`Delete ${WIDGET_LABELS[widget.type].title}`}><Trash2 size={15} /></button></header>
    {widget.type === "note" && <NoteWidget config={widget.config} onChange={onChange} />}
    {widget.type === "tasks" && <TasksWidget config={widget.config} onChange={onChange} />}
    {widget.type === "timer" && <TimerWidget config={widget.config} onChange={onChange} />}
    {widget.type === "countdown" && <CountdownWidget config={widget.config} onChange={onChange} />}
  </article>;
}

function NoteWidget({ config, onChange }: { config: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const [text, setText] = useState(String(config.text || ""));
  return <textarea className="widget-note" aria-label="Board note" value={text} maxLength={5000} placeholder="Write a thought, formula, or reminder…" onChange={(event) => setText(event.target.value)} onBlur={() => { if (text !== config.text) onChange({ ...config, text }); }} />;
}

function TasksWidget({ config, onChange }: { config: Record<string, any>; onChange: (value: Record<string, unknown>) => void }) {
  const items = Array.isArray(config.items) ? config.items : [];
  const [title, setTitle] = useState(String(config.title || "Tasks"));
  const add = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const text = String(new FormData(form).get("task")).trim(); if (text) { onChange({ ...config, items: [...items, { id: crypto.randomUUID(), text, done: false }] }); form.reset(); } };
  return <div className="task-widget"><input className="plain-title" aria-label="Task list title" value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} onBlur={() => { if (title !== config.title) onChange({ ...config, title }); }} />{items.length === 0 && <p className="widget-empty">No tasks yet.</p>}<ul>{items.map((item: any) => <li key={item.id}><label><input type="checkbox" checked={item.done} onChange={() => onChange({ ...config, items: items.map((next: any) => next.id === item.id ? { ...next, done: !next.done } : next) })} /><span>{item.text}</span></label><button aria-label={`Delete ${item.text}`} onClick={() => onChange({ ...config, items: items.filter((next: any) => next.id !== item.id) })}><Trash2 size={13} /></button></li>)}</ul><form onSubmit={add}><input name="task" maxLength={200} aria-label="New task" placeholder="Add a task" /><button aria-label="Add task"><Plus size={16} /></button></form></div>;
}

function TimerWidget({ config, onChange }: { config: Record<string, any>; onChange: (value: Record<string, unknown>) => void }) {
  const minutes = Number(config.minutes || 25);
  const [remaining, setRemaining] = useState(minutes * 60);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const completionSent = useRef(false);
  useEffect(() => { if (!running) return; const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000); return () => clearInterval(timer); }, [running]);
  useEffect(() => { if (remaining !== 0 || completionSent.current) return; completionSent.current = true; setRunning(false); api("/study-sessions", { method: "POST", ...jsonBody({ durationMinutes: minutes, note: "Focus timer" }) }).then(() => { setMessage(`${minutes} focused minutes logged.`); queryClient.invalidateQueries({ queryKey: ["profile"] }); }).catch((error) => setMessage(error.message)); }, [remaining, minutes]);
  const reset = (next = minutes) => { setRunning(false); setRemaining(next * 60); completionSent.current = false; setMessage(""); };
  return <div className="timer-widget"><div className="timer-face">{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</div><div className="timer-presets">{[15, 25, 45].map((value) => <button key={value} className={minutes === value ? "is-active" : ""} onClick={() => { onChange({ ...config, minutes: value }); reset(value); }}>{value}m</button>)}</div><div className="timer-actions"><button className="button button--primary button--small" onClick={() => setRunning((value) => !value)}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? "Pause" : "Start"}</button><button className="icon-button" onClick={() => reset()} aria-label="Reset timer"><RotateCcw size={16} /></button></div>{message && <p className="timer-message" role="status">{message}</p>}</div>;
}

function CountdownWidget({ config, onChange }: { config: Record<string, any>; onChange: (value: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState(String(config.title || ""));
  const date = config.date ? new Date(`${config.date}T00:00:00`) : null;
  const days = date ? Math.ceil((date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : null;
  return <div className="countdown-widget"><input className="plain-title" aria-label="Countdown title" value={title} maxLength={80} placeholder="What are you counting down to?" onChange={(event) => setTitle(event.target.value)} onBlur={() => { if (title !== config.title) onChange({ ...config, title }); }} /><div className="countdown-number">{days === null ? "—" : Math.max(0, days)}<small>{days === 1 ? "day" : "days"}</small></div><input type="date" aria-label="Countdown date" value={config.date || ""} onChange={(event) => onChange({ ...config, date: event.target.value })} /></div>;
}
