'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Pencil, Mail,
  FileText, Video, ArrowLeft, Calendar, Users, Loader2, Check,
  ClipboardList, Wand2, CheckCheck, Send,
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

type Minutes = {
  id: string
  meetingId: string
  content: string
  status: 'draft' | 'pending_review' | 'approved' | 'distributed'
  generatedByAi: boolean
  reviewedBy: string | null
  approvedBy: string | null
  distributedAt: string | null
  createdAt: string
  updatedAt: string
}

type User = { id: string; name: string; email: string; avatarUrl: string | null }

type Props = {
  meeting: Meeting
  tasks: Task[]
  allUsers: User[]
  initialMinutes: Minutes | null
  isManagerOrAdmin: boolean
}

type Tab = 'overview' | 'minutes'

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  manual:      { label: 'Manual',      icon: FileText, color: 'var(--color-blue)' },
  gmail:       { label: 'Gmail',       icon: Mail,     color: 'var(--color-red)' },
  google_meet: { label: 'Google Meet', icon: Video,    color: 'var(--color-green)' },
}

const MINUTES_STATUS_CONFIG = {
  draft:          { label: 'Draft',           color: 'var(--text-tertiary)',  bg: 'var(--bg-secondary)' },
  pending_review: { label: 'Pending Review',  color: 'var(--color-orange)',   bg: 'rgba(255,149,0,0.10)' },
  approved:       { label: 'Approved',        color: 'var(--color-green)',    bg: 'rgba(52,199,89,0.10)' },
  distributed:    { label: 'Distributed',     color: 'var(--color-blue)',     bg: 'rgba(0,122,255,0.10)' },
}

