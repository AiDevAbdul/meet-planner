'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle, X, Pencil, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, Mail, FileText, Video, Filter, Check,
} from 'lucide-react'
import { PriorityBadge } from '@/components/ui/Badges'
import { Avatar } from '@/components/layout/Sidebar'
import { formatDate } from '@/lib/utils'

type Assignee = { id: string; name: string; email: string; avatarUrl: string | null } | null

type TriageTask = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  assigneeId: string | null
  dueDate: string | null
  meetingId: string | null
  position: number | null
  assignee: Assignee
  meeting: { id: string; title: string; source: string; date: string | null } | null
}

type User = { id: string; name: string; email: string; avatarUrl: string | null }

type Props = {
  tasks: TriageTask[]
  allUsers: User[]
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  manual:      { label: 'Manual',      icon: FileText, color: 'var(--color-blue)' },
  gmail:       { label: 'Gmail',       icon: Mail,     color: 'var(--color-red)' },
  google_meet: { label: 'Google Meet', icon: Video,    color: 'var(--color-green)' },
}

export function TriageClient({ tasks: initialTasks, allUsers }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState<string | null>(null)

  // Group tasks by meeting
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; source: string; date: string | null; tasks: TriageTask[] }>()
    for (const task of tasks) {
      const key = task.meetingId ?? '__no_meeting__'
      if (!map.has(key)) {
        map.set(key, {
          key,
          label:  task.meeting?.title ?? 'No Meeting',
          source: task.meeting?.source ?? 'manual',
          date:   task.meeting?.date ?? null,
          tasks:  [],
        })
      }
      map.get(key)!.tasks.push(task)
    }
    return [...map.values()]
  }, [tasks])

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function approveTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'todo' }),
    })
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  async function rejectTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  async function approveAll(meetingId: string | null) {
    const key = meetingId ?? '__no_meeting__'
    setBulkLoading(key)
    const group = groups.find(g => g.key === key)
    if (!group) { setBulkLoading(null); return }

    await Promise.all(
      group.tasks.map(t =>
        fetch(`/api/tasks/${t.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ status: 'todo' }),
        })
      )
    )
    setTasks(prev => prev.filter(t => (t.meetingId ?? '__no_meeting__') !== key))
    setBulkLoading(null)
  }

  async function saveEdit(id: string, updates: {
    title: string
    description: string | null
    priority: string
    assigneeId: string | null
    dueDate: string | null
  }) {
    const res = await fetch(`/api/tasks/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...updates, status: 'todo' }),
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(prev => prev.filter(t => t.id !== id))
      setEditingTask(null)
    }
  }

  const totalCount = tasks.length

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>
            Triage Queue
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {totalCount} task{totalCount !== 1 ? 's' : ''} awaiting review
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[8px]"
          style={{
            background: totalCount > 0 ? 'rgba(255,149,0,0.12)' : 'rgba(52,199,89,0.12)',
            color:      totalCount > 0 ? 'var(--color-orange)'  : 'var(--color-green)',
          }}
        >
          <Filter size={14} strokeWidth={1.5} />
          {totalCount > 0 ? `${totalCount} pending` : 'All clear'}
        </div>
      </div>

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="glass-card flex flex-col items-center gap-4 py-20">
          <CheckCircle size={52} strokeWidth={1} style={{ color: 'var(--color-green)' }} />
          <div className="text-center">
            <p className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              All caught up!
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              No tasks in triage. New tasks will appear here when meetings are processed.
            </p>
          </div>
        </div>
      )}

      {/* Groups */}
      <div className="flex flex-col gap-4">
        {groups.map(group => {
          const collapsed = collapsedGroups.has(group.key)
          const src = SOURCE_CONFIG[group.source] ?? SOURCE_CONFIG.manual
          const SrcIcon = src.icon
          const isBulkLoading = bulkLoading === group.key

          return (
            <div key={group.key} className="glass-card overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer select-none"
                style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border)' }}
                onClick={() => toggleGroup(group.key)}
              >
                <div className="flex items-center gap-3">
                  <button
                    aria-label={collapsed ? 'Expand group' : 'Collapse group'}
                    className="p-0.5"
                    style={{ color: 'var(--text-tertiary)' }}
                    onClick={e => { e.stopPropagation(); toggleGroup(group.key) }}
                  >
                    {collapsed
                      ? <ChevronDown size={16} strokeWidth={1.5} />
                      : <ChevronUp size={16} strokeWidth={1.5} />
                    }
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${src.color}18`, color: src.color }}
                      >
                        <SrcIcon size={10} strokeWidth={2} />
                        {src.label}
                      </span>
                      <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {group.label}
                      </span>
                    </div>
                    {group.date && (
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        {formatDate(group.date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(175,82,222,0.12)',
                      color:      'var(--color-purple)',
                    }}
                  >
                    {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => approveAll(group.key === '__no_meeting__' ? null : group.key)}
                    disabled={isBulkLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{
                      background:   'var(--color-green)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    aria-label={`Approve all tasks from ${group.label}`}
                  >
                    {isBulkLoading ? (
                      <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={12} strokeWidth={2} />
                    )}
                    Approve All
                  </button>
                </div>
              </div>

              {/* Task list */}
              {!collapsed && (
                <div className="p-4 flex flex-col gap-2">
                  {group.tasks.map(task => (
                    editingTask === task.id
                      ? <EditApproveModal
                          key={task.id}
                          task={task}
                          allUsers={allUsers}
                          onSave={saveEdit}
                          onCancel={() => setEditingTask(null)}
                        />
                      : <TriageTaskRow
                          key={task.id}
                          task={task}
                          onApprove={() => approveTask(task.id)}
                          onReject={() => rejectTask(task.id)}
                          onEdit={() => setEditingTask(task.id)}
                        />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Triage Task Row ──────────────────────────────────────────────────────────

function TriageTaskRow({
  task,
  onApprove,
  onReject,
  onEdit,
}: {
  task: TriageTask
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
  onEdit: () => void
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handleApprove() {
    setLoading('approve')
    await onApprove()
    setLoading(null)
  }

  async function handleReject() {
    setLoading('reject')
    await onReject()
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
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {task.title}
          </span>
          <PriorityBadge priority={task.priority} small />
        </div>
        {task.description && (
          <p className="text-[12px] leading-relaxed mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {task.assignee ? (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              <Avatar name={task.assignee.name} size={18} />
              {task.assignee.name}
            </span>
          ) : (
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              Unassigned
            </span>
          )}
          {task.dueDate && (
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              Due {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleApprove}
          disabled={!!loading}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--color-green)', borderRadius: 'var(--radius-sm)' }}
          aria-label="Approve task"
        >
          {loading === 'approve'
            ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
            : <Check size={12} strokeWidth={2} />
          }
          Approve
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium transition-all hover:opacity-80"
          style={{
            background:   'var(--bg-primary)',
            color:        'var(--text-secondary)',
            borderRadius: 'var(--radius-sm)',
            border:       '1px solid var(--border)',
          }}
          aria-label="Edit and approve task"
        >
          <Pencil size={11} strokeWidth={1.5} />
          Edit &amp; Approve
        </button>
        <button
          onClick={handleReject}
          disabled={!!loading}
          className="p-1.5 rounded-[6px] transition-all hover:opacity-70 disabled:opacity-50"
          style={{
            background: 'rgba(255,59,48,0.10)',
            color:      'var(--color-red)',
          }}
          aria-label="Reject task"
        >
          {loading === 'reject'
            ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
            : <X size={13} strokeWidth={1.5} />
          }
        </button>
      </div>
    </div>
  )
}

// ─── Edit & Approve Inline Form ───────────────────────────────────────────────

function EditApproveModal({
  task,
  allUsers,
  onSave,
  onCancel,
}: {
  task: TriageTask
  allUsers: User[]
  onSave: (id: string, updates: {
    title: string
    description: string | null
    priority: string
    assigneeId: string | null
    dueDate: string | null
  }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle]           = useState(task.title)
  const [description, setDesc]      = useState(task.description ?? '')
  const [priority, setPriority]     = useState(task.priority)
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
  const [dueDate, setDueDate]       = useState(task.dueDate ?? '')
  const [saving, setSaving]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(task.id, {
      title,
      description: description.trim() || null,
      priority,
      assigneeId:  assigneeId || null,
      dueDate:     dueDate || null,
    })
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    background:   'var(--bg-primary)',
    color:        'var(--text-primary)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding:      '7px 10px',
    fontSize:     13,
    fontFamily:   'inherit',
    width:        '100%',
    outline:      'none',
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 rounded-[10px]"
      style={{
        background: 'var(--bg-secondary)',
        border:     '1px solid var(--color-blue)',
      }}
    >
      <p className="text-[12px] font-semibold" style={{ color: 'var(--color-blue)' }}>
        Edit &amp; Approve
      </p>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title"
        required
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
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Assignee</label>
          <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={inputStyle}>
            <option value="">Unassigned</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
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
          type="submit"
          disabled={saving || !title.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white"
          style={{
            background:   'var(--color-blue)',
            borderRadius: 'var(--radius-sm)',
            opacity:      saving || !title.trim() ? 0.5 : 1,
          }}
        >
          {saving ? <Loader2 size={11} strokeWidth={1.5} className="animate-spin" /> : <CheckCircle2 size={11} strokeWidth={2} />}
          Approve &amp; Save
        </button>
      </div>
    </form>
  )
}
