'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Pencil, Mail,
  FileText, Video, ArrowLeft, Calendar, Users, X, Loader2, Check,
} from 'lucide-react'
import Link from 'next/link'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badges'
import { Avatar } from '@/components/layout/Sidebar'
import { formatDate } from '@/lib/utils'

type Attendee = { name: string; email: string }
type Assignee = { id: string; name: string; email: string; avatarUrl: string | null } | null

type Task = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  assigneeId: string | null
  dueDate: string | null
  position: number | null
  assignee: Assignee
}

type Meeting = {
  id: string
  title: string
  source: string
  summary: string | null
  date: string | null
  decisions: string[]
  attendees: Attendee[]
  rawContent: string | null
  createdAt: Date
}

type User = { id: string; name: string; email: string; avatarUrl: string | null }

type Props = {
  meeting: Meeting
  tasks: Task[]
  allUsers: User[]
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  manual:      { label: 'Manual',      icon: FileText, color: 'var(--color-blue)' },
  gmail:       { label: 'Gmail',       icon: Mail,     color: 'var(--color-red)' },
  google_meet: { label: 'Google Meet', icon: Video,    color: 'var(--color-green)' },
}

export function MeetingDetailClient({ meeting, tasks: initialTasks, allUsers }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [editingTask, setEditingTask] = useState<string | null>(null)

  const src = SOURCE_CONFIG[meeting.source] ?? SOURCE_CONFIG.manual
  const SrcIcon = src.icon

  const triage    = tasks.filter(t => t.status === 'triage')
  const approved  = tasks.filter(t => t.status !== 'triage' && t.status !== 'done')
  const done      = tasks.filter(t => t.status === 'done')
  const rejected  = tasks.filter(t => (t as any)._rejected)

  async function approveTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'todo' }),
    })
    if (res.ok) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'todo' } : t))
    }
  }

  async function rejectTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  function startEdit(id: string) {
    setEditingTask(id)
  }

  function cancelEdit() {
    setEditingTask(null)
  }

  async function saveEdit(id: string, updates: Partial<Task>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updates),
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data.task, assignee: updates.assigneeId ? (allUsers.find(u => u.id === updates.assigneeId) ?? null) : t.assignee } : t))
      setEditingTask(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/meetings"
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-5 transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft size={15} strokeWidth={1.5} />
        All Meetings
      </Link>

      {/* Meeting Header Card */}
      <div className="glass-card p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Source badge */}
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-3"
              style={{ background: `${src.color}18`, color: src.color }}
            >
              <SrcIcon size={11} strokeWidth={2} />
              {src.label}
            </span>
            <h1 className="text-[22px] font-bold leading-tight mb-2" style={{ color: 'var(--text-primary)' }}>
              {meeting.title}
            </h1>
            <div className="flex items-center gap-4 flex-wrap">
              {meeting.date && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar size={14} strokeWidth={1.5} />
                  {formatDate(meeting.date)}
                </span>
              )}
              {meeting.attendees.length > 0 && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Users size={14} strokeWidth={1.5} />
                  {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Attendee avatar stack */}
          {meeting.attendees.length > 0 && (
            <div className="flex items-center flex-shrink-0">
              {meeting.attendees.slice(0, 5).map((att, i) => (
                <div
                  key={att.email || i}
                  style={{ marginLeft: i === 0 ? 0 : -10, zIndex: meeting.attendees.length - i }}
                  title={att.name}
                >
                  <Avatar name={att.name} size={32} />
                </div>
              ))}
              {meeting.attendees.length > 5 && (
                <div
                  className="flex items-center justify-center text-[11px] font-bold"
                  style={{
                    marginLeft: -10,
                    width: 32, height: 32,
                    borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    border: '2px solid var(--border)',
                    color: 'var(--text-secondary)',
                    zIndex: 0,
                  }}
                >
                  +{meeting.attendees.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Summary — Collapsible */}
      {meeting.summary && (
        <div
          className="glass-card mb-5 overflow-hidden"
          style={{ transition: 'all var(--duration-normal) var(--ease-out)' }}
        >
          <button
            className="w-full flex items-center justify-between p-5 text-left"
            onClick={() => setSummaryOpen(o => !o)}
            aria-expanded={summaryOpen}
          >
            <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              AI Summary
            </span>
            {summaryOpen
              ? <ChevronUp size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
              : <ChevronDown size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
            }
          </button>
          {summaryOpen && (
            <div className="px-5 pb-5">
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {meeting.summary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Decisions */}
      {meeting.decisions.length > 0 && (
        <div className="glass-card p-5 mb-5">
          <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Key Decisions
          </h2>
          <ul className="flex flex-col gap-2">
            {meeting.decisions.map((d, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2
                  size={16}
                  strokeWidth={1.5}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--color-green)' }}
                />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted Tasks */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Extracted Tasks
          </h2>
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            {triage.length} pending · {approved.length} approved
          </span>
        </div>

        {tasks.length === 0 && (
          <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
            No tasks were extracted from this meeting.
          </p>
        )}

        {/* Triage tasks */}
        {triage.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Needs Review
            </p>
            <div className="flex flex-col gap-2">
              {triage.map(task => (
                editingTask === task.id
                  ? <TaskEditForm
                      key={task.id}
                      task={task}
                      allUsers={allUsers}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                    />
                  : <TaskCard
                      key={task.id}
                      task={task}
                      onApprove={() => approveTask(task.id)}
                      onReject={() => rejectTask(task.id)}
                      onEdit={() => startEdit(task.id)}
                    />
              ))}
            </div>
          </div>
        )}

        {/* Approved tasks */}
        {approved.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Approved
            </p>
            <div className="flex flex-col gap-2">
              {approved.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  approved
                  onEdit={() => startEdit(task.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Done tasks */}
        {done.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Done
            </p>
            <div className="flex flex-col gap-2 opacity-60">
              {done.map(task => (
                <TaskCard key={task.id} task={task} done />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onApprove,
  onReject,
  onEdit,
  approved,
  done,
}: {
  task: Task
  onApprove?: () => void
  onReject?: () => void
  onEdit?: () => void
  approved?: boolean
  done?: boolean
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handleApprove() {
    setLoading('approve')
    await onApprove?.()
    setLoading(null)
  }

  async function handleReject() {
    setLoading('reject')
    await onReject?.()
    setLoading(null)
  }

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-[10px] transition-all"
      style={{
        background: 'var(--bg-secondary)',
        border:     '1px solid var(--border)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {task.title}
          </span>
          <PriorityBadge priority={task.priority} small />
          {(approved || done) && <StatusBadge status={task.status} small />}
        </div>
        {task.description && (
          <p className="text-[12px] leading-relaxed mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {task.assignee && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              <Avatar name={task.assignee.name} size={18} />
              {task.assignee.name}
            </span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              <Calendar size={11} strokeWidth={1.5} />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!done && (
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {!approved && onApprove && (
            <button
              onClick={handleApprove}
              disabled={!!loading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white transition-all hover:opacity-90"
              style={{
                background:   'var(--color-green)',
                borderRadius: 'var(--radius-sm)',
              }}
              aria-label="Approve task"
            >
              {loading === 'approve'
                ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
                : <Check size={12} strokeWidth={2} />
              }
              Approve
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-[6px] transition-all hover:opacity-70"
              style={{
                background: 'var(--bg-primary)',
                border:     '1px solid var(--border)',
                color:      'var(--text-secondary)',
              }}
              aria-label="Edit task"
            >
              <Pencil size={13} strokeWidth={1.5} />
            </button>
          )}
          {!approved && onReject && (
            <button
              onClick={handleReject}
              disabled={!!loading}
              className="p-1.5 rounded-[6px] transition-all hover:opacity-70"
              style={{
                background: 'rgba(255,59,48,0.10)',
                color:      'var(--color-red)',
              }}
              aria-label="Reject task"
            >
              {loading === 'reject'
                ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
                : <XCircle size={13} strokeWidth={1.5} />
              }
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Task Edit Form ───────────────────────────────────────────────────────────

function TaskEditForm({
  task,
  allUsers,
  onSave,
  onCancel,
}: {
  task: Task
  allUsers: User[]
  onSave: (id: string, updates: Partial<Task>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle]           = useState(task.title)
  const [description, setDesc]      = useState(task.description ?? '')
  const [priority, setPriority]     = useState(task.priority)
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
  const [dueDate, setDueDate]       = useState(task.dueDate ?? '')
  const [saving, setSaving]         = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(task.id, {
      title,
      description: description || null,
      priority:    priority as Task['priority'],
      assigneeId:  assigneeId || null,
      dueDate:     dueDate || null,
      status:      'todo',
    } as Partial<Task>)
    setSaving(false)
  }

  const inputStyle = {
    background:   'var(--bg-primary)',
    color:        'var(--text-primary)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding:      '6px 10px',
    fontSize:     13,
    fontFamily:   'inherit',
    width:        '100%',
    outline:      'none',
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-[10px]"
      style={{
        background: 'var(--bg-secondary)',
        border:     '1px solid var(--color-blue)',
      }}
    >
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title"
        style={inputStyle}
      />
      <textarea
        value={description}
        onChange={e => setDesc(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        style={{ ...inputStyle, resize: 'none' }}
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          style={inputStyle}
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <select
          value={assigneeId}
          onChange={e => setAssigneeId(e.target.value)}
          style={inputStyle}
        >
          <option value="">Unassigned</option>
          {allUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={inputStyle}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-[12px] font-medium"
          style={{
            background:   'var(--bg-primary)',
            color:        'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)',
            border:       '1px solid var(--border)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white"
          style={{
            background:   'var(--color-blue)',
            borderRadius: 'var(--radius-sm)',
            opacity:      saving || !title.trim() ? 0.5 : 1,
          }}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : null}
          Approve &amp; Save
        </button>
      </div>
    </div>
  )
}
