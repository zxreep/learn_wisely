import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Check, Clock, CloudOff, Crown, DoorOpen, Flame, Headphones, LogIn, MessageSquare,
  Send, Timer, TrendingUp, UserPlus, Users, WifiOff,
} from 'lucide-react'
import { Avatar, Button, Card, Chip, EmptyState, Page, PageHeader, ProgressBar, SectionTitle, Tabs } from '../components/ui'
import { DynIcon } from '../components/icons'
import {
  startHeartbeat, startRoomPolling, stopHeartbeat, stopRoomPolling, useCommunity,
} from '../stores/community'
import { useProgress } from '../stores/progress'
import { useAuth } from '../stores/auth'
import { useFocus } from '../stores/focus'
import { useUi } from '../stores/ui'
import { cn, plural, timeAgo } from '../lib/utils'
import type { ApiPresence } from '../../shared/api'

export default function Community() {
  const [params, setParams] = useSearchParams()
  const roomId = params.get('room')
  const fetchRooms = useCommunity((s) => s.fetchRooms)

  useEffect(() => {
    void fetchRooms()
  }, [fetchRooms])

  if (roomId) return <RoomDetail roomId={roomId} onBack={() => setParams({})} />
  return <CommunityHome onOpenRoom={(id) => setParams({ room: id })} />
}

