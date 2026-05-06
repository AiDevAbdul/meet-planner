'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import {
  X, Trash2, ExternalLink, Calendar, User, Flag,
  CheckCircle, Clock, AlertCircle, Send, MessageCircle,
  Sparkles, Plus, Check, Loader2, GitBranch, Link2, Sliders, Target,
} from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badges'
import { Avatar } from '@/components/layout/Sidebar'
import { formatDate, formatRelative } from '@/lib/utils'
import type { TaskRow, UserRow } from './TaskBoardClient'

// ─── Milestone types ──────────────────────────────────────────────────────────

type Milestone = {
  id:          string
  taskId:      string
  title:       string
  dueDate:     string | null
  status:      'pending' | 'in_progress' | 'completed'
  aiSuggested: boolean
  createdAt:   string
}

type Subtask = {
  id:               string
  title:            string
  status:           string
  priority:         string
  assigneeId:       string | null
  dueDate:          string | null
  createdAt:        string
  assigneeName:     string | null
  assigneeAvatarUrl: string | null
}

type DepTask = {
  id:       string
  title:    string
  status:   string
  priority: string
}

type CustomFieldDef = {
  id:        string
  name:      string
  type:      'text' | 'number' | 'date' | 'select' | 'checkbox'
  options:   string[] | null
  position:  number
}

type CustomFieldVal = {
  fieldDefinitionId: string
  value:             string | null
}

type Props = {
  task:     TaskRow
  users:    UserRow[]
  onClose:  () => void
  onUpdate: (id: string, updates: Partial<TaskRow>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high',     label: 'High'     },
  { value: 'normal',   label: 'Normal'   },
  { value: 'low',      label: 'Low'      },
]

const STATUS_OPTIONS = [
  { value: 'triage',      label: 'Triage'      },
  { value: 'todo',        label: 'To Do'        },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'review',      label: 'Review'       },
  { value: 'done',        label: 'Done'         },
]

