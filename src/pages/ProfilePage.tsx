import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Award, Clock3, Flame, LogOut, Moon, Save, ShieldCheck, Sun, Target, Trash2, UserRound } from "lucide-react";
import type { ProfileStats, UserView } from "../../shared/contracts";
import { api, formatDate, jsonBody } from "../lib/api";
import { queryClient } from "../lib/query";
import { Avatar } from "../components/Avatar";
import { ErrorMessage, LoadingBlock } from "../components/Status";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";

const colors: UserView["avatarColor"][] = ["gold", "ink", "sage", "plum", "ocean"];

export function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => api<{ user: UserView; stats: ProfileStats }>("/profile") });
  const [saved, setSaved] = useState(false);
  const update = useMutation({ mutationFn: (input: Partial<UserView>) => api<{ user: UserView }>("/profile", { method: "PATCH", ...jsonBody(input) }), onSuccess: async () => { setSaved(true); await refresh(); await queryClient.invalidateQueries({ queryKey: ["profile"] }); setTimeout(() => setSaved(false), 2200); } });
  const deleteAccount = useMutation({ mutationFn: () => api("/profile", { method: "DELETE" }), onSuccess: () => location.assign("/") });
  if (profile.isLoading) return <div className="page"><LoadingBlock label="Loading profile" /></div>;
  const current = profile.data?.user || user!;
  const stats = profile.data?.stats || { totalMinutes: 0, sessions: 0, streak: 0, studiedToday: false, xp: 0 };
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); update.mutate({ name: String(data.get("name")), handle: String(data.get("handle")).toLowerCase(), bio: String(data.get("bio")), dailyGoalMinutes: Number(data.get("goal")) }); }
  return <div className="page profile-page"><PageHeader eyebrow="Your progress" title="Profile" description="The numbers here come only from focus sessions you completed." />
    <section className="profile-hero glass-card"><div className="profile-identity"><Avatar name={current.name} color={current.avatarColor} size={84} /><div><p className="eyebrow">@{current.handle}</p><h2>{current.name}</h2><p>{current.bio || "No bio yet."}</p><small>Learning here since {formatDate(current.createdAt)}</small></div></div><div className="profile-stats"><Stat icon={Clock3} value={`${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`} label="focused" /><Stat icon={Target} value={String(stats.sessions)} label="sessions" /><Stat icon={Flame} value={String(stats.streak)} label="day streak" /><Stat icon={Award} value={String(stats.xp)} label="earned XP" /></div></section>
    <div className="settings-grid"><section className="settings-card"><header><span><UserRound size={18} /></span><div><h2>Profile details</h2><p>Visible to people you study with.</p></div></header><form className="form-stack" onSubmit={submit}><div className="form-grid"><label>Name<input name="name" defaultValue={current.name} required maxLength={60} /></label><label>Handle<span className="input-prefix"><span>@</span><input name="handle" defaultValue={current.handle} required pattern="[a-z0-9_]+" minLength={3} maxLength={24} /></span></label></div><label>Bio <span className="optional">optional</span><textarea name="bio" defaultValue={current.bio} maxLength={240} placeholder="What are you learning?" /></label><label>Daily focus goal<div className="input-suffix"><input name="goal" type="number" min={10} max={240} defaultValue={current.dailyGoalMinutes} /><span>minutes</span></div></label><ErrorMessage error={update.error} /><button className="button button--primary align-start" disabled={update.isPending}><Save size={16} />{update.isPending ? "Saving…" : saved ? "Saved" : "Save details"}</button></form></section>
      <section className="settings-card"><header><span><Sun size={18} /></span><div><h2>Appearance</h2><p>A lighter liquid-glass surface with your choice of contrast.</p></div></header><div className="setting-block"><label>Theme</label><div className="theme-options">{(["light", "dark", "system"] as const).map((theme) => <button key={theme} aria-pressed={current.theme === theme} onClick={() => update.mutate({ theme })}>{theme === "light" ? <Sun /> : theme === "dark" ? <Moon /> : <span className="system-icon" />}<b>{theme[0].toUpperCase() + theme.slice(1)}</b></button>)}</div></div><div className="setting-block"><label>Avatar color</label><div className="color-options">{colors.map((color) => <button key={color} className={`color-dot color-dot--${color}`} aria-label={`${color} avatar`} aria-pressed={current.avatarColor === color} onClick={() => update.mutate({ avatarColor: color })} />)}</div></div><label className="switch-row"><span><b>Reduce motion</b><small>Minimize decorative movement.</small></span><input type="checkbox" checked={current.reduceMotion} onChange={(event) => update.mutate({ reduceMotion: event.target.checked })} /></label></section>
      <section className="settings-card settings-card--full"><header><span><ShieldCheck size={18} /></span><div><h2>Account & privacy</h2><p>Your password is hashed. Session cookies are HTTP-only. API credentials never reach this browser.</p></div></header><div className="account-actions"><div><b>{current.email}</b><small>Signed-in email</small></div><button className="button button--quiet" onClick={() => logout()}><LogOut size={16} /> Sign out</button><button className="button button--danger" onClick={() => { if (confirm("Permanently delete your account and study data? Communities you own must be deleted first.")) deleteAccount.mutate(); }}><Trash2 size={16} /> Delete account</button></div><ErrorMessage error={deleteAccount.error} /></section></div>
  </div>;
}

function Stat({ icon: Icon, value, label }: { icon: typeof Clock3; value: string; label: string }) { return <div><span><Icon size={17} /></span><strong>{value}</strong><small>{label}</small></div>; }
