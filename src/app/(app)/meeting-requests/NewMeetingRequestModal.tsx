'use client'

import { useState } from 'react'
import { X, Plus, Search, Clock, MapPin, Calendar } from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'

type UserOption = { id: string; name: string; email: string; avatarUrl: string | null }

type Props = {
  allUsers:     UserOption[]
  currentUserId: string
  onClose:      () => void
  onCreated:    (request: any) => void
}

const DURATIONS = [
  { label: '15 min',  value: 15 },
  { label: '30 min',  value: 30 },
  { label: '45 min',  value: 45 },
  { label: '1 hour',  value: 60 },
  { label: '90 min',  value: 90 },
  { label: '2 hours', value: 120 },
]

export function NewMeetingRequestModal({ allUsers, currentUserId, onClose, onCreated }: Props) {
  const [title,           setTitle]           = useState('')
  const [agenda,          setAgenda]          = useState('')
  const [proposedTime,    setProposedTime]    = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [location,        setLocation]        = useState('')
  const [attendeeIds,     setAttendeeIds]     = useState<string[]>([])
  const [userSearch,      setUserSearch]      = useState('')
  const [saving,          setSaving]          = useState(false)
  const [errors,          setErrors]          = useState<Record<string, string>>({})

  const filteredUsers = allUsers.filter(u =>
    u.id !== currentUserId &&
    !attendeeIds.includes(u.id) &&
    (u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email.toLowerCase().includes(userSearch.toLowerCase()))
  )

  const selectedAttendees = allUsers.filter(u => attendeeIds.includes(u.id))

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim())    e.title       = 'Title is required'
    if (!proposedTime)    e.proposedTime = 'Date & time is required'
    if (proposedTime && new Date(proposedTime) < new Date()) {
      e.proposedTime = 'Proposed time must be in the future'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(submitStatus: 'draft' | 'pending_review') {
    if (!validate()) return
    setSaving(true)
    try {
      const res = await fetch('/api/meeting-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, agenda, proposedTime, durationMinutes, location, attendeeIds, status: submitStatus }),
      })
      const json = await res.json()
      if (res.ok) {
        onCreated(json.data)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[18px] shadow-2xl"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
        >
          <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            New Meeting Request
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{ background: 'var(--bg-secondary)' }}
            aria-label="Close"
          >
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Title */}
          <Field label="Meeting Title" error={errors.title} required>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q3 Planning Session"
              className="form-input w-full"
            />
          </Field>

          {/* Date/Time + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date & Time" error={errors.proposedTime} required>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="datetime-local"
                  value={proposedTime}
                  onChange={e => setProposedTime(e.target.value)}
                  className="form-input w-full pl-9"
                />
              </div>
            </Field>
            <Field label="Duration">
              <div className="relative">
                <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                <select
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="form-input w-full pl-9 appearance-none"
                >
                  {DURATIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {/* Location */}
          <Field label="Location / Link">
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Conference Room A, or Zoom link"
                className="form-input w-full pl-9"
              />
            </div>
          </Field>

          {/* Agenda */}
          <Field label="Agenda">
            <textarea
              value={agenda}
              onChange={e => setAgenda(e.target.value)}
              placeholder="Meeting agenda, topics to cover…"
              rows={3}
              className="form-input w-full resize-none"
            />
          </Field>

          {/* Attendees */}
          <Field label="Attendees">
            {selectedAttendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedAttendees.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-medium"
                    style={{ background: 'rgba(0,122,255,0.10)', color: 'var(--color-blue)', border: '1px solid rgba(0,122,255,0.2)' }}
                  >
                    <Avatar name={u.name} src={u.avatarUrl ?? undefined} size={18} />
                    {u.name}
                    <button
                      onClick={() => setAttendeeIds(ids => ids.filter(id => id !== u.id))}
                      aria-label={`Remove ${u.name}`}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search team members to invite…"
                className="form-input w-full pl-9"
              />
            </div>
            {userSearch && filteredUsers.length > 0 && (
              <div
                className="mt-1 rounded-[10px] overflow-hidden border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
              >
                {filteredUsers.slice(0, 6).map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setAttendeeIds(ids => [...ids, u.id]); setUserSearch('') }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:opacity-80"
                  >
                    <Avatar name={u.name} src={u.avatarUrl ?? undefined} size={28} />
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{u.email}</p>
                    </div>
                    <Plus size={14} className="ml-auto flex-shrink-0" style={{ color: 'var(--color-blue)' }} />
                  </button>
                ))}
              </div>
            )}
            {userSearch && filteredUsers.length === 0 && (
              <p className="text-[12px] mt-1 px-1" style={{ color: 'var(--text-tertiary)' }}>No matching team members</p>
            )}
          </Field>
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 border-t sticky bottom-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
        >
          <button
            onClick={() => handleSubmit('draft')}
            disabled={saving}
            className="text-[14px] font-medium px-4 py-2 rounded-[8px] transition-all hover:opacity-80"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            Save Draft
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-[14px] font-medium px-4 py-2 rounded-[8px] transition-all hover:opacity-80"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('pending_review')}
              disabled={saving}
              className="text-[14px] font-semibold px-4 py-2 rounded-[8px] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--color-blue)', color: '#fff' }}
            >
              {saving ? 'Submitting…' : 'Submit for Review'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .form-input {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-primary);
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          outline: none;
          transition: border-color 0.15s;
        }
        .form-input:focus {
          border-color: var(--color-blue);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children, error, required }: {
  label: string; children: React.ReactNode; error?: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--color-red)' }}> *</span>}
      </label>
      {children}
      {error && <p className="text-[12px]" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </div>
  )
}
