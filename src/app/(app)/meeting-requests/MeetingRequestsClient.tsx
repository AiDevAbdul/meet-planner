'use client'

import { useState } from 'react'
import { Plus, Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'
import { NewMeetingRequestModal } from './NewMeetingRequestModal'
import { formatDate } from '@/lib/utils'

type Attendee = { id: string; name: string; email: string; avatarUrl: string | null }

type MeetingRequest = {
  id:                    string
  title:                 string
  agenda:                string | null
  proposedTime:          string
  durationMinutes:       number
  location:              string | null
  attendeeIds:           string[] | null
  status:                'draft' | 'pending_review' | 'approved' | 'rejected' | 'sent'
  createdBy:             string
  reviewedBy:            string | null
  reviewNote:            string | null
  googleCalendarEventId: string | null
  createdAt:             string
  creatorName:           string | null
  creatorEmail:          string | null
  creatorAvatarUrl:      string | null
  attendees:             Attendee[]
}

type UserOption = { id: string; name: string; email: string; avatarUrl: string | null }

type Props = {
  initialRequests:  MeetingRequest[]
  allUsers:         UserOption[]
  currentUserId:    string
  isManagerOrAdmin: boolean
}

type Tab = 'pending_review' | 'approved' | 'all'

const STATUS_CONFIG = {
  draft:          { label: 'Draft',          color: 'var(--text-tertiary)',  bg: 'var(--bg-secondary)',        icon: null },
  pending_review: { label: 'Pending Review', color: 'var(--color-orange)',   bg: 'rgba(255,149,0,0.10)',       icon: AlertCircle },
  approved:       { label: 'Approved',       color: 'var(--color-green)',    bg: 'rgba(52,199,89,0.10)',       icon: CheckCircle },
  rejected:       { label: 'Rejected',       color: 'var(--color-red)',      bg: 'rgba(255,59,48,0.10)',       icon: XCircle },
  sent:           { label: 'Sent',           color: 'var(--color-blue)',     bg: 'rgba(0,122,255,0.10)',       icon: Send },
}

export function MeetingRequestsClient({ initialRequests, allUsers, currentUserId, isManagerOrAdmin }: Props) {
  const [requests,    setRequests]    = useState<MeetingRequest[]>(initialRequests)
  const [activeTab,   setActiveTab]   = useState<Tab>('pending_review')
  const [showModal,   setShowModal]   = useState(false)
  const [rejectId,    setRejectId]    = useState<string | null>(null)
  const [rejectNote,  setRejectNote]  = useState('')
  const [actioningId, setActioningId] = useState<string | null>(null)

  const filtered = requests.filter(r => {
    if (activeTab === 'pending_review') return r.status === 'pending_review' || r.status === 'draft'
    if (activeTab === 'approved')       return r.status === 'approved' || r.status === 'sent'
    return true
  })

  const pendingCount  = requests.filter(r => r.status === 'pending_review' || r.status === 'draft').length
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'sent').length

  async function handleApprove(id: string) {
    setActioningId(id)
    try {
      const res = await fetch(`/api/meeting-requests/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (res.ok) {
        const json = await res.json()
        setRequests(prev => prev.map(r => r.id === id ? { ...r, ...json.data } : r))
      }
    } finally {
      setActioningId(null)
    }
  }

  async function handleReject(id: string) {
    setActioningId(id)
    try {
      const res = await fetch(`/api/meeting-requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote: rejectNote }),
      })
      if (res.ok) {
        const json = await res.json()
        setRequests(prev => prev.map(r => r.id === id ? { ...r, ...json.data } : r))
        setRejectId(null)
        setRejectNote('')
      }
    } finally {
      setActioningId(null)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/meeting-requests/${id}`, { method: 'DELETE' })
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>Meeting Requests</h1>
          <p className="text-[14px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Schedule and manage meeting requests
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[14px] font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--color-blue)', color: '#fff' }}
        >
          <Plus size={16} />
          New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-[10px] w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {([
          { key: 'pending_review' as Tab, label: 'Pending Review', count: pendingCount },
          { key: 'approved' as Tab,       label: 'Approved',       count: approvedCount },
          { key: 'all' as Tab,            label: 'All',            count: requests.length },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all"
            style={{
              background: activeTab === tab.key ? 'var(--bg-primary)' : 'transparent',
              color:      activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow:  activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === tab.key && tab.key === 'pending_review'
                    ? 'rgba(255,149,0,0.15)' : 'var(--bg-secondary)',
                  color: activeTab === tab.key && tab.key === 'pending_review'
                    ? 'var(--color-orange)' : 'var(--text-tertiary)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar size={40} strokeWidth={1} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No requests here</p>
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            {activeTab === 'pending_review' ? 'No pending meeting requests.' : 'No meetings match this filter.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(request => {
            const cfg = STATUS_CONFIG[request.status]
            const StatusIcon = cfg.icon
            const proposedDate = new Date(request.proposedTime)
            const isActioning = actioningId === request.id

            return (
              <div
                key={request.id}
                className="glass-card p-5 transition-all hover:-translate-y-px"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {request.title}
                      </h3>
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {StatusIcon && <StatusIcon size={11} />}
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        <Calendar size={13} />
                        {proposedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' at '}
                        {proposedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        <Clock size={13} />
                        {request.durationMinutes < 60
                          ? `${request.durationMinutes} min`
                          : `${request.durationMinutes / 60} hr${request.durationMinutes > 60 ? 's' : ''}`}
                      </span>
                      {request.location && (
                        <span className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                          <MapPin size={13} />
                          {request.location}
                        </span>
                      )}
                    </div>

                    {request.agenda && (
                      <p className="text-[13px] mt-2 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                        {request.agenda}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      {/* Requester */}
                      <div className="flex items-center gap-1.5">
                        <Avatar name={request.creatorName ?? ''} src={request.creatorAvatarUrl ?? undefined} size={20} />
                        <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{request.creatorName}</span>
                      </div>

                      {/* Attendees */}
                      {request.attendees.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users size={13} style={{ color: 'var(--text-tertiary)' }} />
                          <div className="flex -space-x-1">
                            {request.attendees.slice(0, 4).map(a => (
                              <Avatar key={a.id} name={a.name} src={a.avatarUrl ?? undefined} size={20} />
                            ))}
                          </div>
                          {request.attendees.length > 4 && (
                            <span className="text-[11px] ml-1" style={{ color: 'var(--text-tertiary)' }}>
                              +{request.attendees.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {request.googleCalendarEventId && (
                        <span className="text-[11px] font-medium" style={{ color: 'var(--color-green)' }}>
                          Calendar invite sent
                        </span>
                      )}
                    </div>

                    {/* Reject note */}
                    {request.status === 'rejected' && request.reviewNote && (
                      <div
                        className="mt-3 px-3 py-2 rounded-[8px] text-[12px]"
                        style={{ background: 'rgba(255,59,48,0.06)', color: 'var(--color-red)', border: '1px solid rgba(255,59,48,0.15)' }}
                      >
                        <span className="font-semibold">Rejected: </span>{request.reviewNote}
                      </div>
                    )}
                  </div>

                  {/* Manager actions */}
                  {isManagerOrAdmin && request.status === 'pending_review' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={isActioning}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--color-green)', border: '1px solid rgba(52,199,89,0.2)' }}
                      >
                        <CheckCircle size={13} />
                        {isActioning ? 'Processing…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => setRejectId(request.id)}
                        disabled={isActioning}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--color-red)', border: '1px solid rgba(255,59,48,0.15)' }}
                      >
                        <XCircle size={13} />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Owner delete for draft */}
                  {request.status === 'draft' && request.createdBy === currentUserId && (
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="text-[12px] px-2 py-1 rounded-[6px] transition-all hover:opacity-80"
                      style={{ color: 'var(--color-red)' }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Reject dialog inline */}
                {rejectId === request.id && (
                  <div
                    className="mt-4 p-4 rounded-[10px] border"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                  >
                    <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Reason for rejection (optional)
                    </p>
                    <textarea
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      rows={2}
                      placeholder="e.g. Please propose a different time…"
                      className="w-full text-[13px] p-2 rounded-[8px] resize-none outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={() => { setRejectId(null); setRejectNote('') }}
                        className="text-[12px] px-3 py-1.5 rounded-[8px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={isActioning}
                        className="text-[12px] font-semibold px-3 py-1.5 rounded-[8px] disabled:opacity-50"
                        style={{ background: 'var(--color-red)', color: '#fff' }}
                      >
                        {isActioning ? 'Rejecting…' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <NewMeetingRequestModal
          allUsers={allUsers}
          currentUserId={currentUserId}
          onClose={() => setShowModal(false)}
          onCreated={newRequest => {
            setRequests(prev => [{ ...newRequest, attendees: [] }, ...prev])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}