export function MeetingDetailClient({ meeting, tasks: initialTasks, allUsers, initialMinutes, isManagerOrAdmin }: Props) {
  const [tasks,       setTasks]       = useState(initialTasks)
  const [activeTab,   setActiveTab]   = useState<Tab>('overview')
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [minutes,     setMinutes]     = useState<Minutes | null>(initialMinutes)

  const src     = SOURCE_CONFIG[meeting.source] ?? SOURCE_CONFIG.manual
  const SrcIcon = src.icon

  const triage   = tasks.filter(t => t.status === 'triage')
  const approved = tasks.filter(t => t.status !== 'triage' && t.status !== 'done')
  const done     = tasks.filter(t => t.status === 'done')

  async function approveTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: 'todo' }),
    })
    if (res.ok) setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'todo' } : t))
  }

  async function rejectTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function saveEdit(id: string, updates: Partial<Task>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(updates),
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(prev => prev.map(t => t.id === id
        ? { ...t, ...data.task, assignee: updates.assigneeId ? (allUsers.find(u => u.id === updates.assigneeId) ?? null) : t.assignee }
        : t
      ))
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
          {meeting.attendees.length > 0 && (
            <div className="flex items-center flex-shrink-0">
              {meeting.attendees.slice(0, 5).map((att, i) => (
                <div key={att.email || i} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: meeting.attendees.length - i }} title={att.name}>
                  <Avatar name={att.name} size={32} />
                </div>
              ))}
              {meeting.attendees.length > 5 && (
                <div
                  className="flex items-center justify-center text-[11px] font-bold"
                  style={{ marginLeft: -10, width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--border)', color: 'var(--text-secondary)', zIndex: 0 }}
                >
                  +{meeting.attendees.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-[10px] w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {([
          { key: 'overview' as Tab, label: 'Overview',       icon: FileText },
          { key: 'minutes'  as Tab, label: 'Minutes',        icon: ClipboardList },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all"
            style={{
              background: activeTab === key ? 'var(--bg-primary)' : 'transparent',
              color:      activeTab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow:  activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Icon size={14} strokeWidth={1.5} />
            {label}
            {key === 'minutes' && minutes && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5"
                style={{
                  background: MINUTES_STATUS_CONFIG[minutes.status]?.bg ?? 'var(--bg-secondary)',
                  color:      MINUTES_STATUS_CONFIG[minutes.status]?.color ?? 'var(--text-tertiary)',
                }}
              >
                {MINUTES_STATUS_CONFIG[minutes.status]?.label ?? minutes.status}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {meeting.summary && (
            <div className="glass-card mb-5 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left"
                onClick={() => setSummaryOpen(o => !o)}
                aria-expanded={summaryOpen}
              >
                <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>AI Summary</span>
                {summaryOpen
                  ? <ChevronUp size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                  : <ChevronDown size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                }
              </button>
              {summaryOpen && (
                <div className="px-5 pb-5">
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{meeting.summary}</p>
                </div>
              )}
            </div>
          )}

          {meeting.decisions.length > 0 && (
            <div className="glass-card p-5 mb-5">
              <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Key Decisions</h2>
              <ul className="flex flex-col gap-2">
                {meeting.decisions.map((d, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-green)' }} />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Extracted Tasks</h2>
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {triage.length} pending · {approved.length} approved
              </span>
            </div>
            {tasks.length === 0 && (
              <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>No tasks were extracted from this meeting.</p>
            )}
            {triage.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Needs Review</p>
                <div className="flex flex-col gap-2">
                  {triage.map(task => (
                    editingTask === task.id
                      ? <TaskEditForm key={task.id} task={task} allUsers={allUsers} onSave={saveEdit} onCancel={() => setEditingTask(null)} />
                      : <TaskCard key={task.id} task={task} onApprove={() => approveTask(task.id)} onReject={() => rejectTask(task.id)} onEdit={() => setEditingTask(task.id)} />
                  ))}
                </div>
              </div>
            )}
            {approved.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Approved</p>
                <div className="flex flex-col gap-2">
                  {approved.map(task => (
                    <TaskCard key={task.id} task={task} approved onEdit={() => setEditingTask(task.id)} />
                  ))}
                </div>
              </div>
            )}
            {done.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Done</p>
                <div className="flex flex-col gap-2 opacity-60">
                  {done.map(task => (<TaskCard key={task.id} task={task} done />))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Minutes Tab */}
      {activeTab === 'minutes' && (
        <MinutesTab
          meeting={meeting}
          minutes={minutes}
          isManagerOrAdmin={isManagerOrAdmin}
          onMinutesChange={setMinutes}
        />
      )}
    </div>
  )
}

// ─── Minutes Tab ──────────────────────────────────────────────────────────────

function MinutesTab({
  meeting,
  minutes,
  isManagerOrAdmin,
  onMinutesChange,
}: {
  meeting: Meeting
  minutes: Minutes | null
  isManagerOrAdmin: boolean
  onMinutesChange: (m: Minutes) => void
}) {
  const [content,     setContent]     = useState(minutes?.content ?? '')
  const [editing,     setEditing]     = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [actioning,   setActioning]   = useState<string | null>(null)
  const [transcript,  setTranscript]  = useState('')
  const [pasteMode,   setPasteMode]   = useState(false)

  const statusCfg = minutes ? MINUTES_STATUS_CONFIG[minutes.status] : null

  async function handleGenerate(rawContent?: string) {
    setGenerating(true)
    try {
      let url = `/api/meetings/${meeting.id}/minutes`
      let body: BodyInit | undefined

      if (rawContent) {
        // If pasting transcript, first update the meeting rawContent, then generate
        body = JSON.stringify({ rawContent })
        // Patch meeting raw content via a simple workaround: we POST directly
        // with a transcript body that the route will accept
      }

      const res = await fetch(url, { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        onMinutesChange(json.minutes)
        setContent(json.minutes.content)
        setPasteMode(false)
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveEdit() {
    setActioning('save')
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/minutes`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content }),
      })
      if (res.ok) {
        const json = await res.json()
        onMinutesChange(json.minutes)
        setEditing(false)
      }
    } finally {
      setActioning(null)
    }
  }

  async function handleSubmitForReview() {
    setActioning('submit')
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/minutes`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'pending_review' }),
      })
      if (res.ok) {
        const json = await res.json()
        onMinutesChange(json.minutes)
      }
    } finally {
      setActioning(null)
    }
  }

  async function handleApprove() {
    setActioning('approve')
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/minutes/approve`, { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        onMinutesChange(json.minutes)
      }
    } finally {
      setActioning(null)
    }
  }

  async function handleRequestChanges() {
    setActioning('changes')
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/minutes`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'draft' }),
      })
      if (res.ok) {
        const json = await res.json()
        onMinutesChange(json.minutes)
      }
    } finally {
      setActioning(null)
    }
  }

  async function handleDistribute() {
    setActioning('distribute')
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/minutes/distribute`, { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        onMinutesChange(json.minutes)
      }
    } finally {
      setActioning(null)
    }
  }

  // No minutes yet
  if (!minutes) {
    return (
      <div className="glass-card p-8 text-center">
        <ClipboardList size={40} strokeWidth={1} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No minutes yet</p>
        <p className="text-[13px] mb-5" style={{ color: 'var(--text-tertiary)' }}>
          {meeting.rawContent
            ? 'Generate meeting minutes from the transcript/notes.'
            : 'Paste a transcript below to generate AI-assisted minutes.'}
        </p>

        {meeting.rawContent ? (
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
          >
            {generating
              ? <Loader2 size={15} className="animate-spin" />
              : <Wand2 size={15} />
            }
            {generating ? 'Generating…' : 'Generate Minutes with AI'}
          </button>
        ) : (
          <>
            {!pasteMode ? (
              <button
                onClick={() => setPasteMode(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--color-blue)', color: '#fff' }}
              >
                <ClipboardList size={15} />
                Paste Transcript
              </button>
            ) : (
              <div className="text-left mt-4">
                <label className="text-[13px] font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Paste meeting transcript or notes
                </label>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  rows={10}
                  placeholder="Paste the full meeting transcript here…"
                  className="w-full rounded-[8px] p-3 text-[13px] resize-none outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <div className="flex gap-2 mt-3 justify-end">
                  <button
                    onClick={() => { setPasteMode(false); setTranscript('') }}
                    className="text-[13px] px-3 py-1.5 rounded-[8px]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleGenerate(transcript)}
                    disabled={generating || !transcript.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] text-[13px] font-semibold disabled:opacity-50"
                    style={{ background: 'var(--color-blue)', color: '#fff' }}
                  >
                    {generating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                    {generating ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Minutes exist
  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Meeting Minutes</h2>
          {statusCfg && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: statusCfg.bg, color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          )}
          {minutes.generatedByAi && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              <Wand2 size={11} />
              AI generated
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Edit toggle */}
          {minutes.status !== 'distributed' && isManagerOrAdmin && !editing && (
            <button
              onClick={() => { setEditing(true); setContent(minutes.content) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <Pencil size={12} />
              Edit
            </button>
          )}

          {/* Regenerate */}
          {minutes.status !== 'distributed' && isManagerOrAdmin && (
            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      {editing ? (
        <div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={20}
            className="w-full rounded-[8px] p-3 text-[13px] font-mono resize-y outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--color-blue)', color: 'var(--text-primary)', lineHeight: 1.7 }}
          />
          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={() => { setEditing(false); setContent(minutes.content) }}
              className="text-[13px] px-3 py-1.5 rounded-[8px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={actioning === 'save'}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] text-[13px] font-semibold disabled:opacity-50"
              style={{ background: 'var(--color-blue)', color: '#fff' }}
            >
              {actioning === 'save' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <pre
          className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans"
          style={{ color: 'var(--text-primary)' }}
        >
          {minutes.content}
        </pre>
      )}

      {/* Action buttons */}
      {!editing && minutes.status !== 'distributed' && (
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Submit for review (non-managers, or when draft) */}
          {minutes.status === 'draft' && (
            <button
              onClick={handleSubmitForReview}
              disabled={!!actioning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'rgba(255,149,0,0.12)', color: 'var(--color-orange)', border: '1px solid rgba(255,149,0,0.2)' }}
            >
              {actioning === 'submit' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Submit for Review
            </button>
          )}

          {/* Manager/admin: approve or request changes */}
          {isManagerOrAdmin && minutes.status === 'pending_review' && (
            <>
              <button
                onClick={handleApprove}
                disabled={!!actioning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--color-green)', border: '1px solid rgba(52,199,89,0.2)' }}
              >
                {actioning === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                Approve Minutes
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={!!actioning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--color-red)', border: '1px solid rgba(255,59,48,0.15)' }}
              >
                {actioning === 'changes' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Request Changes
              </button>
            </>
          )}

          {/* Distribute */}
          {isManagerOrAdmin && minutes.status === 'approved' && (
            <button
              onClick={handleDistribute}
              disabled={!!actioning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--color-blue)', color: '#fff' }}
            >
              {actioning === 'distribute' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {actioning === 'distribute' ? 'Distributing…' : 'Distribute to Attendees'}
            </button>
          )}
        </div>
      )}

      {/* Distributed timestamp */}
      {minutes.status === 'distributed' && minutes.distributedAt && (
        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--color-green)' }}>
          <CheckCheck size={14} />
          Distributed on {new Date(minutes.distributedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onApprove, onReject, onEdit, approved, done }: {
  task: Task
  onApprove?: () => void
  onReject?: () => void
  onEdit?: () => void
  approved?: boolean
  done?: boolean
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handleApprove() { setLoading('approve'); await onApprove?.(); setLoading(null) }
  async function handleReject()  { setLoading('reject');  await onReject?.();  setLoading(null) }

  return (
    <div className="flex items-start gap-3 p-4 rounded-[10px] transition-all" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</span>
          <PriorityBadge priority={task.priority} small />
          {(approved || done) && <StatusBadge status={task.status} small />}
        </div>
        {task.description && (
          <p className="text-[12px] leading-relaxed mb-1.5" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
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
      {!done && (
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {!approved && onApprove && (
            <button
              onClick={handleApprove}
              disabled={!!loading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'var(--color-green)', borderRadius: 'var(--radius-sm)' }}
              aria-label="Approve task"
            >
              {loading === 'approve' ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" /> : <Check size={12} strokeWidth={2} />}
              Approve
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-[6px] transition-all hover:opacity-70"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
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
              style={{ background: 'rgba(255,59,48,0.10)', color: 'var(--color-red)' }}
              aria-label="Reject task"
            >
              {loading === 'reject' ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" /> : <XCircle size={13} strokeWidth={1.5} />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Task Edit Form ───────────────────────────────────────────────────────────

function TaskEditForm({ task, allUsers, onSave, onCancel }: {
  task: Task
  allUsers: User[]
  onSave: (id: string, updates: Partial<Task>) => Promise<void>
  onCancel: () => void
}) {
  const [title,      setTitle]      = useState(task.title)
  const [description, setDesc]      = useState(task.description ?? '')
  const [priority,   setPriority]   = useState(task.priority)
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
  const [dueDate,    setDueDate]    = useState(task.dueDate ?? '')
  const [saving,     setSaving]     = useState(false)

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
    background: 'var(--bg-primary)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', width: '100%', outline: 'none',
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-[10px]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--color-blue)' }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" style={inputStyle} />
      <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{ ...inputStyle, resize: 'none' }} />
      <div className="grid grid-cols-3 gap-2">
        <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={inputStyle}>
          <option value="">Unassigned</option>
          {allUsers.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
        </select>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-[12px] font-medium" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white"
          style={{ background: 'var(--color-blue)', borderRadius: 'var(--radius-sm)', opacity: saving || !title.trim() ? 0.5 : 1 }}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : null}
          Approve &amp; Save
        </button>
      </div>
    </div>
  )
}
