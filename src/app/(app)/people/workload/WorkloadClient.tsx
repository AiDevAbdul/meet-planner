'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, ChevronDown, ChevronRight, Plus, X, AlertTriangle,
  RefreshCw, Calendar,
} from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'

// ─── Types ─────────────────────────────────────────────────────────────────────

type UserRow = {
  id:           string
  name:         string
  email:        string
  avatarUrl:    string | null
  role:         string
  departmentId: string | null
}

type TaskRow = {
  id:         string
  title:      string
  status:     string
  priority:   string
  dueDate:    string | null
  projectId:  string | null
  assigneeId: string | null
}

type AvailRow = {
  id:             string
  userId:         string
  date:           string
  type:           string
  hoursAvailable: number
  note:           string | null
}

type SkillRow = {
  userId: string
  skill:  string
}

type DeptRow = {
  id:    string
  name:  string
  slug:  string
  color: string | null
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#FF3B30',
  high:     '#FF9500',
  normal:   '#007AFF',
  low:      '#8E8E93',
}

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  admin:   { bg: 'rgba(255,59,48,0.12)',   text: '#FF3B30', label: 'Admin' },
  manager: { bg: 'rgba(255,149,0,0.12)',   text: '#FF9500', label: 'Manager' },
  member:  { bg: 'rgba(0,122,255,0.12)',   text: '#007AFF', label: 'Member' },
  viewer:  { bg: 'rgba(142,142,147,0.15)', text: '#8E8E93', label: 'Viewer' },
}

const AVAIL_COLORS: Record<string, string> = {
  holiday: 'rgba(255,59,48,0.15)',
  leave:   'rgba(255,149,0,0.15)',
  partial: 'rgba(142,142,147,0.12)',
}

const DAILY_CAPACITY = 8
const WORK_DAYS      = 10

// ─── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function getWorkDays(start: string, count: number): string[] {
  const days: string[] = []
  let cur = start
  while (days.length < count) {
    const dow = new Date(cur).getUTCDay()
    if (dow !== 0 && dow !== 6) days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr)
  const dow = d.getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function workloadColor(score: number): { bar: string; bg: string; text: string; label: string | null } {
  if (score > 80) return { bar: '#FF3B30', bg: 'rgba(255,59,48,0.1)',  text: '#FF3B30', label: 'Overloaded' }
  if (score > 60) return { bar: '#FF9500', bg: 'rgba(255,149,0,0.1)', text: '#FF9500', label: null }
  return             { bar: '#34C759', bg: 'rgba(52,199,89,0.1)',  text: '#34C759', label: null }
}

function calcWorkloadScore(
  taskCount: number,
  availability: AvailRow[],
): number {
  const unavailDays    = availability.filter(a => a.type !== 'partial').length
  const partialLost    = availability
    .filter(a => a.type === 'partial')
    .reduce((s, a) => s + (DAILY_CAPACITY - a.hoursAvailable), 0)
  const capacity       = (WORK_DAYS - unavailDays) * DAILY_CAPACITY - partialLost
  const estimatedHours = taskCount * 4
  return capacity > 0 ? Math.min(100, Math.round((estimatedHours / capacity) * 100)) : taskCount > 0 ? 100 : 0
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_STYLES[role] ?? ROLE_STYLES.member
  return (
    <span
      className="inline-flex items-center font-medium shrink-0"
      style={{ background: cfg.bg, color: cfg.text, fontSize: 11, padding: '2px 7px', borderRadius: 6 }}
    >
      {cfg.label}
    </span>
  )
}

function SkillChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium"
      style={{
        background: 'rgba(0,122,255,0.1)',
        color: '#007AFF',
        padding: '2px 8px',
        borderRadius: 20,
      }}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex items-center justify-center rounded-full"
          style={{ width: 12, height: 12, background: 'rgba(0,122,255,0.2)', color: '#007AFF' }}
          aria-label={`Remove skill ${label}`}
        >
          <X size={8} />
        </button>
      )}
    </span>
  )
}

