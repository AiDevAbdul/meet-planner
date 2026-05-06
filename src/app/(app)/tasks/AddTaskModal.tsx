'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Loader2, Sparkles } from 'lucide-react'
import type { TaskRow, UserRow, DeptRow } from './TaskBoardClient'

type Suggestion = { userId: string; name: string; reason: string }

type Props = {
  users:       UserRow[]
  departments: DeptRow[]
  projectId?:  string | null
  onClose:     () => void
  onCreated:   (task: TaskRow) => void
}

export function AddTaskModal({ users, departments, projectId, onClose, onCreated }: Props) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [assigneeId,   setAssigneeId]   = useState('')
  const [priority,     setPriority]     = useState('normal')
  const [dueDate,      setDueDate]      = useState('')
  const [departmentId, setDepartmentId] = useState('')

  const [suggesting,   setSuggesting]   = useState(false)
  const [suggestions,  setSuggestions]  = useState<Suggestion[]>([])

  const titleRef = useRef<HTMLInputElement>(null)

  // Animate in
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Focus title on open
  useEffect(() => {
    if (mounted) titleRef.current?.focus()
  }, [mounted])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function suggestAssignee() {
    if (!title.trim()) return
    setSuggesting(true)
    setSuggestions([])
    try {
      const res = await fetch('/api/tasks/suggest-assignee', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priority, projectId: projectId ?? null }),
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
        if (data.suggestions?.[0]?.userId) setAssigneeId(data.suggestions[0].userId)
      }
    } finally {
      setSuggesting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:        title.trim(),
          description:  description || null,
          priority,
          assigneeId:   assigneeId   || null,
          departmentId: departmentId || null,
          dueDate:      dueDate      || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create task')
        setLoading(false)
        return
      }

      const created = await res.json()

      // Merge in assignee info for the local state
      const user = users.find(u => u.id === created.assigneeId)
      const task: TaskRow = {
        ...created,
        assigneeName:      user?.name      ?? null,
        assigneeEmail:     user?.email     ?? null,
        assigneeAvatarUrl: user?.avatarUrl ?? null,
      }

      onCreated(task)
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(0,0,0,0.3)',
          zIndex:     60,
          opacity:    mounted ? 1 : 0,
          transition: 'opacity 200ms var(--ease-out)',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-label="Add new task"
        aria-modal="true"
        style={{
          position:      'fixed',
          top:           '50%',
          left:          '50%',
          zIndex:        70,
          width:         480,
          maxWidth:      'calc(100vw - 32px)',
          background:    'var(--bg-primary)',
          borderRadius:  20,
          border:        '1px solid var(--border)',
          boxShadow:     'var(--shadow-xl)',
          opacity:       mounted ? 1 : 0,
          transform:     mounted
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -52%) scale(0.97)',
          transition:    'opacity 250ms var(--ease-out), transform 300ms var(--ease-spring)',
          overflow:      'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>
            New Task
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all hover:opacity-70"
            style={{ background: 'var(--bg-secondary)' }}
            aria-label="Close modal"
          >
            <X size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 flex flex-col gap-4">

            {/* Title */}
            <FormField label="Title" required>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                required
                aria-label="Task title"
                style={inputStyle}
              />
            </FormField>

            {/* Description */}
            <FormField label="Description">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add details…"
                rows={3}
                aria-label="Task description"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </FormField>

            {/* Two-column row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Priority */}
              <FormField label="Priority">
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  aria-label="Priority"
                  style={inputStyle}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </FormField>

              {/* Due date */}
              <FormField label="Due date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  aria-label="Due date"
                  style={inputStyle}
                />
              </FormField>
            </div>

            {/* Assignee */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Assignee
                </label>
                <button
                  type="button"
                  onClick={suggestAssignee}
                  disabled={suggesting || !title.trim()}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[6px] disabled:opacity-50 transition-opacity"
                  style={{ background: 'rgba(0,122,255,0.08)', color: 'var(--color-blue)' }}
                  aria-label="AI suggest assignee"
                >
                  {suggesting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {suggesting ? 'Suggesting…' : 'AI Suggest'}
                </button>
              </div>
              <select
                value={assigneeId}
                onChange={e => { setAssigneeId(e.target.value); setSuggestions([]) }}
                aria-label="Assignee"
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {suggestions.length > 0 && (
                <div
                  className="rounded-[8px] p-2.5 text-[12px] flex flex-col gap-1.5"
                  style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)' }}
                >
                  {suggestions.map(s => (
                    <button
                      key={s.userId}
                      type="button"
                      onClick={() => { setAssigneeId(s.userId); setSuggestions([]) }}
                      className="text-left flex items-start gap-1.5 hover:opacity-80 transition-opacity"
                    >
                      <span
                        className={`font-medium flex-shrink-0 ${assigneeId === s.userId ? 'underline' : ''}`}
                        style={{ color: 'var(--color-blue)' }}
                      >
                        {s.name}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>— {s.reason}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Department */}
            <FormField label="Department">
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                aria-label="Department"
                style={inputStyle}
              >
                <option value="">No department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </FormField>

            {/* Error */}
            {error && (
              <p
                className="text-[13px] px-3 py-2 rounded-[8px]"
                style={{
                  color:      'var(--color-red)',
                  background: 'rgba(255,59,48,0.08)',
                  border:     '1px solid rgba(255,59,48,0.2)',
                }}
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-[14px] font-medium px-4 py-2 rounded-[10px] transition-all hover:opacity-80"
              style={{
                background: 'var(--bg-secondary)',
                color:      'var(--text-secondary)',
                border:     '1px solid var(--border)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 text-[14px] font-semibold px-5 py-2 rounded-[10px] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--color-blue)', color: '#fff' }}
              aria-label="Create task"
            >
              {loading ? (
                <Loader2 size={15} strokeWidth={2} className="animate-spin" />
              ) : (
                <Plus size={15} strokeWidth={2} />
              )}
              {loading ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width:        '100%',
  background:   'var(--bg-secondary)',
  border:       '1px solid var(--border)',
  borderRadius: 10,
  color:        'var(--text-primary)',
  fontSize:     14,
  padding:      '8px 12px',
  outline:      'none',
  appearance:   'none',
  WebkitAppearance: 'none',
  fontFamily:   'inherit',
}

function FormField({
  label, required, children,
}: {
  label:     string
  required?: boolean
  children:  React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[12px] font-semibold"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--color-red)', marginLeft: 2 }} aria-hidden>*</span>
        )}
      </label>
      {children}
    </div>
  )
}
