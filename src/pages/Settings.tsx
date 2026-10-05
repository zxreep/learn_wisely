import { useEffect, useRef, useState } from 'react'
import {
  Cloud, Download, Eraser, HardDrive, Laptop, Moon, RefreshCw, Smartphone,
  Sun, SunMoon, Upload, Wifi, WifiOff,
} from 'lucide-react'
import { Avatar, Button, Card, Input, Page, PageHeader, SectionTitle, Switch } from '../components/ui'
import { useSettings, type Theme } from '../stores/settings'
import { useSync } from '../stores/sync'
import { toast } from '../stores/toast'
import { download, cn, timeAgo } from '../lib/utils'
import { OwlMark } from '../components/icons'

const STORAGE_KEYS = ['wisely-settings', 'wisely-sync', 'wisely-progress', 'wisely-library', 'wisely-boards', 'wisely-focus', 'wisely-community']

export default function Settings() {
  const { name, theme, dailyGoalMin, setName, setTheme, setDailyGoal } = useSettings()
  const sync = useSync()

  return (
    <Page className="max-w-[860px]">
      <PageHeader title="Settings" subtitle="Your workspace lives on this device first, clouds second." />

      <div className="space-y-4">
        {/* profile */}
        <Card className="p-5">
          <SectionTitle title="Profile" />
          <div className="flex items-center gap-4 mt-4">
            <Avatar name={name || '?'} color="#2f6b4f" size={52} />
            <div className="flex-1 max-w-xs">
              <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Display name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
          </div>
        </Card>

        {/* appearance */}
        <Card className="p-5">
          <SectionTitle title="Appearance" desc="Warm paper in the light, lamp-lit desk in the dark." />
          <div className="grid grid-cols-3 gap-2 mt-4 max-w-md">
            {(
              [
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'system', label: 'System', icon: SunMoon },
              ] as { id: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-colors',
                  theme === t.id ? 'border-accent bg-accent/5' : 'border-line hover:bg-surface2',
                )}
              >
                <t.icon className={cn('w-4.5 h-4.5 w-[18px] h-[18px]', theme === t.id ? 'text-accent' : 'text-ink3')} />
                <span className="text-[12.5px] font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* goals */}
        <Card className="p-5">
          <SectionTitle title="Daily focus goal" desc="Used by the dashboard ring, week chart and pace hints." />
          <div className="flex items-center gap-4 mt-4 max-w-md">
            <input
              type="range" min={30} max={360} step={15} value={dailyGoalMin}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="flex-1 accent-[rgb(var(--c-accent))]"
              aria-label="Daily goal in minutes"
            />
            <span className="font-display font-bold text-lg w-20 text-right tabular-nums">{dailyGoalMin >= 60 ? `${Math.floor(dailyGoalMin / 60)}h${dailyGoalMin % 60 ? ` ${dailyGoalMin % 60}m` : ''}` : `${dailyGoalMin}m`}</span>
          </div>
        </Card>

        {/* sync */}
        <Card className="p-5">
          <SectionTitle
            title="Sync & offline"
            desc="Local-first: reads never hit the network, writes queue instantly and flush when online."
          />
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-line p-3.5 flex items-center gap-3">
              <span className={cn('grid place-items-center w-9 h-9 rounded-lg', sync.online ? 'bg-ok/12 bg-ok/10 text-ok' : 'bg-warn/12 bg-warn/10 text-warn')}>
                {sync.online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </span>
              <div>
                <div className="text-[13px] font-semibold">{sync.online ? 'Online' : 'Offline'}</div>
                <div className="text-[11.5px] text-ink3">
                  {sync.syncing ? 'Syncing now…' : sync.pending > 0 ? `${sync.pending} changes queued` : `Synced ${sync.lastSyncedAt ? timeAgo(sync.lastSyncedAt) : 'never'}`}
                </div>
              </div>
              <Button
                size="sm" variant="subtle" className="ml-auto"
                disabled={!sync.online || sync.syncing}
                onClick={() => void sync.syncNow()}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', sync.syncing && 'animate-spin')} /> Sync now
              </Button>
            </div>
            <div className="rounded-xl border border-line p-3.5 flex items-center gap-3">
              <span className="grid place-items-center w-9 h-9 rounded-lg bg-accent/12 bg-accent/10 text-accent">
                <Laptop className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[13px] font-semibold">{sync.deviceName}</div>
                <div className="text-[11.5px] text-ink3">ID {useSettings.getState().deviceId} · this device</div>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[11px] text-ok font-semibold">
                <Cloud className="w-3.5 h-3.5" /> current
              </span>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-surface2/50 border border-line/60 p-3.5 text-[12.5px] text-ink2 leading-relaxed">
            <span className="font-semibold">Try it:</span> toggle your network off (or browser DevTools → offline). Everything — notes,
            boards, focus sessions, AI — keeps working. The banner shows queued changes, and they flush the moment you reconnect,
            just like multi-device sync will.
          </div>
          <div className="flex items-center gap-2.5 mt-3 text-[12px] text-ink3">
            <Smartphone className="w-4 h-4" /> Other devices show up here once sync is linked to an account (coming soon).
          </div>
        </Card>

        {/* data */}
        <Card className="p-5">
          <SectionTitle title="Your data" desc="Everything is stored in this browser. Back it up or move it anywhere." />
          <DataPanel />
        </Card>

        {/* about */}
        <Card className="p-5 flex items-center gap-4">
          <OwlMark className="w-11 h-11" />
          <div>
            <div className="font-display font-semibold">Wisely 0.1</div>
            <div className="text-[12px] text-ink3 leading-snug mt-0.5">
              A local-first study workspace. Notes, boards, flashcards, focus timers and an on-device AI that
              never sends your words anywhere.
            </div>
          </div>
        </Card>
      </div>
    </Page>
  )
}

function DataPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [storageInfo, setStorageInfo] = useState<string>('calculating…')

  useEffect(() => {
    const bytes = STORAGE_KEYS.reduce((sum, k) => sum + (localStorage.getItem(k)?.length ?? 0), 0)
    setStorageInfo(`~${(bytes / 1024).toFixed(0)} KB in localStorage`)
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((e) => {
        if (e.usage && e.quota) {
          setStorageInfo(`~${(e.usage / 1024).toFixed(0)} KB used of ${(e.quota / 1048576).toFixed(0)} MB available`)
        }
      }).catch(() => undefined)
    }
  }, [])

  const exportAll = () => {
    const data: Record<string, unknown> = {}
    for (const k of STORAGE_KEYS) {
      const v = localStorage.getItem(k)
      if (v) data[k] = JSON.parse(v)
    }
    download(`wisely-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2))
    toast.success('Backup downloaded', 'Keep it somewhere safe — it is your whole workspace.')
  }

  const importAll = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Record<string, unknown>
        let count = 0
        for (const k of STORAGE_KEYS) {
          if (data[k]) {
            localStorage.setItem(k, JSON.stringify(data[k]))
            count++
          }
        }
        if (count === 0) {
          toast.warn('Nothing to import', 'This file does not look like a Wisely backup.')
          return
        }
        toast.success('Backup restored', 'Reloading to apply everything…')
        setTimeout(() => location.reload(), 900)
      } catch {
        toast.warn('Import failed', 'Could not parse that file.')
      }
    }
    reader.readAsText(file)
  }

  const resetWorkspace = () => {
    if (!confirm('Reset the workspace to the original demo state? Your changes will be lost.')) return
    for (const k of STORAGE_KEYS) localStorage.removeItem(k)
    location.reload()
  }

  const wipeAll = () => {
    if (!confirm('Delete ALL Wisely data on this device? This starts you from a completely empty workspace.')) return
    if (!confirm('Really sure? There is no undo.')) return
    for (const k of STORAGE_KEYS) localStorage.removeItem(k)
    location.reload()
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mt-4">
        <Button variant="subtle" onClick={exportAll}>
          <Download className="w-4 h-4" /> Export backup (JSON)
        </Button>
        <Button variant="subtle" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" /> Import backup
        </Button>
        <Button variant="outline" onClick={resetWorkspace}>
          <Eraser className="w-4 h-4" /> Reset to demo
        </Button>
        <Button variant="danger" onClick={wipeAll}>
          <Eraser className="w-4 h-4" /> Delete everything
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])}
        />
      </div>
      <div className="flex items-center gap-2 mt-3 text-[12px] text-ink3">
        <HardDrive className="w-3.5 h-3.5" /> {storageInfo}
      </div>
    </div>
  )
}
