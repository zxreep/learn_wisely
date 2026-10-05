import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMsg, Community, StudyRoom } from '../lib/types'
import { uid } from '../lib/utils'
import { seedCommunities, seedRooms, LEADERBOARD_PEOPLE } from '../lib/seed'
import { useProgress } from './progress'
import { useSync } from './sync'
import { useSettings } from './settings'

export { LEADERBOARD_PEOPLE }

const CHATTER = [
  'anyone else on pomodoro 3 tonight?',
  'just finished ch. 7 flashcards 🎉',
  'quick question — how do you annotate pdfs in here?',
  'the 25/5 rhythm honestly works so well',
  'reminder: past paper thread tomorrow at 6pm',
  'switching to flashcards for my next block',
  'good sprint everyone, break time ☕',
  'day 9 of the streak, not breaking it now',
  'posted my mitosis diagram in the resources tab',
  'can someone explain chain rule like I’m five',
  'earned the Deep Diver badge today!!',
  'putting my phone in the other room, brb',
]

const CHATTERS = [
  { who: 'Yuki', color: '#5b7fb0' },
  { who: 'Amara', color: '#a35d8a' },
  { who: 'Lena', color: '#3f7d58' },
  { who: 'Raj', color: '#96762f' },
  { who: 'Sofia', color: '#c2703e' },
]

const REPLIES = [
  'nice work!',
  'same here honestly',
  'good luck 🔥',
  'you’ve got this',
  'solid plan',
  '💪',
]

interface CommunityState {
  communities: Community[]
  rooms: StudyRoom[]
  chats: Record<string, ChatMsg[]>

  toggleJoinCommunity: (id: string) => void
  toggleJoinRoom: (id: string) => void
  sendMessage: (roomId: string, text: string) => void
  receiveMessage: (roomId: string, msg: Omit<ChatMsg, 'id' | 'at'>) => void
}

export const useCommunity = create<CommunityState>()(
  persist(
    (set, get) => ({
      communities: seedCommunities(),
      rooms: seedRooms(),
      chats: {
        'room-library': [
          { id: uid('msg'), who: 'Sofia', color: '#c2703e', text: '2 more sessions and I’m done with art history for the week', at: Date.now() - 840000 },
          { id: uid('msg'), who: 'Ben', color: '#3f7d58', text: 'strong. I’m on problem sets until 10', at: Date.now() - 600000 },
        ],
      },

      toggleJoinCommunity: (id) => {
        const c = get().communities.find((x) => x.id === id)
        if (!c) return
        const joining = !c.joined
        set((s) => ({
          communities: s.communities.map((x) =>
            x.id === id
              ? {
                  ...x,
                  joined: joining,
                  members: x.members + (joining ? 1 : -1),
                  activity: joining
                    ? [{ who: 'You', what: 'joined the community', at: Date.now() }, ...x.activity].slice(0, 8)
                    : x.activity,
                }
              : x,
          ),
        }))
        if (joining) useProgress.getState().track('communities-joined', 1, { label: `Joined ${c.name}` })
        useSync.getState().markDirty()
      },

      toggleJoinRoom: (id) => {
        set((s) => ({
          rooms: s.rooms.map((r) => (r.id === id ? { ...r, joined: !r.joined } : r)),
        }))
        useSync.getState().markDirty()
      },

      sendMessage: (roomId, text) => {
        const msg: ChatMsg = { id: uid('msg'), who: useSettings.getState().name, color: '#7ebb97', text, at: Date.now(), self: true }
        set((s) => ({ chats: { ...s.chats, [roomId]: [...(s.chats[roomId] ?? []), msg] } }))
        // occasionally someone reacts after a moment
        if (Math.random() < 0.85) {
          const who = CHATTERS[Math.floor(Math.random() * CHATTERS.length)]
          const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)]
          setTimeout(() => get().receiveMessage(roomId, { who: who.who, color: who.color, text: reply }), 1600 + Math.random() * 2400)
        }
        useSync.getState().markDirty()
      },

      receiveMessage: (roomId, msg) => {
        set((s) => ({
          chats: { ...s.chats, [roomId]: [...(s.chats[roomId] ?? []), { ...msg, id: uid('msg'), at: Date.now() }] },
        }))
      },
    }),
    { name: 'wisely-community', version: 1 },
  ),
)

/** ambient chatter generator used by the room page */
export function randomChatter(): { who: string; color: string; text: string } {
  const who = CHATTERS[Math.floor(Math.random() * CHATTERS.length)]
  return { who: who.who, color: who.color, text: CHATTER[Math.floor(Math.random() * CHATTER.length)] }
}
