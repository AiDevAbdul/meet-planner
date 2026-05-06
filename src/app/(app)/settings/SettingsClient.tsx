'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Settings, Users, Building2, Sun, Moon, Monitor,
  Plus, Trash2, Edit2, X, Check, Eye, EyeOff,
  GitBranch, RefreshCw, AlertCircle, Unlink,
} from 'lucide-react'
import { useTheme } from '@/components/ui/ThemeProvider'
import { Avatar } from '@/components/layout/Sidebar'

type CurrentUser = {
  id:               string
  name:             string
  email:            string
  role:             string
  avatarUrl:        string | null
  departmentId:     string | null
  dailyReportEmail: boolean
}

type TeamMember = {
  id:           string
  name:         string
  email:        string
  role:         string
  avatarUrl:    string | null
  departmentId: string | null
}

type Department = {
  id:          string
  name:        string
  slug:        string
  color:       string | null
  createdAt:   Date
  memberCount: number
}

const TABS = ['General', 'Team', 'Departments', 'Appearance', 'Notifications', 'Integrations'] as const
type Tab = (typeof TABS)[number]

const PRESET_COLORS = [
  '#007AFF', '#FF3B30', '#FF9500',
  '#34C759', '#AF52DE', '#5856D6',
]

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

export function SettingsClient({
  currentUser,
  isAdmin,
  allUsers,
  departments,
}: {
  currentUser: CurrentUser
  isAdmin:     boolean
  allUsers:    TeamMember[]
  departments: Department[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('General')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-[10px]"
          style={{ background: 'rgba(142,142,147,0.12)' }}
        >
          <Settings size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Manage your workspace configuration
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 mb-6 p-1 rounded-[12px]"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        role="tablist"
        aria-label="Settings tabs"
      >
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 text-[13px] font-medium py-2 rounded-[9px] transition-all"
            style={{
              background: activeTab === tab ? 'var(--bg-primary)' : 'transparent',
              color:      activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow:  activeTab === tab ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease-out',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div role="tabpanel">
        {activeTab === 'General'       && <GeneralTab currentUser={currentUser} />}
        {activeTab === 'Team'          && <TeamTab allUsers={allUsers} currentUser={currentUser} isAdmin={isAdmin} departments={departments} />}
        {activeTab === 'Departments'   && <DepartmentsTab departments={departments} isAdmin={isAdmin} />}
        {activeTab === 'Appearance'    && <AppearanceTab />}
        {activeTab === 'Notifications' && <NotificationsTab currentUser={currentUser} />}
        {activeTab === 'Integrations'  && <IntegrationsTab />}
      </div>
    </div>
  )
}

// ─── General ─────────────────────────────────────────────────────────────────

function GeneralTab({ currentUser }: { currentUser: CurrentUser }) {
  const [companyName, setCompanyName] = useState('Ducker Creative')
  const [timezone,    setTimezone]    = useState('America/New_York')
  const [saved,       setSaved]       = useState(false)

  function handleSave() {
    // In-scope: store in state / future API
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="glass-card" style={{ padding: 28 }}>
      <h2 className="text-[17px] font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        General Settings
      </h2>

      <div className="space-y-5 max-w-md">
        <Field label="Company Name">
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="w-full text-[14px] px-3 py-2.5 rounded-[10px]"
            style={inputStyle}
          />
        </Field>

        <Field label="Timezone">
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="w-full text-[14px] px-3 py-2.5 rounded-[10px]"
            style={inputStyle}
          >
            <option value="America/New_York">Eastern (UTC-5)</option>
            <option value="America/Chicago">Central (UTC-6)</option>
            <option value="America/Denver">Mountain (UTC-7)</option>
            <option value="America/Los_Angeles">Pacific (UTC-8)</option>
            <option value="Europe/London">London (UTC+0)</option>
            <option value="Europe/Paris">Paris (UTC+1)</option>
            <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
            <option value="Australia/Sydney">Sydney (UTC+10)</option>
          </select>
        </Field>

        <div className="pt-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 text-[14px] font-medium px-4 py-2.5 rounded-[10px] transition-all"
            style={{
              background: saved ? 'var(--color-green)' : 'var(--color-blue)',
              color:      '#fff',
              boxShadow:  '0 2px 8px rgba(0,122,255,0.25)',
              transition: 'all 200ms ease-out',
            }}
          >
            {saved ? <Check size={15} strokeWidth={2} /> : null}
            {saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div
        className="mt-8 pt-6"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Your Account
        </h3>
        <div className="flex items-center gap-3">
          <Avatar name={currentUser.name} src={currentUser.avatarUrl ?? undefined} size={40} />
          <div>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {currentUser.name}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              {currentUser.email}
            </p>
          </div>
          <RoleBadge role={currentUser.role} />
        </div>
      </div>
    </div>
  )
}

// ─── Team ─────────────────────────────────────────────────────────────────────

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? 'duckercreative.com'

function TeamTab({
  allUsers: initialUsers, currentUser, isAdmin, departments,
}: {
  allUsers:    TeamMember[]
  currentUser: CurrentUser
  isAdmin:     boolean
  departments: Department[]
}) {
  const [members,      setMembers]      = useState(initialUsers)
  const [showModal,    setShowModal]    = useState(false)
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPw,       setShowPw]       = useState(false)
  const [role,         setRole]         = useState('member')
  const [deptId,       setDeptId]       = useState('')
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)

  function openModal() {
    setName(''); setEmail(''); setPassword(''); setRole('member')
    setDeptId(''); setFormError(null); setShowPw(false)
    setShowModal(true)
  }

  async function handleAdd() {
    if (!name.trim() || !email.trim() || !password) {
      setFormError('Name, email and password are required')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password, role, departmentId: deptId || null }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Failed to add member'); return }
      setMembers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setShowModal(false)
    } catch {
      setFormError('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-card" style={{ padding: 28 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Team Members
          <span className="ml-2 text-[13px] font-normal" style={{ color: 'var(--text-tertiary)' }}>
            {members.length}
          </span>
        </h2>
        {isAdmin && (
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-[9px]"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
          >
            <Plus size={14} strokeWidth={2} />
            Add Member
          </button>
        )}
      </div>

      <div className="space-y-2">
        {members.map(u => (
          <div
            key={u.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px]"
            style={{
              background: u.id === currentUser.id ? 'rgba(0,122,255,0.05)' : 'var(--bg-secondary)',
            }}
          >
            <Avatar name={u.name} src={u.avatarUrl ?? undefined} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {u.name}
                {u.id === currentUser.id && (
                  <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-blue)' }}>(you)</span>
                )}
              </p>
              <p className="text-[12px] truncate" style={{ color: 'var(--text-tertiary)' }}>{u.email}</p>
            </div>
            <RoleBadge role={u.role} />
          </div>
        ))}
      </div>

      {/* Add Member modal */}
      {showModal && (
        <Modal title="Add Team Member" onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Full Name">
              <input
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-[14px] px-3 py-2.5 rounded-[10px]"
                style={inputStyle}
                autoFocus
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                placeholder={`name@${ALLOWED_DOMAIN}`}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-[14px] px-3 py-2.5 rounded-[10px]"
                style={inputStyle}
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full text-[14px] px-3 py-2.5 rounded-[10px] pr-10"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full text-[14px] px-3 py-2.5 rounded-[10px]"
                  style={inputStyle}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </Field>

              <Field label="Department">
                <select
                  value={deptId}
                  onChange={e => setDeptId(e.target.value)}
                  className="w-full text-[14px] px-3 py-2.5 rounded-[10px]"
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            {formError && (
              <p className="text-[12px]" style={{ color: 'var(--color-red)' }}>{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="text-[13px] px-4 py-2 rounded-[9px]"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-[9px]"
                style={{ background: saving ? 'rgba(0,122,255,0.5)' : 'var(--color-blue)', color: '#fff' }}
              >
                <Plus size={14} strokeWidth={2} />
                {saving ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Departments ──────────────────────────────────────────────────────────────

function DepartmentsTab({
  departments: initialDepts,
  isAdmin,
}: {
  departments: Department[]
  isAdmin:     boolean
}) {
  const router = useRouter()
  const [depts,        setDepts]        = useState(initialDepts)
  const [showCreate,   setShowCreate]   = useState(false)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [formName,     setFormName]     = useState('')
  const [formSlug,     setFormSlug]     = useState('')
  const [formColor,    setFormColor]    = useState(PRESET_COLORS[0])
  const [formError,    setFormError]    = useState<string | null>(null)
  const [saving,       setSaving]       = useState(false)

  function openCreate() {
    setFormName('')
    setFormSlug('')
    setFormColor(PRESET_COLORS[0])
    setFormError(null)
    setShowCreate(true)
    setEditingId(null)
  }

  function openEdit(dept: Department) {
    setFormName(dept.name)
    setFormSlug(dept.slug)
    setFormColor(dept.color ?? PRESET_COLORS[0])
    setFormError(null)
    setEditingId(dept.id)
    setShowCreate(false)
  }

  function closeForm() {
    setShowCreate(false)
    setEditingId(null)
    setFormError(null)
  }

  function deriveSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function handleCreate() {
    if (!formName.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/departments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: formName, slug: formSlug || deriveSlug(formName), color: formColor }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Failed to create'); return }
      setDepts(prev => [...prev, { ...data, memberCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
      closeForm()
    } catch {
      setFormError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit() {
    if (!editingId || !formName.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/departments/${editingId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: formName, slug: formSlug || deriveSlug(formName), color: formColor }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Failed to update'); return }
      setDepts(prev =>
        prev.map(d => d.id === editingId ? { ...d, name: data.name, slug: data.slug, color: data.color } : d)
            .sort((a, b) => a.name.localeCompare(b.name))
      )
      closeForm()
    } catch {
      setFormError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setDepts(prev => prev.filter(d => d.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="glass-card" style={{ padding: 28 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Departments
          <span
            className="ml-2 text-[13px] font-normal"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {depts.length}
          </span>
        </h2>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-[9px] transition-all"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
          >
            <Plus size={14} strokeWidth={2} />
            New Department
          </button>
        )}
      </div>

      {/* Create / Edit inline form */}
      {(showCreate || editingId) && (
        <div
          className="mb-5 p-4 rounded-[12px]"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            {showCreate ? 'New Department' : 'Edit Department'}
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <Field label="Name">
                  <input
                    type="text"
                    placeholder="e.g. Engineering"
                    value={formName}
                    onChange={e => {
                      setFormName(e.target.value)
                      if (showCreate) setFormSlug(deriveSlug(e.target.value))
                    }}
                    className="w-full text-[14px] px-3 py-2 rounded-[9px]"
                    style={inputStyle}
                    autoFocus
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Slug">
                  <input
                    type="text"
                    placeholder="engineering"
                    value={formSlug}
                    onChange={e => setFormSlug(e.target.value)}
                    className="w-full text-[14px] px-3 py-2 rounded-[9px]"
                    style={inputStyle}
                  />
                </Field>
              </div>
            </div>

            <Field label="Color">
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setFormColor(c)}
                    className="w-7 h-7 rounded-full transition-transform"
                    style={{
                      background: c,
                      outline:    formColor === c ? `3px solid ${c}` : '3px solid transparent',
                      outlineOffset: 2,
                      transform:  formColor === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </Field>

            {formError && (
              <p className="text-[12px]" style={{ color: 'var(--color-red)' }}>{formError}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={closeForm}
                className="text-[13px] px-3 py-1.5 rounded-[9px]"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={showCreate ? handleCreate : handleEdit}
                disabled={saving}
                className="text-[13px] font-medium px-3 py-1.5 rounded-[9px]"
                style={{
                  background: saving ? 'rgba(0,122,255,0.5)' : 'var(--color-blue)',
                  color:      '#fff',
                }}
              >
                {saving ? 'Saving…' : showCreate ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {depts.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-12"
          style={{ textAlign: 'center' }}
        >
          <Building2 size={40} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            No departments yet. {isAdmin && 'Create one above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {depts.map(d => (
            <div
              key={d.id}
              className="flex items-center gap-3 px-3 py-3 rounded-[10px]"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {/* Color swatch */}
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: d.color ?? 'var(--text-tertiary)' }}
              />

              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {d.name}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                  {d.slug}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                  {d.memberCount} {d.memberCount === 1 ? 'member' : 'members'}
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(d)}
                      className="p-1.5 rounded-[7px] transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                      aria-label={`Edit ${d.name}`}
                    >
                      <Edit2 size={14} strokeWidth={1.5} />
                    </button>
                    <DeleteButton
                      onConfirm={() => handleDelete(d.id)}
                      loading={deletingId === d.id}
                      aria-label={`Delete ${d.name}`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeleteButton({
  onConfirm,
  loading,
}: {
  onConfirm: () => void
  loading:   boolean
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => { setConfirming(false); onConfirm() }}
          disabled={loading}
          className="text-[11px] font-medium px-2 py-1 rounded-[6px]"
          style={{ background: 'var(--color-red)', color: '#fff' }}
        >
          {loading ? '…' : 'Delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="p-1.5 rounded-[7px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-[7px] transition-colors"
      style={{ color: 'var(--text-tertiary)' }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-red)'; e.currentTarget.style.background = 'rgba(255,59,48,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
    >
      <Trash2 size={14} strokeWidth={1.5} />
    </button>
  )
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light',  label: 'Light',  Icon: Sun },
    { value: 'dark',   label: 'Dark',   Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ] as const

  return (
    <div className="glass-card" style={{ padding: 28 }}>
      <h2 className="text-[17px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Appearance
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-secondary)' }}>
        Choose how MeetPlanner looks to you.
      </p>

      <div className="flex gap-3 flex-wrap">
        {options.map(({ value, label, Icon }) => {
          const active = theme === value
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className="flex flex-col items-center gap-3 rounded-[14px] transition-all"
              style={{
                padding:     '20px 28px',
                border:      `2px solid ${active ? 'var(--color-blue)' : 'var(--border)'}`,
                background:  active ? 'rgba(0,122,255,0.06)' : 'var(--bg-secondary)',
                color:       active ? 'var(--color-blue)' : 'var(--text-secondary)',
                minWidth:    110,
                transition:  'all 150ms ease-out',
              }}
              aria-pressed={active}
            >
              <Icon size={24} strokeWidth={1.5} />
              <span className="text-[13px] font-medium">{label}</span>
              {active && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--color-blue)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[12px] mt-4" style={{ color: 'var(--text-tertiary)' }}>
        System automatically matches your OS preference. Your choice is saved locally.
      </p>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function Modal({
  title, children, onClose,
}: {
  title:    string
  children: React.ReactNode
  onClose:  () => void
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
      />
      <div
        className="fixed z-50 left-1/2 top-1/2"
        style={{
          transform:    'translate(-50%, -50%)',
          width:        440,
          background:   'var(--bg-primary)',
          borderRadius: 'var(--radius-xl)',
          boxShadow:    'var(--shadow-xl)',
          border:       '1px solid var(--border)',
          padding:      28,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsTab({ currentUser }: { currentUser: CurrentUser }) {
  const isEligible = currentUser.role === 'admin' || currentUser.role === 'manager'
  const [dailyReport,  setDailyReport]  = useState(currentUser.dailyReportEmail)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [pushEnabled,  setPushEnabled]  = useState(false)
  const [pushLoading,  setPushLoading]  = useState(false)
  const [pushSupport,  setPushSupport]  = useState(false)

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setPushSupport(supported)
    if (!supported) return
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub))
    ).catch(() => {})
  }, [])

  async function togglePush(enable: boolean) {
    setPushLoading(true)
    try {
      const { subscribeToPush, unsubscribeFromPush } = await import('@/components/pwa/PWAInit')
      if (enable) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') { setPushLoading(false); return }
        const sub = await subscribeToPush()
        setPushEnabled(!!sub)
      } else {
        const ok = await unsubscribeFromPush()
        if (ok) setPushEnabled(false)
      }
    } finally {
      setPushLoading(false)
    }
  }

  async function toggleDailyReport(value: boolean) {
    setDailyReport(value)
    setSaving(true)
    try {
      await fetch('/api/me/preferences', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dailyReportEmail: value }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-card" style={{ padding: 28 }}>
      <h2 className="text-[17px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Notification Preferences
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-secondary)' }}>
        Control which automated emails you receive.
      </p>

      <div className="flex flex-col gap-4">
        {/* Daily report toggle */}
        <div
          className="flex items-start justify-between gap-4 p-4 rounded-[12px]"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <div>
            <p className="text-[14px] font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Daily Progress Report
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              Receive an AI-generated summary of team progress every day at 5:00 PM.
            </p>
            {!isEligible && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Daily reports are sent to managers and admins only.
              </p>
            )}
          </div>

          <button
            onClick={() => isEligible && !saving && toggleDailyReport(!dailyReport)}
            disabled={saving || !isEligible}
            aria-pressed={dailyReport}
            aria-label="Toggle daily report email"
            style={{
              position:        'relative',
              width:           44,
              height:          26,
              borderRadius:    13,
              background:      dailyReport && isEligible ? 'var(--color-green)' : 'var(--border)',
              border:          'none',
              cursor:          isEligible ? 'pointer' : 'not-allowed',
              transition:      'background 200ms',
              flexShrink:      0,
              opacity:         !isEligible ? 0.4 : 1,
            }}
          >
            <span
              style={{
                position:   'absolute',
                top:        3,
                left:       dailyReport && isEligible ? 21 : 3,
                width:      20,
                height:     20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow:  '0 1px 3px rgba(0,0,0,0.15)',
                transition: 'left 200ms',
              }}
            />
          </button>
        </div>

        {/* Push notifications toggle */}
        {pushSupport && (
          <div
            className="flex items-start justify-between gap-4 p-4 rounded-[12px]"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <div>
              <p className="text-[14px] font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>
                Push Notifications
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                Get notified when tasks are assigned, overdue, or meetings start — even when the app isn&apos;t open.
              </p>
            </div>
            <button
              onClick={() => !pushLoading && togglePush(!pushEnabled)}
              disabled={pushLoading}
              aria-pressed={pushEnabled}
              aria-label="Toggle push notifications"
              style={{
                position:    'relative',
                width:        44,
                height:       26,
                borderRadius: 13,
                background:   pushEnabled ? 'var(--color-green)' : 'var(--border)',
                border:       'none',
                cursor:       pushLoading ? 'wait' : 'pointer',
                transition:   'background 200ms',
                flexShrink:   0,
                opacity:      pushLoading ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  position:     'absolute',
                  top:           3,
                  left:          pushEnabled ? 21 : 3,
                  width:         20,
                  height:        20,
                  borderRadius:  '50%',
                  background:    '#fff',
                  boxShadow:     '0 1px 3px rgba(0,0,0,0.15)',
                  transition:    'left 200ms',
                }}
              />
            </button>
          </div>
        )}
      </div>

      {saved && (
        <p className="text-[12px] mt-3" style={{ color: 'var(--color-green)' }}>
          Preferences saved.
        </p>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border:      '1px solid var(--border)',
  background:  'var(--bg-primary)',
  color:       'var(--text-primary)',
  outline:     'none',
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

type GitHubStatus = {
  connected:  boolean
  login?:     string
  avatarUrl?: string | null
  repos?:     { fullName: string; private: boolean }[]
}

function IntegrationsTab() {
  const searchParams = useSearchParams()
  const [gh, setGh]           = useState<GitHubStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, startDisconnect] = useTransition()

  useEffect(() => {
    fetch('/api/github/repos').then(r => r.json()).then(setGh).finally(() => setLoading(false))
  }, [])

  const statusMsg = searchParams.get('github')

  function disconnect() {
    startDisconnect(async () => {
      await fetch('/api/github/repos', { method: 'DELETE' })
      setGh({ connected: false })
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Integrations</h3>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Connect external services to enhance your workflow.</p>
      </div>

      {statusMsg === 'connected' && (
        <div className="text-xs px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: '#34C75915', color: '#34C759' }}>
          <Check size={13} /> GitHub connected successfully.
        </div>
      )}
      {statusMsg === 'error' && (
        <div className="text-xs px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--color-red)' }}>
          <AlertCircle size={13} /> GitHub connection failed. Please try again.
        </div>
      )}

      {/* GitHub */}
      <div className="glass-card rounded-2xl p-5" style={{ border: '1px solid var(--border-primary)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
              <GitBranch size={20} style={{ color: 'var(--text-primary)' }} />
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>GitHub</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Close tasks automatically when a PR is merged.
              </p>
            </div>
          </div>
          {loading ? (
            <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          ) : gh?.connected ? (
            <button
              onClick={disconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--color-red)' }}
            >
              <Unlink size={12} /> Disconnect
            </button>
          ) : (
            <a
              href="/api/github/connect"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl text-white font-medium"
              style={{ background: '#24292e' }}
            >
              <GitBranch size={12} /> Connect GitHub
            </a>
          )}
        </div>

        {gh?.connected && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-3">
              {gh.avatarUrl && <img src={gh.avatarUrl} alt="" className="h-5 w-5 rounded-full" />}
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>@{gh.login}</span>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              To auto-close tasks on PR merge, add <code className="font-mono">Closes: &lt;task-uuid&gt;</code> in your PR description, then configure a GitHub webhook pointing to:
            </p>
            <code className="block text-[11px] font-mono px-3 py-2 rounded-lg break-all" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/github
            </code>
          </div>
        )}
      </div>

      {/* Zapier / Make callout */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Zapier & Make</p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Use Outbound Webhooks in each Project's Webhooks tab to push task events to Zapier, Make, or any HTTPS endpoint. Supports <code className="font-mono">task.created</code>, <code className="font-mono">task.status_changed</code>, and more.
        </p>
      </div>
    </div>
  )
}
