'use client'

import { Bell, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { CommandPalette } from '@/components/ui/CommandPalette'

const pageTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/tasks':      'Task Board',
  '/meetings':   'Meetings',
  '/triage':     'Triage Queue',
  '/messaging':  'Messaging',
  '/people':     'People',
  '/analytics':  'Analytics',
  '/settings':   'Settings',
}

export function Topbar() {
  const pathname   = usePathname()
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'MeetPlanner'

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
