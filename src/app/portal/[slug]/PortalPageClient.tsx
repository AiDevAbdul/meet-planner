'use client'

import { useState, useEffect, useTransition } from 'react'
import { CheckCircle2, Clock, FileText, AlertCircle, ChevronRight, Lock, MessageSquare, RefreshCw } from 'lucide-react'

type Project = {
  id: string
  name: string
  status: string
  description: string | null
  color: string
  startDate: string | null
  endDate: string | null
}

type Milestone = {
  id: string
  title: string
  dueDate: string | null
  status: string
}

type Doc = {
  id: string
  title: string
  updatedAt: string
}

type Update = {
  id: string
  content: string
  createdAt: string
}

type DocApproval = {
  documentId: string
  status: 'pending' | 'approved' | 'changes_requested'
  note: string | null
}

type PortalData = {
  portal: { id: string; name: string; slug: string; logoUrl: string | null; primaryColor: string }
  project: Project
  stats: { total: number; done: number }
  milestones: Milestone[]
  documents: Doc[]
  updates: Update[]
  docApprovals: DocApproval[]
}

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning', active: 'Active', on_hold: 'On Hold',
  completed: 'Completed', archived: 'Archived',
}

const MILESTONE_STATUS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: '#8E8E93' },
  in_progress: { label: 'In Progress', color: '#FF9500' },
  completed:   { label: 'Completed',   color: '#34C759' },
}

