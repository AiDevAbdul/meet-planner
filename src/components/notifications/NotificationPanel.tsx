'use client'

import { X, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'

type Notification = {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifs(d.notifications ?? []))
      .finally(() => setLoading(false))
  }, [open])

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  if (!open) return null

  const today    = notifs.filter(n => isToday(n.createdAt))
  const earlier  = notifs.filter(n => !isToday(n.createdAt))

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed right-4 top-14 z-50 w-80 rounded-[14px] overflow-hidden"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>
            Notifications
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-xs font-medium"
              style={{ color: 'var(--color-blue)' }}
            >
              Mark all read
            </button>
            <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Loading…
            </div>
          )}
          {!loading && notifs.length === 0 && (
            <div className="p-8 flex flex-col items-center gap-3">
              <Bell size={32} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>All caught up</p>
            </div>
          )}
          {today.length > 0 && (
            <NotifGroup label="Today" items={today} />
          )}
          {earlier.length > 0 && (
            <NotifGroup label="Earlier" items={earlier} />
          )}
        </div>
      </div>
    </>
  )
}

function NotifGroup({ label, items }: { label: string; items: Notification[] }) {
  return (
    <div>
      <p
        className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </p>
      {items.map(n => (
        <div
          key={n.id}
          className="px-4 py-3 border-b flex gap-3"
          style={{
            borderColor: 'var(--border)',
            background: n.read ? 'transparent' : 'rgba(0,122,255,0.05)',
          }}
        >
          {!n.read && (
            <span
              className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: 'var(--color-blue)' }}
            />
          )}
          <div className={n.read ? 'pl-4' : ''}>
            <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{n.message}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth()    === now.getMonth() &&
         d.getDate()     === now.getDate()
}
