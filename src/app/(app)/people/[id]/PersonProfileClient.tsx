'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Hash, CheckSquare, Building2, Shield,
} from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badges'
import { formatDate } from '@/lib/utils'

type Profile = {
  id:              string
  name:            string
  email:           string
  role:            string
  avatarUrl:       string | null
  createdAt:       Date
  departmentId:    string | null
  departmentName:  string | null
  departmentSlug:  string | null
  departmentColor: string | null
}

type ActiveTask = {
  id:       string
  title:    string
  status:   string
  priority: string
  dueDate:  string | null
}

type Channel = {
  channelId:   string
  channelName: string
  channelSlug: string
  channelType: string
}

type Department = {
  id:   string
  name: string
}

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  admin:   { bg: 'rgba(255,59,48,0.12)',   text: 'var(--color-red)',      label: 'Admin' },
  manager: { bg: 'rgba(255,149,0,0.12)',   text: 'var(--color-orange)',   label: 'Manager' },
  member:  { bg: 'rgba(0,122,255,0.12)',   text: 'var(--color-blue)',     label: 'Member' },
  viewer:  { bg: 'rgba(142,142,147,0.15)', text: 'var(--text-secondary)', label: 'Viewer' },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_STYLES[role] ?? ROLE_STYLES.member
  return (
    <span
      className="inline-flex items-center gap-1 font-medium"
      style={{
        background:   cfg.bg,
        color:        cfg.text,
        fontSize:     12,
        padding:      '3px 9px',
        borderRadius: 7,
      }}
    >
      {role === 'admin' && <Shield size={11} strokeWidth={2} />}
      {cfg.label}
    </span>
  )
}

export function PersonProfileClient({
  profile,
  activeTasks,
  completedThisMonth,
  channels,
  currentUserId,
  isAdmin,
  allDepartments,
}: {
  profile:            Profile
  activeTasks:        ActiveTask[]
  completedThisMonth: number
  channels:           Channel[]
  currentUserId:      string
  isAdmin:            boolean
  allDepartments:     Department[]
}) {
  const router = useRouter()
  const isSelf = profile.id === currentUserId

  const [editMode,    setEditMode]    = useState(false)
  const [editRole,    setEditRole]    = useState(profile.role)
  const [editDeptId,  setEditDeptId]  = useState(profile.departmentId ?? '')
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role:         editRole,
          departmentId: editDeptId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.error ?? 'Failed to save')
        return
      }
      setEditMode(false)
      router.refresh()
    } catch {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push('/people')}
        className="flex items-center gap-2 mb-6 text-[14px] font-medium transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-blue)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        People
      </button>

      {/* Profile card */}
      <div
        className="glass-card mb-5"
        style={{ padding: 28 }}
      >
        <div className="flex items-start gap-5">
          <Avatar name={profile.name} src={profile.avatarUrl ?? undefined} size={80} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1
                className="text-[22px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {profile.name}
              </h1>
              {isSelf && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,122,255,0.12)', color: 'var(--color-blue)' }}
                >
                  You
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <RoleBadge role={profile.role} />
              {profile.departmentName && (
                <span
                  className="flex items-center gap-1.5 text-[13px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {profile.departmentColor && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: profile.departmentColor }}
                    />
                  )}
                  {profile.departmentName}
                </span>
              )}
            </div>

            <a
              href={`mailto:${profile.email}`}
              className="flex items-center gap-1.5 text-[13px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-blue)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <Mail size={14} strokeWidth={1.5} />
              {profile.email}
            </a>
          </div>

          {/* Admin edit controls */}
          {isAdmin && !isSelf && (
            <div>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-[13px] font-medium px-3 py-1.5 rounded-[8px] transition-all"
                  style={{
                    border:      '1px solid var(--border)',
                    background:  'var(--bg-primary)',
                    color:       'var(--text-secondary)',
                  }}
                >
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditMode(false); setSaveError(null) }}
                    className="text-[13px] px-3 py-1.5 rounded-[8px] transition-all"
                    style={{
                      border:     '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color:      'var(--text-secondary)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-[13px] font-medium px-3 py-1.5 rounded-[8px] transition-all"
                    style={{
                      background: saving ? 'rgba(0,122,255,0.5)' : 'var(--color-blue)',
                      color:      '#fff',
                      border:     'none',
                    }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin edit form */}
        {isAdmin && !isSelf && editMode && (
          <div
            className="mt-5 pt-5 flex items-end gap-4 flex-wrap"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Role
              </label>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                className="text-[13px] rounded-[8px] px-3 py-2"
                style={{
                  border:     '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color:      'var(--text-primary)',
                  outline:    'none',
                  minWidth:   120,
                }}
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label
                className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Department
              </label>
              <select
                value={editDeptId}
                onChange={e => setEditDeptId(e.target.value)}
                className="text-[13px] rounded-[8px] px-3 py-2"
                style={{
                  border:     '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color:      'var(--text-primary)',
                  outline:    'none',
                  minWidth:   160,
                }}
              >
                <option value="">— No department —</option>
                {allDepartments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {saveError && (
              <p className="text-[12px]" style={{ color: 'var(--color-red)' }}>
                {saveError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Active tasks */}
        <section className="glass-card" style={{ padding: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={16} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Active Tasks
            </h2>
            <span
              className="ml-auto text-[12px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}
            >
              {activeTasks.length}
            </span>
          </div>

          {activeTasks.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              No active tasks.
            </p>
          ) : (
            <ul className="space-y-2">
              {activeTasks.map(t => (
                <li
                  key={t.id}
                  className="flex flex-col gap-1 rounded-[10px] p-3"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <span
                    className="text-[13px] font-medium leading-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t.title}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge   status={t.status}   small />
                    <PriorityBadge priority={t.priority} small />
                    {t.dueDate && (
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        Due {formatDate(t.dueDate)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div
            className="mt-4 pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              Completed this month
            </span>
            <span
              className="text-[15px] font-semibold"
              style={{ color: 'var(--color-green)' }}
            >
              {completedThisMonth}
            </span>
          </div>
        </section>

        {/* Channels */}
        <section className="glass-card" style={{ padding: 20 }}>
          <div className="flex items-center gap-2 mb-4">
            <Hash size={16} strokeWidth={1.5} style={{ color: 'var(--color-indigo)' }} />
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Channels
            </h2>
            <span
              className="ml-auto text-[12px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(88,86,214,0.1)', color: 'var(--color-indigo)' }}
            >
              {channels.length}
            </span>
          </div>

          {channels.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              Not a member of any channel.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {channels.map(c => (
                <li
                  key={c.channelId}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <Hash size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                    {c.channelName}
                  </span>
                  <span
                    className="ml-auto text-[10px] capitalize"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {c.channelType}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Member since */}
          <div
            className="mt-4 pt-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              Member since {formatDate(profile.createdAt.toISOString())}
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