function CommunityHome({ onOpenRoom }: { onOpenRoom: (id: string) => void }) {
  const { communities, rooms, joinCommunity, leaveCommunity, loading, unreachable } = useCommunity()
  const user = useAuth((s) => s.user)
  const openAuth = useUi((s) => s.openAuth)
  const weekMiss = unreachable && rooms.length === 0
  const [tab, setTab] = useState<'rooms' | 'communities' | 'board'>('rooms')

  return (
    <Page>
      <PageHeader
        title="Communities"
        subtitle="Study feels lighter with witnesses. Every member, message and row below is a real student signed into Wisely."
        actions={
          !user && (
            <Button size="sm" onClick={() => openAuth('Sign in to join rooms, chat and climb the board.')}>
              <LogIn className="w-3.5 h-3.5" /> Sign in to participate
            </Button>
          )
        }
      />
      <Tabs
        options={[
          { value: 'rooms', label: <span className="flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5" /> Study rooms</span> },
          { value: 'communities', label: <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Communities</span> },
          { value: 'board', label: <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Leaderboard</span> },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {weekMiss && (
        <EmptyState
          icon={<WifiOff className="w-6 h-6" />}
          title="Social services offline"
          desc="The sync server isn't reachable from here, so live rooms and communities can't load. Your local workspace is unaffected."
        />
      )}

      {tab === 'rooms' && !weekMiss && (
        <div className="grid sm:grid-cols-2 gap-4">
          {rooms.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 h-full flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0 glass-tint" style={{ color: r.color, ['--tint' as never]: r.color }}>
                    <Headphones className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-[16px]">{r.name}</h3>
                      {r.joined && <Chip color="#2f6b4f"><Check className="w-3 h-3" /> inside</Chip>}
                    </div>
                    <p className="text-[12.5px] text-ink3 mt-0.5">{r.vibe}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-[12px] text-ink3">
                  <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                  <span className="font-semibold text-accent">{r.focusing} focusing</span> · {plural(r.online, 'student')} in the room
                </div>
                <div className="mt-auto flex gap-2 pt-4">
                  <Button size="sm" className="flex-1 sm:flex-none" onClick={() => onOpenRoom(r.id)}>
                    <DoorOpen className="w-3.5 h-3.5" /> {r.joined ? 'Enter room' : 'Peek inside'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
          {rooms.length === 0 && !loading.rooms && <EmptyState title="No rooms yet" className="sm:col-span-2" />}
        </div>
      )}

      {tab === 'communities' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {communities.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 h-full flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={{ backgroundColor: c.color + '22', color: c.color }}>
                    <DynIcon name={c.icon} className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-[16px]">{c.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Chip color={c.color}>{c.category}</Chip>
                      <span className="text-[11.5px] text-ink3">{c.memberCount.toLocaleString()} {c.memberCount === 1 ? 'member' : 'members'}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-ink2 mt-3 leading-snug">{c.description}</p>
                <div className="mt-3 space-y-1.5 min-h-[30px]">
                  {c.activity.length === 0 && <div className="text-[11.5px] text-ink3 italic">No events yet — be the first to join.</div>}
                  {c.activity.slice(0, 2).map((a, j) => (
                    <div key={j} className="text-[11.5px] text-ink3 leading-snug">
                      <span className="font-medium text-ink2">{a.who}</span> {a.what} · {timeAgo(a.at)}
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-4">
                  <Button
                    size="sm"
                    variant={c.joined ? 'subtle' : 'primary'}
                    className="w-full"
                    onClick={() => (c.joined ? void leaveCommunity(c.id) : void joinCommunity(c.id))}
                  >
                    {c.joined ? <><Check className="w-3.5 h-3.5" /> Joined — leave?</> : <><UserPlus className="w-3.5 h-3.5" /> Join community</>}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {tab === 'board' && <Leaderboard />}
    </Page>
  )
}

/* ------------------------------ leaderboard ----------------------------- */
function Leaderboard() {
  const { leaderboard, fetchLeaderboard, loading } = useCommunity()
  const user = useAuth((s) => s.user)
  const weekStreak = useProgress((s) => s.streak)
  const openAuth = useUi((s) => s.openAuth)

  useEffect(() => {
    void fetchLeaderboard()
    const t = setInterval(() => void fetchLeaderboard(), 60_000)
    return () => clearInterval(t)
  }, [fetchLeaderboard])

  const max = leaderboard[0]?.weeklyXp || 1
  const yourRank = user ? leaderboard.findIndex((r) => r.userId === user.id) + 1 : 0

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
      <Card>
        <div className="px-5 py-4 border-b border-line/60 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-display font-semibold text-[16px]">Weekly XP board</h3>
            <div className="text-[12px] text-ink3 mt-0.5">Rolling 7 days · computed server-side from synced workspaces</div>
          </div>
          {user && yourRank > 0 && <Chip color="#c2703e"><Crown className="w-3 h-3" /> you are #{yourRank}</Chip>}
          {user && yourRank === 0 && !loading.leaderboard && (
            <Chip color="#4a8fa3"><CloudOff className="w-3 h-3" /> not ranked yet — sync some XP</Chip>
          )}
        </div>
        <div className="divide-y divide-line/40">
          {leaderboard.map((r, i) => (
            <div key={r.userId} className={cn('flex items-center gap-3 px-5 py-3', r.userId === user?.id && 'bg-accent/5')}>
              <span className={cn('w-6 text-center font-display font-bold text-[15px]', i < 3 ? 'text-accent2' : 'text-ink3')}>
                {i + 1}
              </span>
              <Avatar name={r.name} color={r.color} size={30} />
              <div className="min-w-0 flex-1">
                <div className={cn('text-[13px] truncate', r.userId === user?.id && 'font-bold')}>
                  {r.name}{r.userId === user?.id && ' (you)'}
                </div>
                <ProgressBar value={(r.weeklyXp / max) * 100} color={r.userId === user?.id ? 'rgb(var(--c-accent2))' : 'rgb(var(--c-accent))'} className="mt-1 w-full max-w-[220px]" />
              </div>
              {r.streak > 0 && <Chip className="hidden sm:inline-flex"><Flame className="w-3 h-3 text-accent2" /> {r.streak}</Chip>}
              <span className="text-[13px] font-bold tabular-nums">{r.weeklyXp.toLocaleString()}</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <EmptyState
              title="Board is empty"
              desc="No one has synced XP this week. Sign in, study, and take the top spot."
              action={!user && <Button size="sm" onClick={() => openAuth('Sign in to appear on the leaderboard.')}>Sign in</Button>}
            />
          )}
        </div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Climb the board" />
        <ul className="mt-3 space-y-2.5 text-[12.5px] text-ink2 leading-snug">
          <li className="flex gap-2"><Timer className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" /> Focus minutes: <b>2 XP each</b> — the fastest route to #1.</li>
          <li className="flex gap-2"><Flame className="w-3.5 h-3.5 text-accent2 shrink-0 mt-0.5" /> Keeping a streak multiplies motivation: you're at <b>{weekStreak.current} days</b>.</li>
          <li className="flex gap-2"><Crown className="w-3.5 h-3.5 text-warn shrink-0 mt-0.5" /> Quests pay out up to 200 XP each.</li>
          {!user && <li className="flex gap-2"><LogIn className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" /> <span><b>Sign in</b> so your synced XP actually appears here.</span></li>}
        </ul>
      </Card>
    </div>
  )
}

/* ------------------------------- room detail ---------------------------- */
function RoomDetail({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const { rooms, roomCache, sendMessage, heartbeat } = useCommunity()
  const roomsLoading = useCommunity((s) => s.loading.rooms)
  const user = useAuth((s) => s.user)
  const openAuth = useUi((s) => s.openAuth)
  const setActiveRoom = useFocus((s) => s.setActiveRoom)
  const activeRoomId = useFocus((s) => s.activeRoomId)
  const navigate = useNavigate()
  const room = rooms.find((r) => r.id === roomId)
  const cache = roomCache[roomId]
  const [now, setNow] = useState(Date.now())
  const [msg, setMsg] = useState('')
  const [focusingHere, setFocusingHere] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => void useCommunity.getState().enterRoom(roomId), [roomId])
  useEffect(() => {
    startRoomPolling(roomId)
    return () => stopRoomPolling()
  }, [roomId])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [cache?.messages.length])

  if (!room) {
    return (
      <Page className="max-w-[1100px]">
        <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" /> All communities
        </button>
        {roomsLoading ? (
          <Card className="p-5">
            <div className="flex items-center gap-2.5 text-[13px] text-ink3">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              Waking up the room…
            </div>
          </Card>
        ) : (
          <EmptyState title="Room not found" action={<Link to="/community" className="text-accent hover:underline">Back to communities</Link>} />
        )}
      </Page>
    )
  }

  const presence = cache?.presence ?? []
  const others = presence.filter((p) => p.userId !== user?.id)
  const me = user ? presence.find((p) => p.userId === user.id) : undefined
  const focusingCount = presence.filter((p) => p.focusing).length
  const msgs = cache?.messages ?? []

  const focusHere = () => {
    if (!user) {
      openAuth('Sign in so the room can see you focusing.')
      return
    }
    setActiveRoom(room.id)
    setFocusingHere(true)
    startHeartbeat(room.id, () => {
      const t = useFocus.getState().timer
      return { subject: t.label || 'Focusing with Wisely', focusing: t.running }
    })
    navigate('/focus')
  }

  const stopFocusing = () => {
    setFocusingHere(false)
    if (activeRoomId === room.id) setActiveRoom(null)
    stopHeartbeat()
  }

  const send = async () => {
    if (!msg.trim()) return
    try {
      await sendMessage(room.id, msg.trim())
      setMsg('')
    } catch {
      /* toast already shown */
    }
  }

  return (
    <Page className="max-w-[1100px]">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors">
        <ArrowLeft className="w-4 h-4" /> All communities
      </button>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="grid place-items-center w-12 h-12 rounded-2xl glass-tint" style={{ color: room.color, ['--tint' as never]: room.color }}>
          <Headphones className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[24px] font-semibold tracking-tight leading-tight">{room.name}</h1>
          <div className="text-[13px] text-ink3">{room.vibe}</div>
        </div>
        <Chip color="#2f6b4f"><span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse-soft inline-block" /> {focusingCount} focusing · {plural(presence.length, 'student')} inside</Chip>
        {focusingHere ? (
          <Button variant="subtle" size="sm" onClick={stopFocusing}>
            <LogIn className="w-3.5 h-3.5 rotate-180" /> Leave room presence
          </Button>
        ) : (
          <Button size="sm" onClick={focusHere} variant="primary">
            <Timer className="w-3.5 h-3.5" /> Focus in this room
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        {/* real presence */}
        <Card className="p-5">
          <SectionTitle title="In the room" desc="Live presence refreshes every few seconds — names, subjects and timers are other students right now" />
          <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
            {presence.length === 0 && (
              <div className="sm:col-span-2 rounded-xl border border-line/50 bg-surface2/40 p-5 text-[12.5px] text-ink3 text-center">
                The room is empty. Tap <b>Focus in this room</b> and you'll be the first soul in it.
              </div>
            )}
            {me && (
              <PresenceCard p={me} now={now} you onPing={() => heartbeat(room.id, { subject: me.subject, focusing: me.focusing })} />
            )}
            {others.map((p) => (
              <PresenceCard key={p.userId} p={p} now={now} />
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-surface2/50 border border-line/50 p-3.5 text-[12.5px] text-ink2 leading-relaxed">
            <span className="font-semibold">How rooms work:</span> hit “Focus in this room” and your timer announces you here for the
            session; go quiet for ~90 seconds and you're pruned automatically. Nothing here is simulated.
          </div>
        </Card>

        {/* real chat */}
        <Card className="flex flex-col h-[480px]">
          <div className="px-4 py-3 border-b border-line/60 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span className="font-display font-semibold text-[14.5px]">Room chat</span>
            <span className="ml-auto text-[11px] text-ink3">{msgs.length} message{msgs.length === 1 ? '' : 's'}</span>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            <AnimatePresence initial={false}>
              {msgs.map((m) => {
                const mine = m.userId === user?.id
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2', mine && 'flex-row-reverse')}>
                    <Avatar name={m.who} color={m.color} size={24} className="mt-0.5" />
                    <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug', mine ? 'bg-accent/15 rounded-tr-sm' : 'glass-subtle rounded-tl-sm')}>
                      {!mine && <div className="text-[10px] font-bold mb-0.5" style={{ color: m.color }}>{m.who}</div>}
                      {m.text}
                      <div className="text-[9.5px] text-ink3 mt-1">{timeAgo(m.at)}</div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {msgs.length === 0 && <div className="text-center text-[12px] text-ink3 py-8">Quiet room. The first message of this room is yours to write.</div>}
          </div>
          <div className="p-2.5 border-t border-line/60">
            {user ? (
              <div className="flex gap-1.5">
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder={`Message ${room.name}…`}
                  className="flex-1 h-9 rounded-xl border border-line/60 glass-input px-3 text-[13px] outline-none focus:border-accent/60"
                />
                <Button size="icon" onClick={() => void send()} disabled={!msg.trim()} aria-label="Send">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => openAuth('Sign in to chat in study rooms.')}
                className="w-full h-9 rounded-xl border border-line/60 glass-subtle text-[12.5px] text-ink3 hover:text-ink transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
                Sign in to chat
              </button>
            )}
          </div>
        </Card>
      </div>
    </Page>
  )
}

function PresenceCard({ p, now, you }: { p: ApiPresence; now: number; you?: boolean; onPing?: () => void }) {
  const mins = Math.max(0, Math.round((now - p.since) / 60000))
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-3', p.focusing ? 'border-accent/50 bg-accent/5' : 'border-line/50 bg-surface2/40 opacity-85')}>
      <Avatar name={p.who} color={p.color} size={34} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold truncate">
          {p.who}
          {you && <span className="text-accent"> (you)</span>}
        </div>
        <div className="text-[11px] text-ink3 truncate">{p.subject || 'exploring'}</div>
      </div>
      {p.focusing ? (
        <Chip color="#2f6b4f"><Clock className="w-3 h-3" /> {mins}m</Chip>
      ) : (
        <Chip>present</Chip>
      )}
    </div>
  )
}