// ─── Reassign Popover ──────────────────────────────────────────────────────────

function ReassignPopover({
  task,
  users,
  onClose,
  onSaved,
}: {
  task:    TaskRow
  users:   UserRow[]
  onClose: () => void
  onSaved: (taskId: string, newAssigneeId: string) => void
}) {
  const [selectedUserId, setSelectedUserId] = useState(task.assigneeId ?? '')
  const [saving, setSaving]                 = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [onClose])

  async function handleSave() {
    if (!selectedUserId || selectedUserId === task.assigneeId) { onClose(); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: selectedUserId }),
      })
      if (res.ok) {
        onSaved(task.id, selectedUserId)
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 shadow-2xl"
      style={{
        top: '100%',
        left: 0,
        marginTop: 6,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 14,
        minWidth: 220,
      }}
    >
      <p
        className="text-[12px] font-semibold mb-1 truncate"
        style={{ color: 'var(--text-primary)', maxWidth: 190 }}
      >
        {task.title}
      </p>
      <p className="text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
        Reassign to
      </p>
      <select
        value={selectedUserId}
        onChange={e => setSelectedUserId(e.target.value)}
        className="w-full text-[13px] rounded-md mb-3"
        style={{
          padding: '6px 8px',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          outline: 'none',
        }}
        aria-label="Select assignee"
      >
        <option value="">Unassigned</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 text-[12px] font-medium rounded-md"
          style={{
            padding: '5px 10px',
            background: 'var(--color-blue)',
            color: '#fff',
            border: 'none',
            opacity: saving ? 0.7 : 1,
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 text-[12px] font-medium rounded-md"
          style={{
            padding: '5px 10px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Add Availability Modal ────────────────────────────────────────────────────

function AddAvailabilityModal({
  users,
  onClose,
  onSaved,
}: {
  users:   UserRow[]
  onClose: () => void
  onSaved: (row: AvailRow) => void
}) {
  const [userId,         setUserId]         = useState(users[0]?.id ?? '')
  const [date,           setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [type,           setType]           = useState<'holiday' | 'leave' | 'partial'>('leave')
  const [hoursAvailable, setHoursAvailable] = useState(4)
  const [note,           setNote]           = useState('')
  const [saving,         setSaving]         = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, type, hoursAvailable: type === 'partial' ? hoursAvailable : 0, note: note || null }),
      })
      if (res.ok) {
        const json = await res.json()
        onSaved(json.data)
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="shadow-2xl"
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 24,
          width: 360,
          maxWidth: '90vw',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Add Availability Block
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Team member</span>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="text-[13px] rounded-md"
              style={{ padding: '7px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}
            >
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Date</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-[13px] rounded-md"
              style={{ padding: '7px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Type</span>
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
              className="text-[13px] rounded-md"
              style={{ padding: '7px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}
            >
              <option value="leave">Leave</option>
              <option value="holiday">Holiday</option>
              <option value="partial">Partial day</option>
            </select>
          </label>

          {type === 'partial' && (
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Hours available</span>
              <input
                type="number"
                min={0}
                max={8}
                value={hoursAvailable}
                onChange={e => setHoursAvailable(Number(e.target.value))}
                className="text-[13px] rounded-md"
                style={{ padding: '7px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}
              />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. National holiday"
              className="text-[13px] rounded-md"
              style={{ padding: '7px 10px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none' }}
            />
          </label>

          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-[13px] font-medium rounded-lg"
              style={{
                padding: '8px',
                background: 'var(--color-blue)',
                color: '#fff',
                border: 'none',
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Add block'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 text-[13px] font-medium rounded-lg"
              style={{
                padding: '8px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Person Row ────────────────────────────────────────────────────────────────

function PersonRow({
  user,
  tasks,
  availability,
  skills: initialSkills,
  allUsers,
  windowDays,
  today,
  onReassign,
  onAvailAdded,
}: {
  user:         UserRow
  tasks:        TaskRow[]
  availability: AvailRow[]
  skills:       string[]
  allUsers:     UserRow[]
  windowDays:   string[]
  today:        string
  onReassign:   (taskId: string, newAssigneeId: string) => void
  onAvailAdded: (row: AvailRow) => void
}) {
  const [expanded,          setExpanded]          = useState(false)
  const [skills,            setSkills]            = useState<string[]>(initialSkills)
  const [newSkill,          setNewSkill]          = useState('')
  const [addingSkill,       setAddingSkill]       = useState(false)
  const [activeTaskPopover, setActiveTaskPopover] = useState<string | null>(null)

  const taskCount   = tasks.length
  const overdueCount = tasks.filter(t => t.dueDate && t.dueDate < today).length
  const score        = calcWorkloadScore(taskCount, availability)
  const colors       = workloadColor(score)

  const availDates = new Set(availability.map(a => a.date))

  async function addSkill() {
    const s = newSkill.trim()
    if (!s || skills.includes(s)) { setNewSkill(''); return }
    const res = await fetch('/api/user-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, skill: s }),
    })
    if (res.ok) {
      setSkills(prev => [...prev, s])
      setNewSkill('')
    }
  }

  async function removeSkill(skill: string) {
    const res = await fetch('/api/user-skills', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, skill }),
    })
    if (res.ok) setSkills(prev => prev.filter(s => s !== skill))
  }

  const dueDatesOnWindow = new Set(tasks.map(t => t.dueDate).filter(Boolean) as string[])

  return (
    <div
      className="glass-card mb-3"
      style={{ overflow: 'visible' }}
    >
      {/* Main row */}
      <div className="flex items-stretch gap-4 p-4">
        {/* Left: identity */}
        <div className="flex items-start gap-3" style={{ width: 220, flexShrink: 0 }}>
          <Avatar name={user.name} src={user.avatarUrl ?? undefined} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {user.name}
              </span>
              {colors.label && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {colors.label}
                </span>
              )}
            </div>
            <RoleBadge role={user.role} />

            {/* Workload bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {taskCount} task{taskCount !== 1 ? 's' : ''}
                  {overdueCount > 0 && (
                    <span className="ml-1.5" style={{ color: '#FF3B30' }}>
                      · {overdueCount} overdue
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-medium" style={{ color: colors.text }}>
                  {score}%
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${score}%`, background: colors.bar }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: timeline */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="relative flex items-center" style={{ height: 56, minWidth: windowDays.length * 36 }}>
            {windowDays.map((day, i) => {
              const isAvailBlocked = availDates.has(day)
              const availEntry     = availability.find(a => a.date === day)
              const isToday        = day === today
              const tasksOnDay     = tasks.filter(t => t.dueDate === day)

              return (
                <div
                  key={day}
                  className="relative flex flex-col items-center justify-start"
                  style={{
                    width:   36,
                    height:  56,
                    flexShrink: 0,
                    background: isAvailBlocked
                      ? (availEntry ? AVAIL_COLORS[availEntry.type] : 'rgba(142,142,147,0.12)')
                      : isToday
                        ? 'rgba(0,122,255,0.06)'
                        : 'transparent',
                    borderRadius: 4,
                    borderLeft: isToday ? '2px solid rgba(0,122,255,0.4)' : '1px solid var(--border)',
                  }}
                  title={isAvailBlocked ? `${availEntry?.type} — ${availEntry?.note ?? day}` : undefined}
                >
                  {/* Day label */}
                  <span
                    className="text-[9px] font-medium mt-1"
                    style={{ color: isToday ? '#007AFF' : 'var(--text-tertiary)' }}
                  >
                    {new Date(day + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })}
                    {'\n'}
                    {new Date(day + 'T00:00:00Z').getUTCDate()}
                  </span>

                  {/* Task markers */}
                  <div className="flex flex-wrap gap-0.5 mt-1 px-0.5 justify-center">
                    {tasksOnDay.slice(0, 3).map(task => (
                      <div key={task.id} className="relative" style={{ position: 'relative' }}>
                        <button
                          onClick={() => setActiveTaskPopover(prev => prev === task.id ? null : task.id)}
                          className="rounded-sm transition-transform hover:scale-110"
                          style={{
                            width:      10,
                            height:     10,
                            background: PRIORITY_COLORS[task.priority] ?? '#007AFF',
                            border:     'none',
                            cursor:     'pointer',
                          }}
                          aria-label={`Task: ${task.title}`}
                          title={`${task.title} · ${task.priority}`}
                        />
                        {activeTaskPopover === task.id && (
                          <ReassignPopover
                            task={task}
                            users={allUsers}
                            onClose={() => setActiveTaskPopover(null)}
                            onSaved={onReassign}
                          />
                        )}
                      </div>
                    ))}
                    {tasksOnDay.length > 3 && (
                      <span
                        className="text-[8px] font-bold"
                        style={{ color: 'var(--text-tertiary)', lineHeight: '10px' }}
                      >
                        +{tasksOnDay.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center justify-center rounded-lg self-center shrink-0"
          style={{
            width: 28, height: 28,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          aria-label={expanded ? 'Collapse skills' : 'Expand skills'}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Expanded skills area */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-1"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Skills
          </p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {skills.map(s => (
              <SkillChip key={s} label={s} onRemove={() => removeSkill(s)} />
            ))}

            {addingSkill ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { addSkill(); setAddingSkill(false) }
                    if (e.key === 'Escape') { setNewSkill(''); setAddingSkill(false) }
                  }}
                  placeholder="e.g. React"
                  className="text-[12px] rounded-lg"
                  style={{
                    padding: '3px 8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid #007AFF',
                    outline: 'none',
                    width: 110,
                  }}
                />
                <button
                  onClick={() => { addSkill(); setAddingSkill(false) }}
                  className="text-[11px] font-medium rounded-lg"
                  style={{ padding: '3px 8px', background: '#007AFF', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setNewSkill(''); setAddingSkill(false) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                  aria-label="Cancel"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingSkill(true)}
                className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full"
                style={{
                  padding: '2px 8px',
                  background: 'var(--bg-secondary)',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Plus size={10} />
                Add skill
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main client ───────────────────────────────────────────────────────────────

export function WorkloadClient({
  users,
  departments,
  activeTasks: initialTasks,
  availability: initialAvailability,
  skills: initialSkills,
  today,
  currentUserId,
}: {
  users:          UserRow[]
  departments:    DeptRow[]
  activeTasks:    TaskRow[]
  availability:   AvailRow[]
  skills:         SkillRow[]
  today:          string
  currentUserId:  string
}) {
  const router = useRouter()

  const monday = getMondayOf(today)
  const [windowStart,   setWindowStart]   = useState(monday)
  const [filterDeptId,  setFilterDeptId]  = useState<string | null>(null)
  const [showAvailModal, setShowAvailModal] = useState(false)
  const [tasks,          setTasks]          = useState<TaskRow[]>(initialTasks)
  const [availability,   setAvailability]   = useState<AvailRow[]>(initialAvailability)

  const windowDays = useMemo(() => getWorkDays(windowStart, WORK_DAYS), [windowStart])

  const filteredUsers = filterDeptId
    ? users.filter(u => u.departmentId === filterDeptId)
    : users

  const skillsByUser = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const s of initialSkills) {
      if (!map.has(s.userId)) map.set(s.userId, [])
      map.get(s.userId)!.push(s.skill)
    }
    return map
  }, [initialSkills])

  function handleReassign(taskId: string, newAssigneeId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigneeId: newAssigneeId } : t))
  }

  function handleAvailAdded(row: AvailRow) {
    setAvailability(prev => [...prev, row])
  }

  const windowLabel = `${fmtDate(windowDays[0])} – ${fmtDate(windowDays[windowDays.length - 1])}`

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-[10px]"
          style={{ background: 'rgba(0,122,255,0.1)' }}
        >
          <Users size={18} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Workload
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Capacity planning — {filteredUsers.length} people
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {/* Date range navigation */}
        <div
          className="flex items-center gap-1 rounded-lg"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '4px 4px' }}
        >
          <button
            onClick={() => setWindowStart(s => addDays(s, -14))}
            className="rounded-md px-2 py-1 text-[12px] font-medium"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Previous 2 weeks"
          >
            ←
          </button>
          <span className="text-[12px] font-medium px-1" style={{ color: 'var(--text-primary)', minWidth: 160, textAlign: 'center' }}>
            {windowLabel}
          </span>
          <button
            onClick={() => setWindowStart(s => addDays(s, 14))}
            className="rounded-md px-2 py-1 text-[12px] font-medium"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Next 2 weeks"
          >
            →
          </button>
        </div>

        {/* Reset to today */}
        <button
          onClick={() => setWindowStart(getMondayOf(today))}
          className="flex items-center gap-1.5 text-[12px] font-medium rounded-lg"
          style={{
            padding: '6px 10px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          aria-label="Reset to current week"
        >
          <RefreshCw size={12} />
          Today
        </button>

        {/* Department filter */}
        <select
          value={filterDeptId ?? ''}
          onChange={e => setFilterDeptId(e.target.value || null)}
          className="text-[12px] font-medium rounded-lg"
          style={{
            padding: '6px 10px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            outline: 'none',
            cursor: 'pointer',
          }}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Add availability */}
        <button
          onClick={() => setShowAvailModal(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium rounded-lg ml-auto"
          style={{
            padding: '6px 14px',
            background: 'var(--color-blue)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,122,255,0.25)',
          }}
        >
          <Calendar size={13} />
          Add Availability
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <LegendDot color="#34C759" label="Healthy (< 60%)" />
        <LegendDot color="#FF9500" label="Moderate (60–80%)" />
        <LegendDot color="#FF3B30" label="Overloaded (> 80%)" />
        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          · Task markers by due date (color = priority)
        </span>
      </div>

      {/* Priority legend */}
      <div className="flex items-center gap-4 mb-5">
        {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
          <LegendDot key={p} color={c} label={p.charAt(0).toUpperCase() + p.slice(1)} size={10} />
        ))}
        <div className="flex items-center gap-1.5">
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(255,59,48,0.15)', display: 'inline-block' }} />
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Holiday/Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(142,142,147,0.15)', display: 'inline-block' }} />
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Partial day</span>
        </div>
      </div>

      {/* People rows */}
      {filteredUsers.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center gap-3 p-16" style={{ textAlign: 'center' }}>
          <Users size={40} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
            No members in this department.
          </p>
        </div>
      ) : (
        filteredUsers.map(user => {
          const userTasks  = tasks.filter(t => t.assigneeId === user.id)
          const userAvail  = availability.filter(a => a.userId === user.id)
          const userSkillsArr = skillsByUser.get(user.id) ?? []

          return (
            <PersonRow
              key={user.id}
              user={user}
              tasks={userTasks}
              availability={userAvail}
              skills={userSkillsArr}
              allUsers={users}
              windowDays={windowDays}
              today={today}
              onReassign={handleReassign}
              onAvailAdded={handleAvailAdded}
            />
          )
        })
      )}

      {/* Add availability modal */}
      {showAvailModal && (
        <AddAvailabilityModal
          users={users}
          onClose={() => setShowAvailModal(false)}
          onSaved={handleAvailAdded}
        />
      )}
    </div>
  )
}

function LegendDot({ color, label, size = 10 }: { color: string; label: string; size?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  )
}
