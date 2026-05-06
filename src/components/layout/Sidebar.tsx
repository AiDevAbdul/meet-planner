'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, MessageSquare, FileText,
  Users, Settings, LogOut, Filter, BarChart2, CalendarClock,
  FolderKanban, Activity, Target, Clock, X,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useSidebar } from './SidebarContext'

const navItems = [
  { href: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects',         icon: FolderKanban,    label: 'Projects' },
  { href: '/tasks',            icon: CheckSquare,     label: 'Task Board' },
  { href: '/timesheets',       icon: Clock,           label: 'Timesheets' },
  { href: '/meetings',         icon: FileText,        label: 'Meetings' },
  { href: '/meeting-requests', icon: CalendarClock,   label: 'Meeting Requests' },
  { href: '/triage',           icon: Filter,          label: 'Triage Queue' },
  { href: '/messaging',        icon: MessageSquare,   label: 'Messaging' },
  { href: '/people',           icon: Users,           label: 'People' },
  { href: '/analytics',        icon: BarChart2,       label: 'Analytics' },
  { href: '/goals',            icon: Target,          label: 'Goals & OKRs' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { open, close } = useSidebar()
  const user = session?.user

  const peopleActive   = pathname === '/people' || pathname.startsWith('/people/')
  const workloadActive = pathname === '/people/workload' || pathname.startsWith('/people/workload/')

  const sidebarContent = (
    <aside
      className="glass-sidebar flex flex-col h-full w-60"
      aria-label="Main navigation"
    >
      {/* User area */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)', minHeight: 72 }}>
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
          {/* Mobile close button */}
          <button
            onClick={close}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-[8px]"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close navigation"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-widest"
          style={{ color: 'var(--text-tertiary)', letterSpacing: '0.07em' }}>
          Menu
        </p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = href === '/people'
            ? peopleActive
            : pathname === href || pathname.startsWith(href + '/')
          return (
            <div key={href}>
              <Link
                href={href}
                onClick={close}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[15px] font-medium transition-all mb-0.5"
                style={{
                  color:      active ? 'var(--color-blue)'    : 'var(--text-secondary)',
                  background: active ? 'rgba(0,122,255,0.10)' : 'transparent',
                  borderLeft: active ? '3px solid var(--color-blue)' : '3px solid transparent',
                  minHeight:  44,
                }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={1.5} />
                {label}
              </Link>

              {href === '/people' && peopleActive && (
                <Link
                  href="/people/workload"
                  onClick={close}
                  className="flex items-center gap-2 rounded-[7px] text-[13px] font-medium transition-all mb-0.5"
                  style={{
                    marginLeft: 24, paddingLeft: 10, paddingTop: 5, paddingBottom: 5, paddingRight: 8,
                    color:      workloadActive ? 'var(--color-blue)'    : 'var(--text-secondary)',
                    background: workloadActive ? 'rgba(0,122,255,0.08)' : 'transparent',
                    borderLeft: workloadActive ? '2px solid var(--color-blue)' : '2px solid var(--border)',
                    minHeight:  44,
                  }}
                  aria-current={workloadActive ? 'page' : undefined}
                >
                  <Activity size={14} strokeWidth={1.5} />
                  Workload
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link
          href="/settings"
          onClick={close}
          className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[15px] transition-all"
          style={{ color: 'var(--text-secondary)', minHeight: 44 }}
        >
          <Settings size={18} strokeWidth={1.5} />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[15px] transition-all"
          style={{ color: 'var(--text-secondary)', minHeight: 44 }}
        >
          <LogOut size={18} strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar — always visible ≥ md */}
      <div className="hidden md:block fixed left-0 top-0 h-full w-60 z-30">
        {sidebarContent}
      </div>

      {/* Mobile drawer — overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <button
            className="absolute inset-0 w-full h-full"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            onClick={close}
            aria-label="Close navigation"
          />
          {/* Drawer panel */}
          <div className="relative z-50 h-full w-60 flex-shrink-0" style={{ animation: 'slideInLeft 200ms ease-out' }}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
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
