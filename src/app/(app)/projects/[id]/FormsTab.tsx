'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink,
  ChevronDown, CheckSquare, Type, AlignLeft, Mail, Hash,
  CalendarDays, List, Copy, AlertCircle, CheckCircle2, Clock, Inbox,
} from 'lucide-react'

type FieldType = 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'date'

type Field = {
  id:           string
  type:         FieldType
  label:        string
  placeholder?: string
  required?:    boolean
  options?:     string[]
}

type IntakeForm = {
  id:              string
  name:            string
  slug:            string
  description:     string | null
  fields:          Field[]
  active:          boolean
  submissionCount: number
  createdAt:       string
}

type Submission = {
  id:             string
  formId:         string
  data:           Record<string, string>
  status:         'new' | 'reviewed' | 'triaged'
  taskId:         string | null
  submitterEmail: string | null
  submitterName:  string | null
  createdAt:      string
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: 'text',     label: 'Short text', icon: Type },
  { type: 'textarea', label: 'Long text',  icon: AlignLeft },
  { type: 'email',    label: 'Email',      icon: Mail },
  { type: 'number',   label: 'Number',     icon: Hash },
  { type: 'date',     label: 'Date',       icon: CalendarDays },
  { type: 'select',   label: 'Dropdown',   icon: List },
  { type: 'checkbox', label: 'Checkbox',   icon: CheckSquare },
]