export function TaskDetailPanel({ task, users, onClose, onUpdate, onDelete }: Props) {
  const [mounted,         setMounted]         = useState(false)
  const [editingTitle,    setEditingTitle]     = useState(false)
  const [titleDraft,      setTitleDraft]       = useState(task.title)
  const [descDraft,       setDescDraft]        = useState(task.description ?? '')
  const [editingDesc,     setEditingDesc]      = useState(false)
  const [confirmDelete,   setConfirmDelete]    = useState(false)
  const [saving,          setSaving]           = useState(false)
  const [comment,         setComment]          = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [activityLog,     setActivityLog]      = useState<
    { id: string; text: string; at: string }[]
  >([])
  const [comments, setComments] = useState<{
    id: string; content: string; createdAt: string;
    userId: string; userName: string | null; userAvatarUrl: string | null
  }[]>([])

  const titleRef = useRef<HTMLInputElement>(null)
  const descRef  = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Fetch comments when task changes
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`)
      if (res.ok) setComments(await res.json())
    } catch {}
  }, [task.id])

  useEffect(() => { fetchComments() }, [fetchComments])

  // Sync drafts when task prop changes (e.g. optimistic updates)
  useEffect(() => {
    setTitleDraft(task.title)
    setDescDraft(task.description ?? '')
  }, [task.id, task.title, task.description])

  // Focus title input when editing starts
  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  // Focus desc textarea when editing starts
  useEffect(() => {
    if (editingDesc) descRef.current?.focus()
  }, [editingDesc])

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // ── Field save helpers ────────────────────────────────────────────────────

  async function saveTitle() {
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === task.title) {
      setTitleDraft(task.title)
      setEditingTitle(false)
      return
    }
    setSaving(true)
    await onUpdate(task.id, { title: trimmed })
    addActivity(`Title changed to "${trimmed}"`)
    setEditingTitle(false)
    setSaving(false)
  }

  async function saveDesc() {
    if (descDraft === (task.description ?? '')) {
      setEditingDesc(false)
      return
    }
    setSaving(true)
    await onUpdate(task.id, { description: descDraft || null })
    setEditingDesc(false)
    setSaving(false)
  }

  async function saveField(field: keyof TaskRow, value: unknown) {
    setSaving(true)
    await onUpdate(task.id, { [field]: value } as Partial<TaskRow>)
    if (field === 'status') {
      addActivity(`Status changed to ${STATUS_OPTIONS.find(s => s.value === value)?.label ?? value}`)
    }
    setSaving(false)
  }

  function addActivity(text: string) {
    setActivityLog(prev => [
      { id: crypto.randomUUID(), text, at: new Date().toISOString() },
      ...prev,
    ])
  }

  async function submitComment() {
    if (!comment.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: comment.trim() }),
      })
      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [...prev, newComment])
        setComment('')
      }
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await onDelete(task.id)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'done'

  const assignee = users.find(u => u.id === task.assigneeId)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(0,0,0,0.2)',
          zIndex:     40,
          opacity:    mounted ? 1 : 0,
          transition: 'opacity 200ms var(--ease-out)',
        }}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={`Task: ${task.title}`}
        aria-modal="true"
        style={{
          position:    'fixed',
          top:         0,
          right:       0,
          bottom:      0,
          width:       350,
          zIndex:      50,
          display:     'flex',
          flexDirection: 'column',
          background:  'var(--bg-primary)',
          borderLeft:  '1px solid var(--border)',
          boxShadow:   'var(--shadow-xl)',
          transform:   mounted ? 'translateX(0)' : 'translateX(100%)',
          transition:  'transform 300ms var(--ease-spring)',
          overflow:    'hidden',
        }}
      >
        {/* ── Panel header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            {saving && (
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Saving…
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all hover:opacity-70"
            style={{ background: 'var(--bg-secondary)' }}
            aria-label="Close task detail"
          >
            <X size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">

            {/* Title */}
            <div className="mb-4">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveTitle()
                    if (e.key === 'Escape') { setTitleDraft(task.title); setEditingTitle(false) }
                  }}
                  className="w-full text-[18px] font-bold leading-snug outline-none bg-transparent"
                  style={{
                    color:        'var(--text-primary)',
                    borderBottom: '2px solid var(--color-blue)',
                    paddingBottom: 2,
                  }}
                  aria-label="Edit task title"
                />
              ) : (
                <h2
                  className="text-[18px] font-bold leading-snug cursor-text"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => setEditingTitle(true)}
                  title="Click to edit title"
                >
                  {task.title}
                </h2>
              )}
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                Description
              </label>
              {editingDesc ? (
                <textarea
                  ref={descRef}
                  value={descDraft}
                  onChange={e => setDescDraft(e.target.value)}
                  onBlur={saveDesc}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setDescDraft(task.description ?? ''); setEditingDesc(false) }
                  }}
                  rows={4}
                  placeholder="Add a description…"
                  className="w-full text-[13px] leading-relaxed outline-none resize-none rounded-[8px] p-2.5"
                  style={{
                    color:      'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    border:     '1px solid var(--color-blue)',
                  }}
                  aria-label="Edit task description"
                />
              ) : (
                <p
                  className="text-[13px] leading-relaxed cursor-text rounded-[8px] p-2 -mx-2 hover:bg-opacity-50 min-h-[40px]"
                  style={{
                    color:      task.description ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                    background: 'transparent',
                    transition: 'background 150ms',
                  }}
                  onClick={() => setEditingDesc(true)}
                  title="Click to edit description"
                >
                  {task.description || 'Click to add a description…'}
                </p>
              )}
            </div>

            {/* Fields grid */}
            <div className="flex flex-col gap-3 mb-5">
              {/* Status */}
              <FieldRow label="Status" icon={<CheckCircle size={14} strokeWidth={1.5} />}>
                <select
                  value={task.status}
                  onChange={e => saveField('status', e.target.value)}
                  aria-label="Task status"
                  style={selectStyle}
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FieldRow>

              {/* Priority */}
              <FieldRow label="Priority" icon={<Flag size={14} strokeWidth={1.5} />}>
                <div className="flex items-center gap-2">
                  <select
                    value={task.priority}
                    onChange={e => saveField('priority', e.target.value)}
                    aria-label="Task priority"
                    style={selectStyle}
                  >
                    {PRIORITY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <PriorityBadge priority={task.priority} small />
                </div>
              </FieldRow>

              {/* Assignee */}
              <FieldRow label="Assignee" icon={<User size={14} strokeWidth={1.5} />}>
                <div className="flex items-center gap-2">
                  <select
                    value={task.assigneeId ?? ''}
                    onChange={e => saveField('assigneeId', e.target.value || null)}
                    aria-label="Task assignee"
                    style={selectStyle}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  {assignee && (
                    <Avatar
                      name={assignee.name}
                      src={assignee.avatarUrl ?? undefined}
                      size={22}
                    />
                  )}
                </div>
              </FieldRow>

              {/* Due date */}
              <FieldRow label="Due date" icon={<Calendar size={14} strokeWidth={1.5} />}>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={task.dueDate ?? ''}
                    onChange={e => saveField('dueDate', e.target.value || null)}
                    aria-label="Task due date"
                    style={{
                      ...selectStyle,
                      color: isOverdue ? 'var(--color-red)' : 'var(--text-primary)',
                    }}
                  />
                  {task.dueDate && (
                    <span
                      className="text-[11px]"
                      style={{ color: isOverdue ? 'var(--color-red)' : 'var(--text-tertiary)' }}
                    >
                      {isOverdue ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle size={11} strokeWidth={1.5} /> Overdue
                        </span>
                      ) : formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </FieldRow>
            </div>

            {/* Source meeting */}
            {task.meetingId && (
              <a
                href={`/meetings/${task.meetingId}`}
                className="flex items-center gap-1.5 text-[13px] font-medium mb-5 hover:underline"
                style={{ color: 'var(--color-blue)' }}
                aria-label="View source meeting"
              >
                <ExternalLink size={13} strokeWidth={1.5} />
                View source meeting
              </a>
            )}

            {/* Timestamps */}
            <div className="mb-5 flex flex-col gap-1">
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Created {formatRelative(task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt)}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Updated {formatRelative(task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt)}
              </p>
            </div>

            {/* Milestones */}
            <MilestoneSection taskId={task.id} />

            {/* Subtasks */}
            <SubtasksSection taskId={task.id} users={users} />

            {/* Dependencies */}
            <DependenciesSection taskId={task.id} />

            {/* Custom fields */}
            {task.projectId && (
              <CustomFieldsSection taskId={task.id} projectId={task.projectId} />
            )}

            {/* Goal / KR links */}
            <GoalLinksSection taskId={task.id} />

            {/* Activity log */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Activity
              </label>
              {activityLog.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                  No activity yet
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activityLog.map(item => (
                    <div key={item.id} className="flex items-start gap-2">
                      <Clock size={12} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                          {item.text}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {formatRelative(item.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-3">
                <MessageCircle size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Comments {comments.length > 0 && `(${comments.length})`}
                </label>
              </div>

              {comments.length > 0 && (
                <div className="flex flex-col gap-3 mb-3">
                  {comments.map(c => (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <Avatar name={c.userName ?? '?'} src={c.userAvatarUrl ?? undefined} size={24} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {c.userName ?? 'Unknown'}
                          </span>
                          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                            {formatRelative(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      submitComment()
                    }
                  }}
                  rows={2}
                  placeholder="Write a comment… (Enter to submit)"
                  className="flex-1 text-[13px] leading-relaxed outline-none resize-none rounded-[8px] p-2.5"
                  style={{
                    color:      'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    border:     '1px solid var(--border)',
                  }}
                  aria-label="Add a comment"
                  disabled={submittingComment}
                />
                <button
                  onClick={submitComment}
                  disabled={!comment.trim() || submittingComment}
                  className="self-end flex items-center justify-center w-8 h-8 rounded-[8px] transition-all disabled:opacity-40"
                  style={{ background: 'var(--color-blue)' }}
                  aria-label="Submit comment"
                >
                  <Send size={13} strokeWidth={1.5} style={{ color: '#fff' }} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Panel footer ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {confirmDelete ? (
            <div className="flex items-center gap-2 w-full">
              <p className="text-[12px] flex-1" style={{ color: 'var(--text-secondary)' }}>
                Delete this task?
              </p>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[12px] px-3 py-1.5 rounded-[6px]"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="text-[12px] px-3 py-1.5 rounded-[6px] font-semibold"
                style={{ background: 'var(--color-red)', color: '#fff' }}
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-[8px] transition-all hover:opacity-90"
              style={{
                color:      'var(--color-red)',
                background: 'rgba(255,59,48,0.08)',
                border:     '1px solid rgba(255,59,48,0.15)',
              }}
              aria-label="Delete task"
            >
              <Trash2 size={13} strokeWidth={1.5} />
              Delete task
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ── MilestoneSection ──────────────────────────────────────────────────────────

function MilestoneSection({ taskId }: { taskId: string }) {
  const [milestones,    setMilestones]    = useState<Milestone[]>([])
  const [loading,       setLoading]       = useState(true)
  const [newTitle,      setNewTitle]      = useState('')
  const [newDueDate,    setNewDueDate]    = useState('')
  const [adding,        setAdding]        = useState(false)
  const [suggesting,    setSuggesting]    = useState(false)
  const [suggestions,   setSuggestions]   = useState<{ title: string }[]>([])
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [editDraft,     setEditDraft]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/milestones`)
      if (res.ok) setMilestones(await res.json())
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { fetchMilestones() }, [fetchMilestones])

  const total     = milestones.length
  const completed = milestones.filter(m => m.status === 'completed').length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0

  async function toggleMilestone(m: Milestone) {
    const next = m.status === 'completed' ? 'pending' : 'completed'
    setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, status: next } : x))
    await fetch(`/api/milestones/${m.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: next }),
    })
  }

  async function deleteMilestone(id: string) {
    setMilestones(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
  }

  async function addMilestone() {
    if (!newTitle.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/milestones`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: newTitle.trim(), dueDate: newDueDate || null }),
      })
      if (res.ok) {
        const m = await res.json()
        setMilestones(prev => [...prev, m])
        setNewTitle('')
        setNewDueDate('')
      }
    } finally {
      setAdding(false)
    }
  }

  async function acceptSuggestion(title: string) {
    setSuggestions(prev => prev.filter(s => s.title !== title))
    const res = await fetch(`/api/tasks/${taskId}/milestones`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, aiSuggested: true }),
    })
    if (res.ok) {
      const m = await res.json()
      setMilestones(prev => [...prev, m])
    }
  }

  async function aiSuggest() {
    if (suggesting) return
    setSuggesting(true)
    setSuggestions([])
    try {
      const res = await fetch(`/api/tasks/${taskId}/milestones/generate`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data : [])
      }
    } finally {
      setSuggesting(false)
    }
  }

  async function saveEdit(id: string) {
    const trimmed = editDraft.trim()
    if (!trimmed) { setEditingId(null); return }
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, title: trimmed } : m))
    setEditingId(null)
    await fetch(`/api/milestones/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title: trimmed }),
    })
  }

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Milestones
          </span>
          {total > 0 && (
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {completed}/{total}
            </span>
          )}
        </div>
        <button
          onClick={aiSuggest}
          disabled={suggesting}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[6px] transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'rgba(0,122,255,0.08)', color: 'var(--color-blue)', border: '1px solid rgba(0,122,255,0.15)' }}
          aria-label="AI suggest milestones"
        >
          {suggesting
            ? <Loader2 size={11} strokeWidth={2} className="animate-spin" />
            : <Sparkles size={11} strokeWidth={1.5} />
          }
          AI Suggest
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-3">
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height:     '100%',
                width:      `${pct}%`,
                background: pct === 100 ? 'var(--color-green)' : 'var(--color-blue)',
                borderRadius: 3,
                transition:   'width 300ms var(--ease-out)',
              }}
            />
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{pct}% complete</p>
        </div>
      )}

      {/* AI suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-3 rounded-[10px] p-3" style={{ background: 'rgba(0,122,255,0.05)', border: '1px solid rgba(0,122,255,0.15)' }}>
          <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--color-blue)' }}>
            AI Suggestions — click + to add
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => acceptSuggestion(s.title)}
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                  style={{ background: 'var(--color-blue)' }}
                  aria-label={`Add suggestion: ${s.title}`}
                >
                  <Plus size={11} strokeWidth={2.5} style={{ color: '#fff' }} />
                </button>
                <span className="text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestone list */}
      {loading ? (
        <div className="flex items-center gap-1.5 py-2">
          <Loader2 size={12} strokeWidth={2} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-3">
          {milestones.map(m => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              editing={editingId === m.id}
              editDraft={editDraft}
              onToggle={() => toggleMilestone(m)}
              onDelete={() => deleteMilestone(m.id)}
              onStartEdit={() => { setEditingId(m.id); setEditDraft(m.title) }}
              onEditChange={setEditDraft}
              onSaveEdit={() => saveEdit(m.id)}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
          {milestones.length === 0 && suggestions.length === 0 && (
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              No milestones yet. Add one below or use AI Suggest.
            </p>
          )}
        </div>
      )}

      {/* Add milestone form */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addMilestone() }}
          placeholder="Add milestone…"
          className="flex-1 text-[12px] outline-none rounded-[7px] px-2.5 py-1.5"
          style={{
            color:      'var(--text-primary)',
            background: 'var(--bg-secondary)',
            border:     '1px solid var(--border)',
          }}
          aria-label="New milestone title"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={e => setNewDueDate(e.target.value)}
          className="text-[11px] outline-none rounded-[7px] px-2 py-1.5"
          style={{
            color:      'var(--text-secondary)',
            background: 'var(--bg-secondary)',
            border:     '1px solid var(--border)',
            width:      110,
          }}
          aria-label="Milestone due date"
        />
        <button
          onClick={addMilestone}
          disabled={!newTitle.trim() || adding}
          className="w-7 h-7 flex items-center justify-center rounded-[7px] transition-all disabled:opacity-40 hover:opacity-90"
          style={{ background: 'var(--color-blue)', flexShrink: 0 }}
          aria-label="Add milestone"
        >
          {adding
            ? <Loader2 size={12} strokeWidth={2} className="animate-spin" style={{ color: '#fff' }} />
            : <Plus size={13} strokeWidth={2.5} style={{ color: '#fff' }} />
          }
        </button>
      </div>
    </div>
  )
}

function MilestoneRow({
  milestone, editing, editDraft,
  onToggle, onDelete, onStartEdit, onEditChange, onSaveEdit, onCancelEdit,
}: {
  milestone:    Milestone
  editing:      boolean
  editDraft:    string
  onToggle:     () => void
  onDelete:     () => void
  onStartEdit:  () => void
  onEditChange: (v: string) => void
  onSaveEdit:   () => void
  onCancelEdit: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const done = milestone.status === 'completed'

  return (
    <div
      className="flex items-center gap-2 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Toggle checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all"
        style={{
          background: done ? 'var(--color-green)' : 'transparent',
          borderColor: done ? 'var(--color-green)' : 'var(--border)',
        }}
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        {done && <Check size={9} strokeWidth={3} style={{ color: '#fff' }} />}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={editDraft}
            onChange={e => onEditChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="w-full text-[12px] outline-none bg-transparent"
            style={{
              color:        'var(--text-primary)',
              borderBottom: '1px solid var(--color-blue)',
            }}
          />
        ) : (
          <span
            className="text-[12px] leading-snug cursor-text block truncate"
            style={{
              color:          done ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              textDecoration: done ? 'line-through' : 'none',
            }}
            onClick={onStartEdit}
            title={milestone.title}
          >
            {milestone.title}
          </span>
        )}
        {milestone.dueDate && !editing && (
          <span className="text-[10px] flex items-center gap-0.5 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            <Calendar size={9} strokeWidth={1.5} />
            {formatDate(milestone.dueDate)}
          </span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          opacity: hovered ? 1 : 0,
          transition: 'opacity 150ms',
          color: 'var(--text-tertiary)',
          padding: 2,
          flexShrink: 0,
        }}
        aria-label="Delete milestone"
        className="hover:opacity-70"
      >
        <X size={11} strokeWidth={2} />
      </button>
    </div>
  )
}

// ── SubtasksSection ───────────────────────────────────────────────────────────

function SubtasksSection({ taskId, users }: { taskId: string; users: UserRow[] }) {
  const [subtasks,   setSubtasks]   = useState<Subtask[]>([])
  const [loading,    setLoading]    = useState(true)
  const [newTitle,   setNewTitle]   = useState('')
  const [adding,     setAdding]     = useState(false)

  const fetchSubtasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`)
      if (res.ok) setSubtasks(await res.json())
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { fetchSubtasks() }, [fetchSubtasks])

  async function addSubtask() {
    if (!newTitle.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: newTitle.trim() }),
      })
      if (res.ok) {
        const sub = await res.json()
        setSubtasks(prev => [...prev, { ...sub, assigneeName: null, assigneeAvatarUrl: null }])
        setNewTitle('')
      }
    } finally {
      setAdding(false)
    }
  }

  async function toggleSubtask(sub: Subtask) {
    const next = sub.status === 'done' ? 'todo' : 'done'
    setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: next } : s))
    await fetch(`/api/tasks/${sub.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: next }),
    })
  }

  async function deleteSubtask(id: string) {
    setSubtasks(prev => prev.filter(s => s.id !== id))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  const total     = subtasks.length
  const completed = subtasks.filter(s => s.status === 'done').length

  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <GitBranch size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Subtasks
        </span>
        {total > 0 && (
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {completed}/{total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 py-1">
          <Loader2 size={12} strokeWidth={2} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-3">
          {subtasks.map(sub => {
            const done = sub.status === 'done'
            return (
              <div key={sub.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleSubtask(sub)}
                  className="flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all"
                  style={{
                    background:  done ? 'var(--color-green)' : 'transparent',
                    borderColor: done ? 'var(--color-green)' : 'var(--border)',
                  }}
                  aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                >
                  {done && <Check size={9} strokeWidth={3} style={{ color: '#fff' }} />}
                </button>
                <span
                  className="flex-1 text-[12px] leading-snug truncate"
                  style={{
                    color:          done ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                  title={sub.title}
                >
                  {sub.title}
                </span>
                {sub.assigneeName && (
                  <Avatar name={sub.assigneeName} src={sub.assigneeAvatarUrl ?? undefined} size={16} />
                )}
                <button
                  onClick={() => deleteSubtask(sub.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70 flex-shrink-0"
                  style={{ color: 'var(--text-tertiary)', padding: 2 }}
                  aria-label="Delete subtask"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              </div>
            )
          })}
          {subtasks.length === 0 && (
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              No subtasks yet. Add one below.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-1.5">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addSubtask() }}
          placeholder="Add subtask…"
          className="flex-1 text-[12px] outline-none rounded-[7px] px-2.5 py-1.5"
          style={{
            color:      'var(--text-primary)',
            background: 'var(--bg-secondary)',
            border:     '1px solid var(--border)',
          }}
          aria-label="New subtask title"
        />
        <button
          onClick={addSubtask}
          disabled={!newTitle.trim() || adding}
          className="w-7 h-7 flex items-center justify-center rounded-[7px] transition-all disabled:opacity-40 hover:opacity-90"
          style={{ background: 'var(--color-blue)', flexShrink: 0 }}
          aria-label="Add subtask"
        >
          {adding
            ? <Loader2 size={12} strokeWidth={2} className="animate-spin" style={{ color: '#fff' }} />
            : <Plus size={13} strokeWidth={2.5} style={{ color: '#fff' }} />
          }
        </button>
      </div>
    </div>
  )
}

// ── DependenciesSection ────────────────────────────────────────────────────────

function DependenciesSection({ taskId }: { taskId: string }) {
  const [blockedBy,  setBlockedBy]  = useState<DepTask[]>([])
  const [blocks,     setBlocks]     = useState<DepTask[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showPicker, setShowPicker] = useState<'blocked_by' | 'blocks' | null>(null)
  const [search,     setSearch]     = useState('')
  const [searchRes,  setSearchRes]  = useState<DepTask[]>([])
  const [searching,  setSearching]  = useState(false)

  const fetchDeps = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`)
      if (res.ok) {
        const data = await res.json()
        setBlockedBy(data.blockedBy ?? [])
        setBlocks(data.blocks ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { fetchDeps() }, [fetchDeps])

  useEffect(() => {
    if (!search.trim()) { setSearchRes([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/tasks?q=${encodeURIComponent(search)}`)
        if (res.ok) {
          const all: DepTask[] = await res.json()
          setSearchRes(all.filter(t => t.id !== taskId).slice(0, 8))
        }
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [search, taskId])

  async function addDep(depTask: DepTask) {
    const isBlockedBy = showPicker === 'blocked_by'
    const payload = isBlockedBy
      ? { taskId, dependsOnTaskId: depTask.id }
      : { taskId: depTask.id, dependsOnTaskId: taskId }

    const res = await fetch('/api/task-dependencies', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    if (res.ok) {
      if (isBlockedBy) {
        setBlockedBy(prev => [...prev, depTask])
      } else {
        setBlocks(prev => [...prev, depTask])
      }
    }
    setShowPicker(null)
    setSearch('')
    setSearchRes([])
  }

  async function removeDep(depTask: DepTask, direction: 'blocked_by' | 'blocks') {
    const payload = direction === 'blocked_by'
      ? { taskId, dependsOnTaskId: depTask.id }
      : { taskId: depTask.id, dependsOnTaskId: taskId }

    await fetch('/api/task-dependencies', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    if (direction === 'blocked_by') {
      setBlockedBy(prev => prev.filter(t => t.id !== depTask.id))
    } else {
      setBlocks(prev => prev.filter(t => t.id !== depTask.id))
    }
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Link2 size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Dependencies
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 py-1">
          <Loader2 size={12} strokeWidth={2} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : (
        <>
          {/* Blocked by */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Blocked by</span>
              <button
                onClick={() => { setShowPicker('blocked_by'); setSearch('') }}
                className="text-[11px] flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-blue)' }}
                aria-label="Add blocked-by dependency"
              >
                <Plus size={10} strokeWidth={2.5} /> Add
              </button>
            </div>
            {blockedBy.length === 0 ? (
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>None</p>
            ) : (
              <div className="flex flex-col gap-1">
                {blockedBy.map(t => (
                  <DepRow key={t.id} task={t} onRemove={() => removeDep(t, 'blocked_by')} />
                ))}
              </div>
            )}
          </div>

          {/* Blocks */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Blocks</span>
              <button
                onClick={() => { setShowPicker('blocks'); setSearch('') }}
                className="text-[11px] flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-blue)' }}
                aria-label="Add blocks dependency"
              >
                <Plus size={10} strokeWidth={2.5} /> Add
              </button>
            </div>
            {blocks.length === 0 ? (
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>None</p>
            ) : (
              <div className="flex flex-col gap-1">
                {blocks.map(t => (
                  <DepRow key={t.id} task={t} onRemove={() => removeDep(t, 'blocks')} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Picker */}
      {showPicker && (
        <div
          className="mt-2 rounded-[10px] p-3"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {showPicker === 'blocked_by' ? 'Pick a blocking task' : 'Pick a task to block'}
            </span>
            <button
              onClick={() => { setShowPicker(null); setSearch(''); setSearchRes([]) }}
              className="hover:opacity-70"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Close picker"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full text-[12px] outline-none rounded-[7px] px-2.5 py-1.5 mb-2"
            style={{
              color:      'var(--text-primary)',
              background: 'var(--bg-primary)',
              border:     '1px solid var(--border)',
            }}
            aria-label="Search tasks for dependency"
          />
          {searching && (
            <div className="flex items-center gap-1.5">
              <Loader2 size={11} strokeWidth={2} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Searching…</span>
            </div>
          )}
          <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
            {searchRes.map(t => (
              <button
                key={t.id}
                onClick={() => addDep(t)}
                className="text-left text-[12px] px-2.5 py-1.5 rounded-[6px] transition-all hover:opacity-80"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                {t.title}
              </button>
            ))}
            {!searching && search.trim() && searchRes.length === 0 && (
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>No tasks found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DepRow({ task, onRemove }: { task: DepTask; onRemove: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="flex items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="flex-1 text-[12px] truncate"
        style={{ color: 'var(--text-secondary)' }}
        title={task.title}
      >
        {task.title}
      </span>
      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
        {task.status.replace('_', ' ')}
      </span>
      <button
        onClick={onRemove}
        style={{
          opacity:    hovered ? 1 : 0,
          transition: 'opacity 150ms',
          color:      'var(--text-tertiary)',
          padding:    2,
          flexShrink: 0,
        }}
        aria-label="Remove dependency"
        className="hover:opacity-70"
      >
        <X size={11} strokeWidth={2} />
      </button>
    </div>
  )
}

// ── CustomFieldsSection ────────────────────────────────────────────────────────

function CustomFieldsSection({ taskId, projectId }: { taskId: string; projectId: string }) {
  const [fields,  setFields]  = useState<CustomFieldDef[]>([])
  const [values,  setValues]  = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [defsRes, valsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/custom-fields`),
          fetch(`/api/tasks/${taskId}/custom-field-values`),
        ])
        if (defsRes.ok) setFields(await defsRes.json())
        if (valsRes.ok) {
          const vals: CustomFieldVal[] = await valsRes.json()
          const map: Record<string, string | null> = {}
          for (const v of vals) map[v.fieldDefinitionId] = v.value
          setValues(map)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [taskId, projectId])

  async function updateValue(fieldDefinitionId: string, value: string | null) {
    setValues(prev => ({ ...prev, [fieldDefinitionId]: value }))
    await fetch(`/api/tasks/${taskId}/custom-field-values`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fieldDefinitionId, value }),
    })
  }

  if (loading || fields.length === 0) return null

  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 mb-2">
        <Sliders size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Custom Fields
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {fields.map(field => (
          <div key={field.id} className="flex items-center gap-3">
            <span
              className="text-[12px] font-medium flex-shrink-0"
              style={{ width: 90, color: 'var(--text-tertiary)' }}
              title={field.name}
            >
              {field.name}
            </span>
            <div className="flex-1">
              {field.type === 'checkbox' ? (
                <button
                  onClick={() => updateValue(field.id, values[field.id] === 'true' ? 'false' : 'true')}
                  className="w-4 h-4 rounded border flex items-center justify-center transition-all"
                  style={{
                    background:  values[field.id] === 'true' ? 'var(--color-blue)' : 'transparent',
                    borderColor: values[field.id] === 'true' ? 'var(--color-blue)' : 'var(--border)',
                  }}
                  aria-label={`Toggle ${field.name}`}
                >
                  {values[field.id] === 'true' && <Check size={9} strokeWidth={3} style={{ color: '#fff' }} />}
                </button>
              ) : field.type === 'select' ? (
                <select
                  value={values[field.id] ?? ''}
                  onChange={e => updateValue(field.id, e.target.value || null)}
                  style={selectStyle}
                  aria-label={field.name}
                >
                  <option value="">—</option>
                  {(field.options ?? []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={values[field.id] ?? ''}
                  onChange={e => updateValue(field.id, e.target.value || null)}
                  style={{
                    ...selectStyle,
                    width: '100%',
                  }}
                  aria-label={field.name}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  appearance:       'none',
  WebkitAppearance: 'none',
  background:       'var(--bg-secondary)',
  border:           '1px solid var(--border)',
  borderRadius:     8,
  color:            'var(--text-primary)',
  fontSize:         13,
  padding:          '4px 8px',
  cursor:           'pointer',
  outline:          'none',
}

function FieldRow({
  label, icon, children,
}: {
  label:    string
  icon:     React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1.5 flex-shrink-0"
        style={{ width: 90, color: 'var(--text-tertiary)' }}
      >
        {icon}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// ── GoalLinksSection ───────────────────────────────────────────────────────────

type GoalKRLink = {
  goalId:       string
  goalTitle:    string
  keyResultId:  string
  krTitle:      string
}

type GoalOption = {
  id:         string
  title:      string
  keyResults: { id: string; title: string }[]
}

function GoalLinksSection({ taskId }: { taskId: string }) {
  const [links,       setLinks]       = useState<GoalKRLink[]>([])
  const [goals,       setGoals]       = useState<GoalOption[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [selGoalId,   setSelGoalId]   = useState('')
  const [selKRId,     setSelKRId]     = useState('')
  const [linking,     startLinking]   = useTransition()

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/goal-links`)
      if (res.ok) setLinks(await res.json())
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const fetchGoals = useCallback(async () => {
    const res = await fetch('/api/goals')
    if (!res.ok) return
    const rows: any[] = await res.json()
    const withKRs = await Promise.all(rows.map(async g => {
      const r2 = await fetch(`/api/goals/${g.id}/key-results`)
      const krs = r2.ok ? await r2.json() : []
      return { id: g.id, title: g.title, keyResults: krs.map((k: any) => ({ id: k.id, title: k.title })) }
    }))
    setGoals(withKRs.filter(g => g.keyResults.length > 0))
  }, [])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const selGoal = goals.find(g => g.id === selGoalId)

  async function handleLink() {
    if (!selGoalId || !selKRId) return
    startLinking(async () => {
      const res = await fetch(`/api/goals/${selGoalId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyResultId: selKRId, taskId }),
      })
      if (res.ok) {
        setShowAdd(false)
        setSelGoalId('')
        setSelKRId('')
        fetchLinks()
      }
    })
  }

  async function handleUnlink(goalId: string, keyResultId: string) {
    await fetch(`/api/goals/${goalId}/tasks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyResultId, taskId }),
    })
    setLinks(prev => prev.filter(l => !(l.goalId === goalId && l.keyResultId === keyResultId)))
  }

  if (loading) return null

  return (
    <div className="mb-4">
      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
        Linked to Goals
      </label>
      {links.length === 0 && !showAdd && (
        <p className="text-[12px] mb-2" style={{ color: 'var(--text-tertiary)' }}>Not linked to any goal.</p>
      )}
      {links.map(l => (
        <div key={`${l.goalId}-${l.keyResultId}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Target size={12} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{l.goalTitle}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}> › {l.krTitle}</span>
          </div>
          <button onClick={() => handleUnlink(l.goalId, l.keyResultId)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
            <X size={12} />
          </button>
        </div>
      ))}

      {showAdd ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <select value={selGoalId}
            onChange={e => { setSelGoalId(e.target.value); setSelKRId('') }}
            onFocus={() => goals.length === 0 && fetchGoals()}
            style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--glass-bg)', fontSize: 12, color: 'var(--text-primary)' }}>
            <option value="">Select goal…</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          {selGoal && (
            <select value={selKRId} onChange={e => setSelKRId(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--glass-bg)', fontSize: 12, color: 'var(--text-primary)' }}>
              <option value="">Select key result…</option>
              {selGoal.keyResults.map(k => <option key={k.id} value={k.id}>{k.title}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleLink} disabled={!selGoalId || !selKRId || linking}
              style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--color-blue)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              {linking && <Loader2 size={11} className="animate-spin" />}
              Link
            </button>
            <button onClick={() => { setShowAdd(false); setSelGoalId(''); setSelKRId('') }}
              style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setShowAdd(true); fetchGoals() }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-blue)', fontSize: 12, fontWeight: 500, marginTop: 2 }}>
          <Plus size={12} />
          Link to Goal
        </button>
      )}
    </div>
  )
}
