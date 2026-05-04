'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import type { TaskRow, UserRow, DeptRow } from './TaskBoardClient'

type Props = {
  users:       UserRow[]
  departments: DeptRow[]
  onClose:     () => void
  onCreated:   (task: TaskRow) => void
}

export function AddTaskModal({ users, departments, onClose, onCreated }: Props) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [assigneeId,   setAssigneeId]   = useState('')
  const [priority,     setPriority]     = useState('normal')
  const [dueDate,      setDueDate]      = useState('')
  const [departmentId, setDepartmentId] = useState('')

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
            <FormField label="Assignee">
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                aria-label="Assignee"
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </FormField>

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