export function PortalPageClient({ slug, isProtected }: { slug: string; isProtected: boolean }) {
  const [password, setPassword]   = useState('')
  const [authed, setAuthed]       = useState(!isProtected)
  const [authError, setAuthError] = useState<string | null>(null)
  const [data, setData]           = useState<PortalData | null>(null)
  const [loading, setLoading]     = useState(!isProtected)
  const [error, setError]         = useState<string | null>(null)

  const [approving, startApprove] = useTransition()
  const [approvalDocId, setApprovalDocId] = useState<string | null>(null)
  const [approvalNote, setApprovalNote]   = useState('')
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'changes_requested'>('approved')
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null)

  async function fetchData(pw?: string) {
    setLoading(true)
    setError(null)
    const headers: HeadersInit = {}
    if (pw) headers['x-portal-password'] = pw

    const res = await fetch(`/api/portal/${slug}`, { headers })

    if (res.status === 401) { setAuthed(false); setLoading(false); return }
    if (res.status === 403) { setAuthError('Invalid password'); setLoading(false); return }
    if (!res.ok) { setError('Failed to load portal'); setLoading(false); return }

    const json = await res.json()
    setData(json)
    setAuthed(true)
    setLoading(false)
  }

  useEffect(() => {
    if (authed) fetchData(isProtected ? password : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    fetchData(password)
  }

  function submitApproval(docId: string, status: 'approved' | 'changes_requested') {
    setApprovalDocId(docId)
    setApprovalStatus(status)
    setApprovalNote('')
  }

  function confirmApproval() {
    if (!approvalDocId) return
    startApprove(async () => {
      const res = await fetch(`/api/portal/${slug}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(isProtected ? { 'x-portal-password': password } : {}) },
        body: JSON.stringify({ documentId: approvalDocId, status: approvalStatus, note: approvalNote || null, password: password || null }),
      })
      if (res.ok) {
        setApprovalSuccess(approvalStatus === 'approved' ? 'Document approved.' : 'Changes requested.')
        setApprovalDocId(null)
        fetchData(password || undefined)
        setTimeout(() => setApprovalSuccess(null), 3000)
      }
    })
  }

  const primaryColor = data?.portal.primaryColor ?? '#007AFF'
  const pct = data ? (data.stats.total > 0 ? Math.round((data.stats.done / data.stats.total) * 100) : 0) : 0

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F2F7' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={20} style={{ color: primaryColor }} />
            <h1 className="text-lg font-semibold text-gray-900">Protected Portal</h1>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
            {authError && <p className="text-xs text-red-500">{authError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ background: primaryColor }}
            >
              Access Portal
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F2F7' }}>
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F2F7' }}>
        <p className="text-gray-500 text-sm">{error ?? 'Something went wrong'}</p>
      </div>
    )
  }

  const { portal, project, milestones, documents, updates, docApprovals } = data
  const docApprovalMap = Object.fromEntries(docApprovals.map(a => [a.documentId, a]))

  return (
    <div className="min-h-screen" style={{ background: '#F2F2F7' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200/60">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          {portal.logoUrl && (
            <img src={portal.logoUrl} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
          )}
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: primaryColor }}
          >
            {portal.name[0]}
          </div>
          <span className="font-semibold text-gray-900">{portal.name}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Project Overview Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
              {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
            </div>
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ background: `${primaryColor}15`, color: primaryColor }}
            >
              {STATUS_LABELS[project.status] ?? project.status}
            </span>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Overall Progress</span>
              <span className="font-medium" style={{ color: primaryColor }}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: primaryColor }}
              />
            </div>
            <p className="text-xs text-gray-400">{data.stats.done} of {data.stats.total} tasks complete</p>
          </div>

          {(project.startDate || project.endDate) && (
            <div className="mt-4 flex gap-4 text-xs text-gray-500">
              {project.startDate && <span>Started: {new Date(project.startDate).toLocaleDateString()}</span>}
              {project.endDate && <span>Due: {new Date(project.endDate).toLocaleDateString()}</span>}
            </div>
          )}
        </div>

        {/* Status Updates */}
        {updates.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={16} style={{ color: primaryColor }} />
              Status Updates
            </h3>
            <div className="space-y-4">
              {updates.map(u => (
                <div key={u.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <p className="text-sm text-gray-700 leading-relaxed">{u.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} style={{ color: primaryColor }} />
              Milestones
            </h3>
            <div className="space-y-3">
              {milestones.map(m => {
                const ms = MILESTONE_STATUS[m.status] ?? { label: m.status, color: '#8E8E93' }
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: ms.color }} />
                    <span className="text-sm text-gray-800 flex-1">{m.title}</span>
                    {m.dueDate && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${ms.color}18`, color: ms.color }}>
                      {ms.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={16} style={{ color: primaryColor }} />
              Documents for Review
            </h3>
            <div className="space-y-2">
              {documents.map(doc => {
                const approval = docApprovalMap[doc.id]
                return (
                  <div key={doc.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50">
                    <FileText size={15} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-400">
                        Updated {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    {approval ? (
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                        style={
                          approval.status === 'approved'
                            ? { background: '#34C75918', color: '#34C759' }
                            : { background: '#FF950018', color: '#FF9500' }
                        }
                      >
                        {approval.status === 'approved' ? 'Approved' : 'Changes Requested'}
                      </span>
                    ) : (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => submitApproval(doc.id, 'approved')}
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: '#34C75918', color: '#34C759' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => submitApproval(doc.id, 'changes_requested')}
                          className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background: '#FF350018', color: '#FF3B30' }}
                        >
                          Request Changes
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Approval success */}
        {approvalSuccess && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
            {approvalSuccess}
          </div>
        )}

        {/* Approval note modal */}
        {approvalDocId && (
          <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h4 className="font-semibold text-gray-900 mb-3">
                {approvalStatus === 'approved' ? 'Approve Document' : 'Request Changes'}
              </h4>
              <textarea
                placeholder={approvalStatus === 'approved' ? 'Add a note (optional)' : 'Describe the changes needed…'}
                value={approvalNote}
                onChange={e => setApprovalNote(e.target.value)}
                rows={3}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 resize-none outline-none focus:ring-2 mb-4"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setApprovalDocId(null)}
                  className="flex-1 py-2.5 text-sm rounded-xl border border-gray-200 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApproval}
                  disabled={approving}
                  className="flex-1 py-2.5 text-sm rounded-xl text-white font-medium"
                  style={{
                    background: approvalStatus === 'approved' ? '#34C759' : primaryColor,
                    opacity: approving ? 0.7 : 1,
                  }}
                >
                  {approving ? 'Submitting…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
