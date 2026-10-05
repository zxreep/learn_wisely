import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, MessagesSquare, Plus, Search, Send, UsersRound } from "lucide-react";
import type { ConversationView, MessageView } from "../../shared/contracts";
import { api, formatRelative, jsonBody } from "../lib/api";
import { queryClient } from "../lib/query";
import { Avatar } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage, LoadingBlock } from "../components/Status";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";

export function ChatsPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>();
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: () => api<ConversationView[]>("/conversations"), refetchInterval: 10_000 });
  const resolvedSelectedId = selectedId === undefined ? conversations.data?.[0]?.id : selectedId || undefined;
  const selected = conversations.data?.find((conversation) => conversation.id === resolvedSelectedId);
  const filtered = (conversations.data || []).filter((conversation) => !query || conversation.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="page chat-page"><PageHeader eyebrow="Private study conversations" title="Chats" description="Start a direct or group chat using real account handles." actions={<button className="button button--primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> New chat</button>} />
    <div className={`chat-layout glass-card ${selected ? "has-selection" : ""}`}>
      <aside className="conversation-list"><label className="search-field"><Search size={16} /><input aria-label="Search chats" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" /></label>{conversations.isLoading ? <LoadingBlock /> : conversations.error ? <ErrorMessage error={conversations.error} /> : conversations.data?.length === 0 ? <div className="mini-empty"><MessageCircle /><b>No conversations</b><p>Start one with a classmate's handle.</p><button className="button button--quiet button--small" onClick={() => setCreateOpen(true)}>New chat</button></div> : <div className="conversation-scroll">{filtered.map((conversation) => <button key={conversation.id} className={conversation.id === resolvedSelectedId ? "is-active" : ""} onClick={() => setSelectedId(conversation.id)}>{conversation.type === "group" ? <span className="group-avatar"><UsersRound size={17} /></span> : <Avatar name={conversation.name} color={conversation.participants.find((person) => person.id !== user!.id)?.avatarColor || "gold"} size={38} />}<span><b>{conversation.name}</b><small>{conversation.lastMessage?.body || "No messages yet"}</small></span>{conversation.lastMessage && <time>{formatRelative(conversation.lastMessage.createdAt)}</time>}</button>)}</div>}</aside>
      <section className="conversation-panel">{selected ? <Conversation conversation={selected} currentUserId={user!.id} onBack={() => setSelectedId(null)} /> : <EmptyState icon={MessagesSquare} title="Choose a conversation" text="Messages from the selected chat will appear here." />}</section>
    </div><Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Start a conversation"><CreateConversation onDone={(id) => { setCreateOpen(false); queryClient.invalidateQueries({ queryKey: ["conversations"] }); setSelectedId(id); }} /></Dialog></div>;
}

function CreateConversation({ onDone }: { onDone: (id: string) => void }) {
  const [type, setType] = useState<"direct" | "group">("direct");
  const create = useMutation({ mutationFn: (input: { type: "direct" | "group"; name?: string; handles: string[] }) => api<{ id: string }>("/conversations", { method: "POST", ...jsonBody(input) }), onSuccess: (data) => onDone(data.id) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const handles = String(data.get("handles")).split(/[\s,]+/).map((value) => value.replace(/^@/, "").trim().toLowerCase()).filter(Boolean); create.mutate({ type, name: String(data.get("name") || ""), handles }); }
  return <form className="form-stack" onSubmit={submit}><div className="material-types"><button type="button" aria-pressed={type === "direct"} onClick={() => setType("direct")}><MessageCircle size={18} /> Direct</button><button type="button" aria-pressed={type === "group"} onClick={() => setType("group")}><UsersRound size={18} /> Group</button></div>{type === "group" && <label>Group name<input name="name" required maxLength={60} placeholder="e.g. Friday review" /></label>}<label>{type === "direct" ? "Their handle" : "Member handles"}<input name="handles" required placeholder={type === "direct" ? "@study_friend" : "@sam, @mia, @noah"} /><small>{type === "direct" ? "Enter one exact handle." : "Separate handles with commas. You will be added automatically."}</small></label><ErrorMessage error={create.error} /><div className="dialog-actions"><button className="button button--primary" disabled={create.isPending}>{create.isPending ? "Starting…" : "Start chat"}</button></div></form>;
}

function Conversation({ conversation, currentUserId, onBack }: { conversation: ConversationView; currentUserId: string; onBack: () => void }) {
  const messages = useQuery({ queryKey: ["messages", conversation.id], queryFn: () => api<MessageView[]>(`/conversations/${conversation.id}/messages`), refetchInterval: 5_000 });
  const send = useMutation({ mutationFn: (body: string) => api<MessageView>(`/conversations/${conversation.id}/messages`, { method: "POST", ...jsonBody({ body }) }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] }); await queryClient.invalidateQueries({ queryKey: ["conversations"] }); } });
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.data?.length]);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const body = String(new FormData(form).get("body")); send.mutate(body, { onSuccess: () => form.reset() }); }
  return <div className="conversation"><header><button className="icon-button mobile-only" onClick={onBack} aria-label="Back to conversations"><ArrowLeft size={18} /></button>{conversation.type === "group" ? <span className="group-avatar"><UsersRound size={18} /></span> : <Avatar name={conversation.name} size={38} />}<div><h2>{conversation.name}</h2><span>{conversation.type === "group" ? `${conversation.participants.length} members` : `@${conversation.participants.find((person) => person.id !== currentUserId)?.handle || "conversation"}`}</span></div></header><div className="message-list" aria-live="polite">{messages.isLoading ? <LoadingBlock label="Loading messages" /> : messages.error ? <ErrorMessage error={messages.error} /> : messages.data?.length === 0 ? <div className="mini-empty"><MessageCircle /><b>No messages yet</b><p>Say hello or share what you are working on.</p></div> : messages.data?.map((message, index) => { const showAuthor = !message.mine && (index === 0 || messages.data[index - 1].author.id !== message.author.id); return <div className={`message-row ${message.mine ? "is-mine" : ""}`} key={message.id}>{!message.mine && <Avatar name={message.author.name} color={message.author.avatarColor} size={28} />}<div>{showAuthor && <span className="message-author">{message.author.name}</span>}<p>{message.body}</p><time>{formatRelative(message.createdAt)}</time></div></div>; })}<div ref={endRef} /></div><form className="message-composer" onSubmit={submit}><input name="body" required maxLength={3000} autoComplete="off" aria-label="Message" placeholder="Write a message" /><button className="icon-button icon-button--gold" aria-label="Send message" disabled={send.isPending}><Send size={18} /></button></form><ErrorMessage error={send.error} /></div>;
}
