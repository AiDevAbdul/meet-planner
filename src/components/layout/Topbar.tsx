'use client'

import { Bell, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks':     'Task Board',
  '/meetings':  'Meetings',
  '/triage':    'Triage Queue',
  '/messaging': 'Messaging',
  '/people':    'People',
  '/settings':  'Settings',
}

export function Topbar() {
  const pathname   = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)

  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'MeetPlanner'

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
            className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Search"
          >
            <Search size={18} strokeWidth={1.5} />
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

      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
