import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Check, Clock, Crown, DoorOpen, Flame, Headphones, LogIn, MessageSquare,
  Send, Timer, TrendingUp, UserPlus, Users,
} from 'lucide-react'
import { Avatar, Button, Card, Chip, EmptyState, Page, PageHeader, ProgressBar, SectionTitle, Tabs } from '../components/ui'
import { DynIcon } from '../components/icons'
import { useCommunity, LEADERBOARD_PEOPLE, randomChatter } from '../stores/community'
import { useProgress } from '../stores/progress'
import { useSettings } from '../stores/settings'
import { useFocus } from '../stores/focus'
import { cn, plural, timeAgo, uid } from '../lib/utils'
import type { StudyRoom } from '../lib/types'

export default function Community() {
  const [params, setParams] = useSearchParams()
  const roomId = params.get('room')
  if (roomId) return <RoomDetail roomId={roomId} onBack={() => setParams({})} />
  return <CommunityHome onOpenRoom={(id) => setParams({ room: id })} />
}

function CommunityHome({ onOpenRoom }: { onOpenRoom: (id: string) => void }) {
  const { communities, rooms, toggleJoinCommunity } = useCommunity()
  const [tab, setTab] = useState<'rooms' | 'communities' | 'board'>('rooms')

  return (
    <Page>
      <PageHeader
        title="Communities"
        subtitle="Study feels lighter with witnesses. Join circles, drop into rooms, climb the board."
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

      {tab === 'rooms' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {rooms.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 h-full flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={{ backgroundColor: r.color + '22', color: r.color }}>
                    <Headphones className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-[16px]">{r.name}</h3>
                      {r.joined && <Chip color="#2f6b4f"><Check className="w-3 h-3" /> joined</Chip>}
                    </div>
                    <p className="text-[12.5px] text-ink3 mt-0.5">{r.vibe}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex -space-x-2">
                    {r.members.slice(0, 5).map((m) => (
                      <Avatar key={m.id} name={m.name} color={m.color} size={26} className="ring-2 ring-surface" />
                    ))}
                  </div>
                  <span className="text-[12px] text-ink3">
                    <span className="font-semibold text-accent">{r.members.filter((m) => m.status === 'focusing').length} focusing</span> · {plural(r.members.length, 'student')} inside
                  </span>
                </div>
                <div className="mt-auto flex gap-2 pt-4">
                  <Button size="sm" className="flex-1 sm:flex-none" onClick={() => onOpenRoom(r.id)}>
                    <DoorOpen className="w-3.5 h-3.5" /> {r.joined ? 'Enter room' : 'Peek inside'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
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
                      <span className="text-[11.5px] text-ink3">{c.members.toLocaleString()} members</span>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-ink2 mt-3 leading-snug">{c.description}</p>
                <div className="mt-3 space-y-1.5">
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
                    onClick={() => toggleJoinCommunity(c.id)}
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
  const { weeklyXp, streak } = useProgress()
  const name = useSettings((s) => s.name)

  const rows = useMemo(() => {
    const all = [...LEADERBOARD_PEOPLE, { id: 'you', name: `${name} (you)`, color: '#2f6b4f', weeklyXp: weeklyXp(), you: true }]
    return all.sort((a, b) => b.weeklyXp - a.weeklyXp)
  }, [weeklyXp, name])

  const max = rows[0]?.weeklyXp || 1
  const yourRank = rows.findIndex((r) => r.you) + 1

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
      <Card>
        <div className="px-5 py-4 border-b border-line/70 flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-[16px]">Weekly XP board</h3>
            <div className="text-[12px] text-ink3 mt-0.5">Resets Monday · your XP is live from your own activity</div>
          </div>
          <Chip color="#c2703e"><Crown className="w-3 h-3" /> you are #{yourRank}</Chip>
        </div>
        <div className="divide-y divide-line/50">
          {rows.map((r, i) => (
            <div key={r.id} className={cn('flex items-center gap-3 px-5 py-3', r.you && 'bg-accent/6 bg-accent/5')}>
              <span className={cn('w-6 text-center font-display font-bold text-[15px]', i < 3 ? 'text-accent2' : 'text-ink3')}>
                {i + 1}
              </span>
              <Avatar name={r.name.replace(' (you)', '')} color={r.color} size={30} />
              <div className="min-w-0 flex-1">
                <div className={cn('text-[13px] truncate', r.you && 'font-bold')}>{r.name}</div>
                <ProgressBar value={(r.weeklyXp / max) * 100} color={r.you ? 'rgb(var(--c-accent2))' : 'rgb(var(--c-accent))'} className="mt-1 w-full max-w-[220px]" />
              </div>
              <span className="text-[13px] font-bold tabular-nums">{r.weeklyXp.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Climb the board" />
        <ul className="mt-3 space-y-2.5 text-[12.5px] text-ink2 leading-snug">
          <li className="flex gap-2"><Timer className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" /> Focus minutes: <b>2 XP each</b> — the fastest route to #1.</li>
          <li className="flex gap-2"><Flame className="w-3.5 h-3.5 text-accent2 shrink-0 mt-0.5" /> Keeping a streak multiplies motivation: you're at <b>{streak.current} days</b>.</li>
          <li className="flex gap-2"><Crown className="w-3.5 h-3.5 text-warn shrink-0 mt-0.5" /> Quests pay out up to 200 XP each.</li>
        </ul>
      </Card>
    </div>
  )
}

/* ------------------------------ room detail ----------------------------- */
function RoomDetail({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const { rooms, chats, toggleJoinRoom, sendMessage, receiveMessage } = useCommunity()
  const name = useSettings((s) => s.name)
  const setActiveRoom = useFocus((s) => s.setActiveRoom)
  const activeRoomId = useFocus((s) => s.activeRoomId)
  const navigate = useNavigate()
  const room = rooms.find((r) => r.id === roomId)
  const [tick, setTick] = useState(0)
  const [msg, setMsg] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  // tick member timers every 30s of visibility + ambient chatter
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!room) return
    const t = setInterval(() => {
      if (Math.random() < 0.4) {
        const c = randomChatter()
        receiveMessage(room.id, c)
      }
    }, 14000)
    return () => clearInterval(t)
  }, [room, receiveMessage])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [chats[roomId]?.length, roomId])

  if (!room) {
    return (
      <Page>
        <EmptyState title="Room not found" action={<Link to="/community" className="text-accent hover:underline">Back to communities</Link>} />
      </Page>
    )
  }

  const msgs = chats[room.id] ?? []
  const focusing = room.members.filter((m) => m.status === 'focusing').length + (activeRoomId === room.id ? 1 : 0)

  const send = () => {
    if (!msg.trim()) return
    sendMessage(room.id, msg.trim())
    setMsg('')
  }

  return (
    <Page className="max-w-[1100px]">
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-[13px] text-ink3 hover:text-ink transition-colors">
        <ArrowLeft className="w-4 h-4" /> All communities
      </button>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="grid place-items-center w-12 h-12 rounded-2xl" style={{ backgroundColor: room.color + '22', color: room.color }}>
          <Headphones className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[24px] font-semibold tracking-tight leading-tight">{room.name}</h1>
          <div className="text-[13px] text-ink3">{room.vibe}</div>
        </div>
        <Chip color="#2f6b4f"><span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse-soft inline-block" /> {focusing} focusing now</Chip>
        <Button variant={room.joined ? 'subtle' : 'outline'} size="sm" onClick={() => toggleJoinRoom(room.id)}>
          {room.joined ? <><Check className="w-3.5 h-3.5" /> Joined</> : <><LogIn className="w-3.5 h-3.5" /> Join room</>}
        </Button>
        <Button
          size="sm"
          onClick={() => { setActiveRoom(room.id); navigate('/focus') }}
          variant="primary"
        >
          <Timer className="w-3.5 h-3.5" /> Focus in this room
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        {/* members */}
        <Card className="p-5">
          <SectionTitle title="In the room" desc={`tick ${tick + 1} · presence simulates a synced session room`} />
          <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
            {activeRoomId === room.id && (
              <div className="flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/5 p-3">
                <Avatar name={name} color="#2f6b4f" size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{name} (you)</div>
                  <div className="text-[11px] text-accent font-medium">focusing in Wisely</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
              </div>
            )}
            {room.members.map((m) => (
              <div key={m.id} className={cn('flex items-center gap-3 rounded-xl border p-3', m.status === 'focusing' ? 'border-line/70 bg-surface' : 'border-line/50 bg-surface2/40 opacity-80')}>
                <Avatar name={m.name} color={m.color} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate">{m.name}</div>
                  <div className="text-[11px] text-ink3 truncate">{m.subject}</div>
                </div>
                {m.status === 'focusing' ? (
                  <Chip color="#2f6b4f"><Clock className="w-3 h-3" /> {m.focusingMin + tick}m</Chip>
                ) : (
                  <Chip>{m.status}</Chip>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-surface2/50 border border-line/60 p-3.5 text-[12.5px] text-ink2 leading-relaxed">
            <span className="font-semibold">How rooms work:</span> join, hit “Focus in this room”, and your timer shows up here.
            Roommates' presence is mirrored so a full room still works when you're offline — sync catches up later.
          </div>
        </Card>

        {/* chat */}
        <Card className="flex flex-col h-[480px]">
          <div className="px-4 py-3 border-b border-line/70 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span className="font-display font-semibold text-[14.5px]">Room chat</span>
            <span className="ml-auto text-[11px] text-ink3">{msgs.length} messages</span>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {msgs.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2', m.self && 'flex-row-reverse')}>
                <Avatar name={m.who} color={m.color} size={24} className="mt-0.5" />
                <div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug', m.self ? 'bg-accent/15 rounded-tr-sm' : 'bg-surface2 rounded-tl-sm')}>
                  {!m.self && <div className="text-[10px] font-bold mb-0.5" style={{ color: m.color }}>{m.who}</div>}
                  {m.text}
                  <div className="text-[9.5px] text-ink3 mt-1">{timeAgo(m.at)}</div>
                </div>
              </motion.div>
            ))}
            {msgs.length === 0 && <div className="text-center text-[12px] text-ink3 py-8">Quiet room. Say hi — someone usually answers.</div>}
          </div>
          <div className="p-2.5 border-t border-line/70 flex gap-1.5">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={`Message ${room.name}…`}
              className="flex-1 h-9 rounded-xl border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent/60"
            />
            <Button size="icon" onClick={send} disabled={!msg.trim()} aria-label="Send">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </Page>
  )
}