const STATUS_COLORS: Record<string, string> = {
  new:      'var(--color-blue)',
  reviewed: 'var(--color-orange)',
  triaged:  'var(--color-green)',
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function FormsTab({ projectId }: { projectId: string }) {
  const [forms, setForms]               = useState<IntakeForm[]>([])
  const [loading, setLoading]           = useState(true)
  const [showCreate, setShowCreate]     = useState(false)
  const [selectedForm, setSelectedForm] = useState<IntakeForm | null>(null)
  const [viewMode, setViewMode]         = useState<'builder' | 'submissions'>('builder')
  const [submissions, setSubmissions]   = useState<Submission[]>([])
  const [subLoading, setSubLoading]     = useState(false)
  const [pending, start]                = useTransition()
  const [copied, setCopied]             = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/intake-forms`)
      .then(r => r.json())
      .then(data => { setForms(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [projectId])

  async function loadSubmissions(formId: string) {
    setSubLoading(true)
    const res = await fetch(`/api/intake-forms/${formId}/submissions`)
    const data = await res.json()
    setSubmissions(Array.isArray(data) ? data : [])
    setSubLoading(false)
  }

  function openForm(form: IntakeForm) {
    setSelectedForm(form)
    setViewMode('builder')
  }

  async function viewSubmissions(form: IntakeForm) {
    setSelectedForm(form)
    setViewMode('submissions')
    await loadSubmissions(form.id)
  }

  async function toggleActive(form: IntakeForm) {
    const updated = { ...form, active: !form.active }
    setForms(prev => prev.map(f => f.id === form.id ? updated : f))
    if (selectedForm?.id === form.id) setSelectedForm(updated)
    await fetch(`/api/intake-forms/${form.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: updated.active }),
    })
  }

  async function deleteForm(formId: string) {
    if (!confirm('Delete this form and all its submissions?')) return
    setForms(prev => prev.filter(f => f.id !== formId))
    if (selectedForm?.id === formId) setSelectedForm(null)
    await fetch(`/api/intake-forms/${formId}`, { method: 'DELETE' })
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/forms/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function triageSubmission(submission: Submission) {
    const res = await fetch(`/api/intake-forms/${submission.formId}/submissions`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ submissionId: submission.id, triage: true }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSubmissions(prev => prev.map(s => s.id === submission.id ? updated : s))
    }
  }

  async function markReviewed(submission: Submission) {
    const res = await fetch(`/api/intake-forms/${submission.formId}/submissions`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ submissionId: submission.id, status: 'reviewed' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSubmissions(prev => prev.map(s => s.id === submission.id ? updated : s))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: 'var(--text-tertiary)' }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-primary)', borderTopColor: 'var(--color-blue)' }} />
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Left: forms list */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Intake Forms
          </span>
          <button
            onClick={() => { setShowCreate(true); setSelectedForm(null) }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
          >
            <Plus size={12} />
            New form
          </button>
        </div>

        {forms.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center border-2 border-dashed"
            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}
          >
            <Inbox size={24} className="mx-auto mb-2" />
            <p className="text-xs">No forms yet. Create one to start collecting requests.</p>
          </div>
        ) : (
          forms.map(form => (
            <div
              key={form.id}
              onClick={() => openForm(form)}
              className="rounded-xl p-3 border cursor-pointer transition-all"
              style={{
                background:   selectedForm?.id === form.id ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                borderColor:  selectedForm?.id === form.id ? 'var(--color-blue)' : 'var(--border-primary)',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {form.name}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                  style={{
                    background: form.active ? 'var(--color-green-bg)' : 'var(--bg-tertiary)',
                    color:      form.active ? 'var(--color-green)' : 'var(--text-tertiary)',
                  }}
                >
                  {form.active ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
                <span>{form.submissionCount} submission{form.submissionCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right: form builder or create */}
      <div className="flex-1 min-w-0">
        {showCreate ? (
          <CreateFormPanel
            projectId={projectId}
            onCreated={form => {
              setForms(prev => [form, ...prev])
              setSelectedForm(form)
              setShowCreate(false)
            }}
            onCancel={() => setShowCreate(false)}
          />
        ) : selectedForm ? (
          <FormDetailPanel
            form={selectedForm}
            viewMode={viewMode}
            submissions={submissions}
            subLoading={subLoading}
            copied={copied}
            pending={pending}
            onSave={async (fields, name, description) => {
              const res = await fetch(`/api/intake-forms/${selectedForm.id}`, {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ fields, name, description }),
              })
              if (res.ok) {
                const updated = await res.json()
                setForms(prev => prev.map(f => f.id === updated.id ? updated : f))
                setSelectedForm(updated)
              }
            }}
            onToggleActive={() => toggleActive(selectedForm)}
            onDelete={() => deleteForm(selectedForm.id)}
            onCopyLink={() => copyLink(selectedForm.slug)}
            onViewSubmissions={() => viewSubmissions(selectedForm)}
            onViewBuilder={() => { setViewMode('builder'); setSelectedForm(selectedForm) }}
            onTriage={triageSubmission}
            onMarkReviewed={markReviewed}
            start={start}
          />
        ) : (
          <div
            className="h-full flex items-center justify-center rounded-xl border-2 border-dashed"
            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)', minHeight: 300 }}
          >
            <div className="text-center">
              <Inbox size={32} className="mx-auto mb-3" />
              <p className="text-sm">Select a form to edit, or create a new one.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Create form panel ────────────────────────────────────────────────────────

function CreateFormPanel({
  projectId,
  onCreated,
  onCancel,
}: {
  projectId: string
  onCreated: (form: IntakeForm) => void
  onCancel:  () => void
}) {
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Form name is required'); return }
    setError('')
    start(async () => {
      const res = await fetch(`/api/projects/${projectId}/intake-forms`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), description: description.trim() }),
      })
      if (res.ok) {
        const form = await res.json()
        onCreated(form)
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Failed to create form')
      }
    })
  }

  return (
    <div
      className="rounded-xl p-6 border"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
    >
      <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        New intake form
      </h3>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Form name <span style={{ color: 'var(--color-red)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Design Request, Bug Report"
            autoFocus
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this form for?"
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
          />
        </div>
        {error && (
          <p className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
          >
            {pending ? 'Creating…' : 'Create form'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Form detail panel ────────────────────────────────────────────────────────

function FormDetailPanel({
  form,
  viewMode,
  submissions,
  subLoading,
  copied,
  pending,
  onSave,
  onToggleActive,
  onDelete,
  onCopyLink,
  onViewSubmissions,
  onViewBuilder,
  onTriage,
  onMarkReviewed,
  start,
}: {
  form:              IntakeForm
  viewMode:          'builder' | 'submissions'
  submissions:       Submission[]
  subLoading:        boolean
  copied:            boolean
  pending:           boolean
  onSave:            (fields: Field[], name: string, description: string) => void
  onToggleActive:    () => void
  onDelete:          () => void
  onCopyLink:        () => void
  onViewSubmissions: () => void
  onViewBuilder:     () => void
  onTriage:          (s: Submission) => void
  onMarkReviewed:    (s: Submission) => void
  start:             (fn: () => Promise<void>) => void
}) {
  const [name,        setName]        = useState(form.name)
  const [description, setDescription] = useState(form.description ?? '')
  const [fields,      setFields]      = useState<Field[]>(form.fields)
  const [dirty,       setDirty]       = useState(false)

  // Sync when form prop changes (e.g. after switching forms)
  useEffect(() => {
    setName(form.name)
    setDescription(form.description ?? '')
    setFields(form.fields)
    setDirty(false)
  }, [form.id, form.name, form.description, form.fields])

  function addField(type: FieldType) {
    const newField: Field = {
      id:       uid(),
      type,
      label:    FIELD_TYPES.find(f => f.type === type)?.label ?? type,
      required: false,
    }
    setFields(prev => [...prev, newField])
    setDirty(true)
  }

  function updateField(id: string, patch: Partial<Field>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
    setDirty(true)
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id))
    setDirty(true)
  }

  function save() {
    start(async () => {
      await onSave(fields, name, description)
      setDirty(false)
    })
  }

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/forms/${form.slug}`
    : `/forms/${form.slug}`

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div
        className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
      >
        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-primary)' }}>
          <button
            onClick={onViewBuilder}
            className="px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: viewMode === 'builder' ? 'var(--color-blue)' : 'transparent',
              color:      viewMode === 'builder' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Builder
          </button>
          <button
            onClick={onViewSubmissions}
            className="px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: viewMode === 'submissions' ? 'var(--color-blue)' : 'transparent',
              color:      viewMode === 'submissions' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Submissions ({form.submissionCount})
          </button>
        </div>

        <div className="flex-1" />

        {/* Public URL */}
        <button
          onClick={onCopyLink}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
        >
          {copied ? <CheckCircle2 size={12} style={{ color: 'var(--color-green)' }} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>

        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
        >
          <ExternalLink size={12} />
          Preview
        </a>

        <button
          onClick={onToggleActive}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            background: form.active ? 'var(--color-green-bg)' : 'var(--bg-tertiary)',
            color:      form.active ? 'var(--color-green)' : 'var(--text-tertiary)',
          }}
        >
          {form.active ? <Eye size={12} /> : <EyeOff size={12} />}
          {form.active ? 'Active' : 'Paused'}
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-red)' }}
          title="Delete form"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Content */}
      {viewMode === 'builder' ? (
        <div className="flex gap-4">
          {/* Fields */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setDirty(true) }}
                  className="w-full text-base font-semibold bg-transparent outline-none border-b pb-1"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
                  placeholder="Form name"
                />
              </div>
              {dirty && (
                <button
                  onClick={save}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-60"
                  style={{ background: 'var(--color-blue)', color: '#fff' }}
                >
                  {pending ? 'Saving…' : 'Save changes'}
                </button>
              )}
            </div>

            <input
              value={description}
              onChange={e => { setDescription(e.target.value); setDirty(true) }}
              className="w-full text-sm bg-transparent outline-none"
              style={{ color: 'var(--text-secondary)' }}
              placeholder="Form description (optional)"
            />

            {fields.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center border-2 border-dashed"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}
              >
                <Type size={24} className="mx-auto mb-2" />
                <p className="text-sm">Add fields using the panel on the right.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {fields.map((field, i) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={i}
                    onChange={patch => updateField(field.id, patch)}
                    onRemove={() => removeField(field.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add field sidebar */}
          <div className="w-40 flex-shrink-0">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Add field
            </p>
            <div className="flex flex-col gap-1">
              {FIELD_TYPES.map(ft => (
                <button
                  key={ft.type}
                  onClick={() => addField(ft.type)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors hover:opacity-80 text-left"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  <ft.icon size={12} />
                  {ft.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <SubmissionsView
          submissions={submissions}
          fields={form.fields}
          loading={subLoading}
          onTriage={onTriage}
          onMarkReviewed={onMarkReviewed}
        />
      )}
    </div>
  )
}

// ─── Field editor ─────────────────────────────────────────────────────────────

function FieldEditor({
  field,
  index,
  onChange,
  onRemove,
}: {
  field:    Field
  index:    number
  onChange: (patch: Partial<Field>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl border"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <GripVertical size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>#{index + 1}</span>
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {field.label || 'Untitled field'}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
          {FIELD_TYPES.find(f => f.type === field.type)?.label ?? field.type}
        </span>
        {field.required && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-red-bg)', color: 'var(--color-red)' }}>
            Required
          </span>
        )}
        <ChevronDown
          size={14}
          style={{ color: 'var(--text-tertiary)', transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }}
        />
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-1 rounded transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-red)' }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t space-y-3" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Label</label>
            <input
              value={field.label}
              onChange={e => onChange({ label: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>
          {field.type !== 'checkbox' && (
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Placeholder</label>
              <input
                value={field.placeholder ?? ''}
                onChange={e => onChange({ placeholder: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>
          )}
          {field.type === 'select' && (
            <div>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                Options (one per line)
              </label>
              <textarea
                value={(field.options ?? []).join('\n')}
                onChange={e => onChange({ options: e.target.value.split('\n').filter(Boolean) })}
                rows={4}
                className="w-full px-2.5 py-1.5 rounded-lg text-sm border outline-none resize-none"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={e => onChange({ required: e.target.checked })}
              className="w-3.5 h-3.5 rounded"
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Required field</span>
          </label>
        </div>
      )}
    </div>
  )
}

// ─── Submissions view ─────────────────────────────────────────────────────────

function SubmissionsView({
  submissions,
  fields,
  loading,
  onTriage,
  onMarkReviewed,
}: {
  submissions:    Submission[]
  fields:         Field[]
  loading:        boolean
  onTriage:       (s: Submission) => void
  onMarkReviewed: (s: Submission) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-tertiary)' }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-primary)', borderTopColor: 'var(--color-blue)' }} />
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div
        className="rounded-xl p-12 text-center border-2 border-dashed"
        style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}
      >
        <Inbox size={32} className="mx-auto mb-3" />
        <p className="text-sm">No submissions yet.</p>
        <p className="text-xs mt-1">Share the form link to start collecting requests.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {submissions.map(sub => {
        const data = sub.data as Record<string, string>
        const firstValue = Object.values(data)[0] ?? '—'
        const isExpanded = expanded === sub.id

        return (
          <div
            key={sub.id}
            className="rounded-xl border"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : sub.id)}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: STATUS_COLORS[sub.status] ?? 'var(--text-tertiary)' }}
              />
              <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {sub.submitterName ?? String(firstValue).slice(0, 60)}
              </span>
              {sub.submitterEmail && (
                <span className="text-xs hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>
                  {sub.submitterEmail}
                </span>
              )}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                style={{ background: `${STATUS_COLORS[sub.status]}20`, color: STATUS_COLORS[sub.status] }}
              >
                {sub.status}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <Clock size={10} className="inline mr-0.5" />
                {new Date(sub.createdAt).toLocaleDateString()}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', transform: isExpanded ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} />
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="space-y-2 mt-3">
                  {fields.map(f => (
                    <div key={f.id}>
                      <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{f.label}</p>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {data[f.id] ?? <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </p>
                    </div>
                  ))}
                </div>
                {sub.taskId && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-green)' }}>
                    <CheckCircle2 size={12} />
                    Triaged — task created
                  </div>
                )}
                {!sub.taskId && (
                  <div className="flex gap-2 mt-3">
                    {sub.status === 'new' && (
                      <button
                        onClick={() => onMarkReviewed(sub)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        Mark reviewed
                      </button>
                    )}
                    <button
                      onClick={() => onTriage(sub)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ background: 'var(--color-blue)', color: '#fff' }}
                    >
                      Triage → create task
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
