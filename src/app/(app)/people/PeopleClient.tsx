'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, CheckSquare, BarChart2 } from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'

type UserRow = {
  id:              string
  name:            string
  email:           string
  role:            string
  avatarUrl:       string | null
  departmentId:    string | null
  departmentName:  string | null
  departmentSlug:  string | null
  departmentColor: string | null
  activeTaskCount: number
  totalTaskCount?: number
  doneTaskCount?:  number
}

type DeptRow = {
  id:    string
  name:  string
  slug:  string
  color: string | null
}

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  admin:   { bg: 'rgba(255,59,48,0.12)',   text: 'var(--color-red)',    label: 'Admin' },
  manager: { bg: 'rgba(255,149,0,0.12)',   text: 'var(--color-orange)', label: 'Manager' },
  member:  { bg: 'rgba(0,122,255,0.12)',   text: 'var(--color-blue)',   label: 'Member' },
  viewer:  { bg: 'rgba(142,142,147,0.15)', text: 'var(--text-secondary)', label: 'Viewer' },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_STYLES[role] ?? ROLE_STYLES.member
  return (
    <span
      className="inline-flex items-center font-medium"
      style={{
        background:   cfg.bg,
        color:        cfg.text,
        fontSize:     11,
        padding:      '2px 7px',
        borderRadius: 6,
      }}
    >
      {cfg.label}
    </span>
  )
}

export function PeopleClient({
  users,
  departments,
  currentUserId,
}: {
  users:          UserRow[]
  departments:    DeptRow[]
  currentUserId:  string
}) {
  const router = useRouter()
  const [filterDeptId, setFilterDeptId] = useState<string | null>(null)

  const filtered = filterDeptId
    ? users.filter(u => u.departmentId === filterDeptId)
    : users

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-[10px]"
          style={{ background: 'rgba(0,122,255,0.1)' }}
        >
          <Users size={18} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            People & Teams
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {users.length} {users.length === 1 ? 'member' : 'members'} across{' '}
            {departments.length} {departments.length === 1 ? 'department' : 'departments'}
          </p>
        </div>
      </div>

      {/* Workload shortcut */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/people/workload"
          className="flex items-center gap-1.5 text-[13px] font-medium rounded-lg"
          style={{
            padding:    '6px 14px',
            background: 'rgba(0,122,255,0.1)',
            color:      'var(--color-blue)',
            border:     '1px solid rgba(0,122,255,0.2)',
            transition: 'all 150ms ease-out',
          }}
        >
          <BarChart2 size={14} strokeWidth={1.5} />
          Workload View
        </Link>
      </div>

      {/* Department filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <FilterButton
          label="All"
          active={filterDeptId === null}
          onClick={() => setFilterDeptId(null)}
        />
        {departments.map(d => (
          <FilterButton
            key={d.id}
            label={d.name}
            active={filterDeptId === d.id}
            onClick={() => setFilterDeptId(prev => prev === d.id ? null : d.id)}
            color={d.color ?? undefined}
          />
        ))}
      </div>

      {/* User grid */}
      {filtered.length === 0 ? (
        <div
          className="glass-card flex flex-col items-center justify-center gap-3 p-16"
          style={{ textAlign: 'center' }}
        >
          <Users size={40} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            No members in this department yet.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {filtered.map(u => (
            <UserCard
              key={u.id}
              user={u}
              isSelf={u.id === currentUserId}
              onClick={() => router.push(`/people/${u.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterButton({
  label, active, onClick, color,
}: {
  label:   string
  active:  boolean
  onClick: () => void
  color?:  string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[13px] font-medium transition-all"
      style={{
        padding:      '5px 12px',
        borderRadius: 'var(--radius-md)',
        border:       '1px solid',
        borderColor:  active ? 'transparent' : 'var(--border)',
        background:   active ? 'var(--color-blue)' : 'var(--bg-primary)',
        color:        active ? '#fff' : 'var(--text-secondary)',
        boxShadow:    active ? '0 2px 8px rgba(0,122,255,0.3)' : 'none',
        transition:   'all 150ms ease-out',
      }}
    >
      {color && !active && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
      )}
      {label}
    </button>
  )
}

function UserCard({
  user, isSelf, onClick,
}: {
  user:    UserRow
  isSelf:  boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card text-left w-full"
      style={{
        padding:    20,
        cursor:     'pointer',
        transition: 'transform 150ms var(--ease-out), box-shadow 150ms var(--ease-out)',
        outline:    'none',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = 'var(--shadow-lg)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'var(--shadow-md)'
      }}
      aria-label={`View profile of ${user.name}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={user.name} src={user.avatarUrl ?? undefined} size={56} />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-[15px] font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {user.name}
            </span>
            {isSelf && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(0,122,255,0.12)', color: 'var(--color-blue)' }}
              >
                You
              </span>
            )}
          </div>
          <RoleBadge role={user.role} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          {user.departmentName ? (
            <div className="flex items-center gap-1.5">
              {user.departmentColor && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: user.departmentColor }}
                />
              )}
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {user.departmentName}
              </span>
            </div>
          ) : (
            <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              No department
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <CheckSquare size={13} strokeWidth={1.5} />
          <span className="text-[12px] font-medium">
            {user.activeTaskCount} active
          </span>
        </div>
      </div>

      {/* Workload completion bar */}
      {(user.totalTaskCount ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Completion</span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {user.doneTaskCount ?? 0}/{user.totalTaskCount}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(((user.doneTaskCount ?? 0) / (user.totalTaskCount ?? 1)) * 100)}%`,
                background: 'var(--color-green)',
              }}
            />
          </div>
        </div>
      )}
    </button>
  )
}
