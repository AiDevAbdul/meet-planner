'use client'

import { Bell, Search, Square } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { CommandPalette } from '@/components/ui/CommandPalette'

const pageTitles: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/tasks':       'Task Board',
  '/meetings':    'Meetings',
  '/triage':      'Triage Queue',
  '/messaging':   'Messaging',
  '/people':      'People',
  '/analytics':   'Analytics',
  '/settings':    'Settings',
  '/timesheets':  'Timesheets',
}

const TIMER_KEY = 'meetplanner_active_timer'

type TimerData = { taskId: string; taskTitle: string; startedAt: string }

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Topbar() {
  const pathname   = usePathname()
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [timer,       setTimer]       = useState<TimerData | null>(null)
  const [elapsed,     setElapsed]     = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'MeetPlanner'

  // Load timer from localStorage on mount + on custom event
  function loadTimer() {
    try {
      const raw = localStorage.getItem(TIMER_KEY)
      if (raw) {
        const t: TimerData = JSON.parse(raw)
        setTimer(t)
        setElapsed(Date.now() - new Date(t.startedAt).getTime())
      } else {
        setTimer(null)
        setElapsed(0)
      }
    } catch {
      setTimer(null)
    }
  }

  useEffect(() => {
    loadTimer()
    window.addEventListener('meetplanner_timer_change', loadTimer)
    return () => window.removeEventListener('meetplanner_timer_change', loadTimer)
  }, [])

  // Tick every second when timer is active
  useEffect(() => {
    if (timer) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - new Date(timer.startedAt).getTime())
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timer])

  function stopTimer() {
    if (!timer) return
    const elapsedMinutes = Math.round((Date.now() - new Date(timer.startedAt).getTime()) / 60000)
    if (elapsedMinutes > 0) {
      fetch(`/api/tasks/${timer.taskId}/time-entries`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          date:     new Date().toISOString().slice(0, 10),
          minutes:  elapsedMinutes,
          note:     'Timer',
          billable: false,
        }),
      }).catch(() => {})
    }
    localStorage.removeItem(TIMER_KEY)
    setTimer(null)
    setElapsed(0)
    window.dispatchEvent(new Event('meetplanner_timer_change'))
  }

  // Global Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(p => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header
        className="glass-topbar fixed top-0 right-0 z-20 flex items-center justify-between px-6"
        style={{ left: 240, height: 52 }}
      >
        <h1 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>

        <div className="flex items-center gap-2">
          {/* Active timer pill */}
          {timer && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(255,59,48,0.08)',
                border:     '1px solid rgba(255,59,48,0.2)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: 'var(--color-red)', flexShrink: 0 }}
              />
              <span
                className="text-[12px] font-semibold font-mono"
                style={{ color: 'var(--color-red)' }}
              >
                {formatElapsed(elapsed)}
              </span>
              <span
                className="text-[11px] max-w-[100px] truncate"
                style={{ color: 'var(--text-secondary)' }}
                title={timer.taskTitle}
              >
                {timer.taskTitle}
              </span>
              <button
                onClick={stopTimer}
                className="flex items-center justify-center w-5 h-5 rounded-full transition-all hover:opacity-80"
                style={{ background: 'var(--color-red)' }}
                aria-label="Stop timer"
              >
                <Square size={8} strokeWidth={2.5} style={{ color: '#fff' }} />
              </button>
            </div>
          )}

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 px-3 h-8 rounded-[8px] transition-colors text-[13px]"
            style={{
              background: 'var(--bg-secondary)',
              border:     '1px solid var(--border)',
              color:      'var(--text-tertiary)',
            }}
            aria-label="Open search (⌘K)"
          >
            <Search size={14} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[11px] font-mono ml-1">⌘K</kbd>
          </button>

          <button
            onClick={() => setNotifOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors relative"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={1.5} />
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ background: 'var(--color-red)' }}
            />
          </button>
        </div>
      </header>

      <NotificationPanel open={notifOpen}   onClose={() => setNotifOpen(false)} />
      <CommandPalette    open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
