/**
 * Serializes the local-first stores into one workspace document for cloud
 * sync, and applies a remote snapshot back into them (last-write-wins at
 * document level, guarded by updatedAt on both sides).
 *
 * Uses dynamic imports so stores never form a static import cycle with the
 * sync engine.
 */
export interface WorkspaceData {
  v: 1
  library: {
    folders: unknown[]
    notes: unknown[]
    files: unknown[]
    decks: unknown[]
    cards: unknown[]
  }
  boards: unknown[]
  progress: {
    xp: number
    activity: Record<string, unknown>
    streak: Record<string, unknown>
    counters: Record<string, number>
    badges: Record<string, number>
  }
  focus: {
    settings: Record<string, unknown>
    sessions: unknown[]
    activeRoomId: string | null
  }
}

export async function collectWorkspace(): Promise<WorkspaceData> {
  const [{ useLibrary }, { useBoards }, { useProgress }, { useFocus }] = await Promise.all([
    import('../stores/library'),
    import('../stores/boards'),
    import('../stores/progress'),
    import('../stores/focus'),
  ])
  const lib = useLibrary.getState()
  const boards = useBoards.getState()
  const progress = useProgress.getState()
  const focus = useFocus.getState()
  return {
    v: 1,
    library: { folders: lib.folders, notes: lib.notes, files: lib.files, decks: lib.decks, cards: lib.cards },
    boards: boards.boards,
    progress: {
      xp: progress.xp,
      activity: progress.activity,
      streak: progress.streak as unknown as Record<string, unknown>,
      counters: progress.counters as unknown as Record<string, number>,
      badges: progress.badges as unknown as Record<string, number>,
    },
    focus: {
      settings: focus.settings as unknown as Record<string, unknown>,
      sessions: focus.sessions,
      activeRoomId: focus.activeRoomId,
    },
  }
}

/** newest updatedAt across sync-relevant entities — our snapshot timestamp */
export async function localUpdatedAt(): Promise<number> {
  const [{ useLibrary }, { useBoards }, { useFocus }] = await Promise.all([
    import('../stores/library'),
    import('../stores/boards'),
    import('../stores/focus'),
  ])
  const times: number[] = []
  const lib = useLibrary.getState()
  for (const n of lib.notes) times.push((n as { updatedAt?: number }).updatedAt ?? 0)
  for (const b of useBoards.getState().boards) times.push((b as { updatedAt?: number }).updatedAt ?? 0)
  for (const s of useFocus.getState().sessions) times.push((s as { startedAt?: number }).startedAt ?? 0)
  return Math.max(Date.now(), ...times)
}

export async function applyWorkspace(data: unknown): Promise<boolean> {
  try {
    const d = data as WorkspaceData
    if (!d || d.v !== 1 || !d.library || !d.progress || !d.focus) return false
    const [{ useLibrary }, { useBoards }, { useProgress }, { useFocus }] = await Promise.all([
      import('../stores/library'),
      import('../stores/boards'),
      import('../stores/progress'),
      import('../stores/focus'),
    ])
    useLibrary.getState().replaceAll(d.library as never)
    useBoards.getState().replaceAll(d.boards as never[])
    useProgress.setState({
      xp: d.progress.xp,
      activity: d.progress.activity as never,
      streak: d.progress.streak as never,
      counters: d.progress.counters as never,
      badges: d.progress.badges ?? {},
    })
    useFocus.setState({
      settings: { ...useFocus.getState().settings, ...(d.focus.settings as Record<string, unknown>) } as never,
      sessions: d.focus.sessions as never,
      activeRoomId: d.focus.activeRoomId ?? null,
    })
    return true
  } catch (err) {
    console.error('[sync] apply workspace failed', err)
    return false
  }
}
