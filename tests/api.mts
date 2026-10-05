/* Full API e2e: auth, workspace sync (LWW), communities, rooms, chat,
   presence, leaderboard, AI-unavailable path — run in Node with MemoryStorage. */
import { buildApp } from '/home/user/learn_wisely/worker/app.ts'
import { MemoryStorage } from '/home/user/learn_wisely/worker/storage.ts'

let pass = 0, fail = 0
function ok(cond: unknown, label: string) {
  if (cond) { pass++; console.log('  ok:', label) }
  else { fail++; console.error('  FAIL:', label) }
}

const storage = new MemoryStorage()
const app = buildApp(storage, { /* no GROQ_API_KEY on purpose */ })

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await app.request(`http://localhost${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  let json: any = null
  try { json = await res.json() } catch { /* ignore */ }
  return { status: res.status, json }
}

const todayKey = (offset = 0) => {
  const d = new Date(Date.now() - offset * 86400_000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

const workspace = (xp: number, streak = 2) => ({
  updatedAt: 1000, deviceId: 'dev1', deviceName: 'test rig',
  data: { progress: { activity: { [todayKey()]: { xp } }, streak: { current: streak } } },
})

/* ------------------------------- auth --------------------------------- */
const s1 = await call('POST', '/api/auth/signup', { body: { name: 'Alice', password: 'pass1', color: '#11aa55' } })
ok(s1.status === 201 && s1.json.token, 'signup Alice → 201 + token')
const alice = s1.json.token as string
ok(s1.json.user.color === '#11aa55', 'signup stored color')

const dup = await call('POST', '/api/auth/signup', { body: { name: 'alice', password: 'pass2' } })
ok(dup.status === 409, 'duplicate name (case-insensitive) → 409')

const badName = await call('POST', '/api/auth/signup', { body: { name: 'x', password: 'pw' } })
ok(badName.status === 400, 'short name rejected')

const badLogin = await call('POST', '/api/auth/login', { body: { name: 'Alice', password: 'wrongpw' } })
ok(badLogin.status === 401, 'wrong password → 401')
const goodLogin = await call('POST', '/api/auth/login', { body: { name: 'ALICE', password: 'pass1' } })
ok(goodLogin.status === 200 && goodLogin.json.token, 'login case-insensitive → token')

const me = await call('GET', '/api/auth/me', { token: alice })
ok(me.json?.user?.name === 'Alice', 'me returns user')
const meBad = await call('GET', '/api/auth/me')
ok(meBad.status === 401, 'me without token → 401')

const prof = await call('PATCH', '/api/me', { token: alice, body: { name: 'Alice W', color: '#ff0000', bio: 'bio ' } })
ok(prof.status === 200 && prof.json.user.name === 'Alice W' && prof.json.user.color === '#ff0000', 'profile patch')

/* ----------------------------- workspace ------------------------------ */
const put = await call('PUT', '/api/workspace', { token: alice, body: workspace(120) })
ok(put.json?.applied === true, 'workspace push applied')
const putOlder = await call('PUT', '/api/workspace', { token: alice, body: { ...workspace(10), updatedAt: 500 } })
ok(putOlder.json?.applied === false && putOlder.json?.currentUpdatedAt === 1000, 'older push rejected (LWW guard)')
const pull = await call('GET', '/api/workspace', { token: alice })
ok(pull.json?.workspace?.data?.progress?.activity?.[todayKey()]?.xp === 120, 'workspace pull round-trips data')
const wsGuest = await call('GET', '/api/workspace')
ok(wsGuest.status === 401, 'workspace requires auth')

/* --------------------------- second user ------------------------------ */
const s2 = await call('POST', '/api/auth/signup', { body: { name: 'Bob', password: 'pass2', color: '#2266cc' } })
const bob = s2.json.token as string
await call('PUT', '/api/workspace', { token: bob, body: { ...workspace(300, 5), deviceId: 'dev2' } })

/* ---------------------------- leaderboard ----------------------------- */
const board = await call('GET', '/api/leaderboard')
const rows = board.json?.leaderboard ?? []
ok(rows.length === 2, 'leaderboard has both real users')
ok(rows[0].name === 'Bob' && rows[0].weeklyXp === 300, 'leaderboard sorted by weekly XP')
ok(rows.find((r: any) => r.name === 'Alice W')?.weeklyXp === 120, 'leaderboard uses updated profile name')

/* ---------------------------- communities ----------------------------- */
const comms = await call('GET', '/api/communities')
ok(comms.json?.communities?.length === 6, '6 seeded communities (real server records)')
const bio = comms.json.communities.find((c: any) => c.id === 'c_bio')
ok(bio && bio.memberCount === 0, 'communities start with zero members (no fake data)')

const join = await call('POST', '/api/communities/c_bio/join', { token: alice })
ok(join.json?.memberCount === 1, 'Alice joins c_bio → memberCount 1')
const comms2 = await call('GET', '/api/communities', { token: alice })
const bioJoin = comms2.json.communities.find((c: any) => c.id === 'c_bio')
ok(bioJoin.joined === true, 'joined flag for Alice')
ok(bioJoin.activity[0]?.who === 'Alice W', 'feed records real join event')
const commsGuest = await call('GET', '/api/communities')
ok(commsGuest.json.communities.find((c: any) => c.id === 'c_bio').joined === false, 'guest sees joined=false')

const joinGuest = await call('POST', '/api/communities/c_bio/join')
ok(joinGuest.status === 401, 'guest join rejected')
const leave = await call('POST', '/api/communities/c_bio/leave', { token: alice })
ok(leave.json?.memberCount === 0, 'leave decrements membership')

/* ------------------------------- rooms -------------------------------- */
const rooms = await call('GET', '/api/rooms')
ok(rooms.json?.rooms?.length === 4, '4 seeded rooms')

const hb1 = await call('POST', '/api/rooms/r_focus/presence', { token: alice, body: { subject: 'Biology', focusing: true } })
ok(hb1.json?.ok === true, 'presence heartbeat ok')
const hb2 = await call('POST', '/api/rooms/r_focus/presence', { token: bob, body: { subject: 'Algorithms', focusing: false } })
ok(hb2.json?.ok === true, 'second heartbeat ok')
const pres = await call('GET', '/api/rooms/r_focus/presence')
const plist = pres.json?.presence ?? []
ok(plist.length === 2, 'both users visible in presence')
ok(plist[0].who === 'Alice W' && plist[0].focusing === true, 'focusing user sorted first')
const rooms2 = await call('GET', '/api/rooms', { token: bob })
const focusRoom = rooms2.json.rooms.find((r: any) => r.id === 'r_focus')
ok(focusRoom.online === 2 && focusRoom.focusing === 1, 'room counts online/focusing')
ok(focusRoom.joined === true, 'room joined flag derived from presence')

const gone = await call('DELETE', '/api/rooms/r_focus/presence', { token: bob })
ok(gone.json?.ok === true, 'clear presence ok')
const pres2 = await call('GET', '/api/rooms/r_focus/presence')
ok(pres2.json?.presence?.length === 1, 'presence shrinks after leave')

/* -------------------------------- chat -------------------------------- */
const msgGuest = await call('POST', '/api/rooms/r_focus/messages', { body: { text: 'hi' } })
ok(msgGuest.status === 401, 'guest cannot chat')
const m1 = await call('POST', '/api/rooms/r_focus/messages', { token: alice, body: { text: 'First real message!' } })
ok(m1.status === 201 && m1.json.message.who === 'Alice W', 'message posted with sender identity')
const inbox = await call('GET', '/api/rooms/r_focus/messages')
ok(inbox.json?.messages?.length === 1 && inbox.json.messages[0].text === 'First real message!', 'guest can read chat history')
const since = inbox.json.messages[0].at
const inbox2 = await call('GET', `/api/rooms/r_focus/messages?after=${since}`)
ok(inbox2.json?.messages?.length === 0, 'after= cursor paging returns no dupes')

// 500-char cap
const longMsg = 'x'.repeat(600)
const mLong = await call('POST', '/api/rooms/r_focus/messages', { token: bob, body: { text: longMsg } })
ok(mLong.status === 201 && mLong.json.message.text.length === 500, 'message capped at 500 chars')

// rate limit 30/min per user — alice has 1 used
let lastStatus = 200
for (let i = 0; i < 33; i++) {
  const r = await call('POST', '/api/rooms/r_focus/messages', { token: alice, body: { text: `spam ${i}` } })
  if (r.status === 429) { lastStatus = 429; break }
}
ok(lastStatus === 429, 'chat rate limit (30/min) enforced')

/* -------------------------------- logout ------------------------------- */
const out = await call('POST', '/api/auth/logout', { token: bob })
ok(out.json?.ok === true, 'logout ok')
const meAfter = await call('GET', '/api/auth/me', { token: bob })
ok(meAfter.status === 401, 'token invalid after logout')

/* --------------------------------- ai ---------------------------------- */
const ai = await call('POST', '/api/ai/generate', { body: { mode: 'summarize', note: { title: 't', content: 'c' } } })
ok(ai.status === 503 && ai.json.error === 'ai_unavailable', 'AI endpoint 503 without key (client will fall back)')

console.log(`\nAPI: ${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
