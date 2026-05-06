'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'

type Field = {
  id:          string
  type:        'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'date'
  label:       string
  placeholder?: string
  required?:   boolean
  options?:    string[]
}

type Form = {
  id:          string
  name:        string
  description: string | null
  fields:      Field[]
  slug:        string
}

export function FormPageClient({ form }: { form: Form }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitterName,  setSubmitterName]  = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, start]      = useTransition()

  function setValue(id: string, val: string) {
    setValues(prev => ({ ...prev, [id]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    start(async () => {
      const res = await fetch(`/api/forms/${form.slug}/submit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data:           values,
          submitterName:  submitterName.trim() || null,
          submitterEmail: submitterEmail.trim() || null,
          _trap:          '',
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Submission failed. Please try again.')
        return
      }

      setSuccess(true)
    })
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-green-bg)', color: 'var(--color-green)' }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Request submitted
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Thanks! We&apos;ll review your submission and get back to you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {form.name}
          </h1>
          {form.description && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {form.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot — visually hidden */}
          <input name="_trap" type="text" className="hidden" tabIndex={-1} aria-hidden="true" />

          {/* Submitter identity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Your name
              </label>
              <input
                type="text"
                value={submitterName}
                onChange={e => setSubmitterName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
                style={{
                  background:   'var(--bg-primary)',
                  borderColor:  'var(--border-primary)',
                  color:        'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Your email
              </label>
              <input
                type="email"
                value={submitterEmail}
                onChange={e => setSubmitterEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
                style={{
                  background:   'var(--bg-primary)',
                  borderColor:  'var(--border-primary)',
                  color:        'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-primary)' }} />

          {/* Dynamic fields */}
          {form.fields.map(field => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id] ?? ''}
              onChange={val => setValue(field.id, val)}
            />
          ))}

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--color-red-bg)', color: 'var(--color-red)' }}
            >
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
          >
            {pending ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field:    Field
  value:    string
  onChange: (v: string) => void
}) {
  const inputStyle = {
    background:  'var(--bg-primary)',
    borderColor: 'var(--border-primary)',
    color:       'var(--text-primary)',
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
        {field.label}
        {field.required && <span style={{ color: 'var(--color-red)' }}> *</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={inputStyle}
        />
      ) : field.type === 'select' ? (
        <div className="relative">
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            required={field.required}
            className="w-full px-3 py-2 pr-8 rounded-lg text-sm border outline-none appearance-none"
            style={inputStyle}
          >
            <option value="">Select an option…</option>
            {(field.options ?? []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : field.type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={e => onChange(e.target.checked ? 'true' : 'false')}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {field.placeholder ?? 'Yes'}
          </span>
        </label>
      ) : (
        <input
          type={field.type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={inputStyle}
        />
      )}
    </div>
  )
}
