'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, MessageSquare, FileText,
  Users, Settings, LogOut, Filter, BarChart2, CalendarClock,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

const navItems = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/tasks',      icon: CheckSquare,      label: 'Task Board' },
  { href: '/meetings',          icon: FileText,      label: 'Meetings' },
  { href: '/meeting-requests', icon: CalendarClock, label: 'Meeting Requests' },
  { href: '/triage',            icon: Filter,        label: 'Triage Queue' },
  { href: '/messaging',  icon: MessageSquare,    label: 'Messaging' },
  { href: '/people',     icon: Users,            label: 'People' },
  { href: '/analytics',  icon: BarChart2,        label: 'Analytics' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user

  return (
    <aside
      className="glass-sidebar fixed left-0 top-0 h-full w-60 flex flex-col z-30"
      aria-label="Main navigation"
    >
      {/* User area */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)', height: 72 }}>
        <div className="flex items-center gap-3">
          <Avatar name={user?.name ?? ''} src={user?.image ?? undefined} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name ?? 'Loading…'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {user?.email ?? ''}
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.07em' }}>
          Menu
        </p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[15px] font-medium transition-all mb-0.5"
              style={{
                color:      active ? 'var(--color-blue)'    : 'var(--text-secondary)',
                background: active ? 'rgba(0,122,255,0.10)' : 'transparent',
                borderLeft: active ? '3px solid var(--color-blue)' : '3px solid transparent',
              }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[15px] transition-all"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Settings size={18} strokeWidth={1.5} />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[15px] transition-all"
          style={{ color: 'var(--text-secondary)' }}
        >
          <LogOut size={18} strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export function Avatar({
  name, src, size = 32,
}: { name: string; src?: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: src ? 'transparent' : 'var(--color-indigo)',
        color: '#fff',
        fontSize: size * 0.38,
        fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
      }}
      aria-label={name}
    >
      {src
        ? <img src={src} alt={name} width={size} height={size} style={{ objectFit: 'cover' }} />
        : initials
      }
    </div>
  )
}
