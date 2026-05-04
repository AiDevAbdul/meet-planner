'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, X, FileText, Mail, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

type Meeting = {
  id: string
  title: string
  source: string
  summary: string | null
  date: string | null
  decisions: string[]
  attendees: { name: string; email: string }[]
  taskCount: number
  createdAt: Date
}

type Props = {
  initialMeetings: Meeting[]
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  manual:      { label: 'Manual',      icon: FileText, color: 'var(--color-blue)' },
  gmail:       { label: 'Gmail',       icon: Mail,     color: 'var(--color-red)' },
  google_meet: { label: 'Google Meet', icon: Video,    color: 'var(--color-green)' },
}

export function MeetingsClient({ initialMeetings }: Props) {
  const router = useRouter()
  const [meetings, setMeetings] = useState(initialMeetings)
  const [showModal, setShowModal] = useState(false)
  const [rawContent, setRawContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; meetingId?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rawContent.trim()) return
    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent, source: 'manual' }),
      })
      const data = await res.json()

      if (!res.ok && res.status !== 207) {
        setResult({ success: false, message: data.error ?? 'Something went wrong' })
        return
      }

      setResult({
        success:   true,
        message:   `Meeting extracted: "${data.meeting?.title}" — ${data.tasks?.length ?? 0} tasks created`,
        meetingId: data.meeting?.id,
      })

      // Prepend new meeting to list
      if (data.meeting) {
        setMeetings(prev => [{
          ...data.meeting,
          attendees: data.meeting.attendees ?? [],
          decisions: data.meeting.decisions ?? [],
          taskCount: data.tasks?.length ?? 0,
        }, ...prev])
      }

      setRawContent('')
    } catch {
      setResult({ success: false, message: 'Network error — please try again' })
    } finally {
      setSubmitting(false)
    }
  }

  function closeModal() {
    setShowModal(false)
    setResult(null)
    setRawContent('')
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>
            Meetings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 font-medium text-white text-sm transition-all hover:opacity-90 active:scale-95"
          style={{
            background:    'var(--color-blue)',
            borderRadius:  'var(--radius-md)',
            boxShadow:     'var(--shadow-sm)',
          }}
        >
          <Plus size={16} strokeWidth={1.5} />
          Add Meeting
        </button>
      </div>

      {/* Grid */}
      {meetings.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center gap-3">
          <FileText size={40} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>No meetings yet</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Paste meeting notes or connect Gmail to get started.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 flex items-center gap-2 px-4 py-2 font-medium text-white text-sm"
            style={{ background: 'var(--color-blue)', borderRadius: 'var(--radius-md)' }}
          >
            <Plus size={15} strokeWidth={1.5} />
            Add your first meeting
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map(m => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      )}

      {/* Add Meeting Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="glass-card w-full max-w-2xl p-6 relative"
            style={{
              background:   'var(--bg-primary)',
              borderRadius: 'var(--radius-xl)',
              boxShadow:    'var(--shadow-xl)',
              maxHeight:    '90vh',
              overflowY:    'auto',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Add Meeting Notes
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Paste raw meeting notes or a transcript. AI will extract tasks, decisions, and attendees.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-[8px] transition-all hover:opacity-70"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Close modal"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {result ? (
              <div className="flex flex-col items-center gap-4 py-8">
                {result.success ? (
                  <CheckCircle size={44} style={{ color: 'var(--color-green)' }} strokeWidth={1.5} />
                ) : (
                  <AlertCircle size={44} style={{ color: 'var(--color-red)' }} strokeWidth={1.5} />
                )}
                <p
                  className="text-[15px] font-medium text-center"
                  style={{ color: result.success ? 'var(--color-green)' : 'var(--color-red)' }}
                >
                  {result.message}
                </p>
                <div className="flex gap-3 mt-2">
                  {result.success && result.meetingId && (
                    <Link
                      href={`/meetings/${result.meetingId}`}
                      className="px-4 py-2 text-sm font-medium text-white"
                      style={{ background: 'var(--color-blue)', borderRadius: 'var(--radius-md)' }}
                      onClick={closeModal}
                    >
                      View Meeting
                    </Link>
                  )}
                  <button
                    onClick={() => { setResult(null); setRawContent('') }}
                    className="px-4 py-2 text-sm font-medium"
                    style={{
                      background:   'var(--bg-secondary)',
                      color:        'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border:       '1px solid var(--border)',
                    }}
                  >
                    Add Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <textarea
                  value={rawContent}
                  onChange={e => setRawContent(e.target.value)}
                  placeholder="Paste your meeting notes or transcript here…&#10;&#10;Example:&#10;Date: May 4, 2026&#10;Attendees: Abdul (PM), Sarah (Design), John (Eng)&#10;&#10;We decided to launch the beta by May 15.&#10;Sarah will finish the design mockups by May 8.&#10;John will implement the API by May 10. High priority."
                  rows={14}
                  className="w-full resize-none text-sm outline-none transition-all"
                  style={{
                    background:   'var(--bg-secondary)',
                    color:        'var(--text-primary)',
                    border:       '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding:      '12px 14px',
                    fontFamily:   'inherit',
                    lineHeight:   '1.6',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--color-blue)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                  disabled={submitting}
                />

                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {rawContent.length.toLocaleString()} characters
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium transition-all"
                      style={{
                        color:        'var(--text-secondary)',
                        background:   'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border:       '1px solid var(--border)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !rawContent.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{
                        background:   'var(--color-blue)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
                          Extracting…
                        </>
                      ) : (
                        'Extract with AI'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const src = SOURCE_CONFIG[meeting.source] ?? SOURCE_CONFIG.manual
  const SrcIcon = src.icon

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="glass-card flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ textDecoration: 'none' }}
    >
      {/* Source badge */}
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: `${src.color}18`,
            color:      src.color,
          }}
        >
          <SrcIcon size={11} strokeWidth={2} />
          {src.label}
        </span>
        {meeting.taskCount > 0 && (
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(0,122,255,0.10)',
              color:      'var(--color-blue)',
            }}
          >
            {meeting.taskCount} task{meeting.taskCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        className="text-[15px] font-semibold leading-snug line-clamp-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {meeting.title}
      </h3>

      {/* Summary */}
      {meeting.summary && (
        <p
          className="text-[13px] leading-relaxed line-clamp-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {meeting.summary}
        </p>
      )}

      {/* Date */}
      <p className="text-[12px] mt-auto" style={{ color: 'var(--text-tertiary)' }}>
        {meeting.date ? formatDate(meeting.date) : formatDate(meeting.createdAt?.toString())}
      </p>
    </Link>
  )
}
