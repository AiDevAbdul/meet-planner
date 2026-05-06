'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import {
  FileText, Plus, Clock, Check, ChevronRight,
  RotateCcw, Send, Trash2, History, X,
} from 'lucide-react'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

type DocStatus = 'draft' | 'review' | 'approved'

type Document = {
  id: string
  projectId: string | null
  title: string
  contentJson: Record<string, unknown> | null
  status: DocStatus
  createdBy: string | null
  updatedBy: string | null
  updatedAt: string
  createdAt: string
  creatorName: string | null
}

type Version = {
  id: string
  documentId: string
  versionNumber: number
  contentJson: Record<string, unknown> | null
  savedBy: string | null
  savedAt: string
  saverName: string | null
}

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: 'var(--text-secondary)',  bg: 'var(--bg-secondary)' },
  review:   { label: 'Review',   color: 'var(--color-orange)',    bg: 'rgba(255,149,0,0.12)' },
  approved: { label: 'Approved', color: 'var(--color-green)',     bg: 'rgba(52,199,89,0.12)' },
}

export function DocumentsClient({
  projectId,
  initialDocs,
  currentUserRole,
}: {
  projectId: string
  initialDocs: Document[]
  currentUserRole: string
}) {
  const [docs, setDocs]               = useState<Document[]>(initialDocs)
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocs[0]?.id ?? null)
  const [activeDoc, setActiveDoc]     = useState<Document | null>(null)
  const [title, setTitle]             = useState('')
  const [content, setContent]         = useState<Record<string, unknown> | null>(null)
  const [versions, setVersions]       = useState<Version[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [saving, startSave]           = useTransition()
  const [autoSaveLabel, setAutoSaveLabel] = useState<'saved' | 'saving' | null>(null)
  const autoSaveTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isManagerOrAdmin              = ['admin', 'manager', 'owner'].includes(currentUserRole)

  useEffect(() => {
    if (!activeDocId) { setActiveDoc(null); return }
    fetch(`/api/documents/${activeDocId}`)
      .then(r => r.json())
      .then(({ data }) => {
        setActiveDoc(data)
        setTitle(data.title)
        setContent(data.contentJson)
      })
  }, [activeDocId])

  const loadVersions = useCallback(async (docId: string) => {
    const res = await fetch(`/api/documents/${docId}/versions`)
    const { data } = await res.json()
    setVersions(data ?? [])
  }, [])

  useEffect(() => {
    if (showVersions && activeDocId) loadVersions(activeDocId)
  }, [showVersions, activeDocId, loadVersions])

  function scheduleAutoSave(docId: string, newTitle: string, newContent: Record<string, unknown> | null) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveLabel('saving')
      await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, contentJson: newContent }),
      })
      await fetch(`/api/documents/${docId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentJson: newContent }),
      })
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, title: newTitle, updatedAt: new Date().toISOString() } : d))
      setAutoSaveLabel('saved')
      setTimeout(() => setAutoSaveLabel(null), 2000)
    }, 3000)
  }

  function handleTitleChange(val: string) {
    setTitle(val)
    if (activeDocId) scheduleAutoSave(activeDocId, val, content)
  }

  function handleContentChange(json: Record<string, unknown>) {
    setContent(json)
    if (activeDocId) scheduleAutoSave(activeDocId, title, json)
  }

  async function createDocument() {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, title: 'Untitled Document' }),
    })
    const { data } = await res.json()
    if (data) {
      setDocs(prev => [data, ...prev])
      setActiveDocId(data.id)
    }
  }

  async function deleteDocument(docId: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== docId))
    if (activeDocId === docId) {
      const remaining = docs.filter(d => d.id !== docId)
      setActiveDocId(remaining[0]?.id ?? null)
    }
  }

  async function updateStatus(status: DocStatus) {
    if (!activeDocId) return
    const res = await fetch(`/api/documents/${activeDocId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const { data } = await res.json()
    if (data) {
      setActiveDoc(prev => prev ? { ...prev, status: data.status } : prev)
      setDocs(prev => prev.map(d => d.id === activeDocId ? { ...d, status: data.status } : d))
    }
  }

  async function approveDocument() {
    if (!activeDocId) return
    const res = await fetch(`/api/documents/${activeDocId}/approve`, { method: 'POST' })
    const { data } = await res.json()
    if (data) {
      setActiveDoc(prev => prev ? { ...prev, status: 'approved' } : prev)
      setDocs(prev => prev.map(d => d.id === activeDocId ? { ...d, status: 'approved' } : d))
    }
  }

  async function restoreVersion(version: Version) {
    if (!activeDocId || !confirm(`Restore to version ${version.versionNumber}?`)) return
    await fetch(`/api/documents/${activeDocId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentJson: version.contentJson }),
    })
    setContent(version.contentJson)
    setActiveDoc(prev => prev ? { ...prev, contentJson: version.contentJson } : prev)
    setShowVersions(false)
  }

  const currentStatus = activeDoc ? STATUS_CONFIG[activeDoc.status] : null

  return (
    <div className="flex h-full gap-0" style={{ background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <div
        className="w-64 flex-shrink-0 flex flex-col"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-glass)', backdropFilter: 'blur(20px)' }}
      >
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Documents
          </span>
          <button
            onClick={createDocument}
            className="flex items-center justify-center w-6 h-6 rounded-[6px] transition-colors"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
            aria-label="New document"
            title="New document"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {docs.length === 0 && (
            <div className="px-4 py-8 text-center">
              <FileText size={28} strokeWidth={1} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No documents yet</p>
            </div>
          )}
          {docs.map(doc => {
            const st = STATUS_CONFIG[doc.status]
            const isActive = doc.id === activeDocId
            return (
              <button
                key={doc.id}
                onClick={() => setActiveDocId(doc.id)}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2 group transition-colors"
                style={{
                  background: isActive ? 'rgba(0,122,255,0.08)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--color-blue)' : '2px solid transparent',
                }}
              >
                <FileText size={14} className="mt-0.5 flex-shrink-0" style={{ color: isActive ? 'var(--color-blue)' : 'var(--text-tertiary)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: isActive ? 'var(--color-blue)' : 'var(--text-primary)' }}>
                    {doc.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Editor Area */}
      {activeDoc ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Doc header */}
          <div className="px-6 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
            {currentStatus && (
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: currentStatus.bg, color: currentStatus.color }}
              >
                {currentStatus.label}
              </span>
            )}

            <div className="flex items-center gap-1 ml-auto">
              {autoSaveLabel && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                  {autoSaveLabel === 'saving' ? <Clock size={11} /> : <Check size={11} style={{ color: 'var(--color-green)' }} />}
                  {autoSaveLabel === 'saving' ? 'Saving…' : 'Saved'}
                </span>
              )}

              <button
                onClick={() => setShowVersions(v => !v)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-[7px] transition-colors"
                style={{
                  background: showVersions ? 'rgba(0,122,255,0.1)' : 'var(--bg-secondary)',
                  color:      showVersions ? 'var(--color-blue)' : 'var(--text-secondary)',
                  border:     '1px solid var(--border)',
                }}
              >
                <History size={12} />
                History
              </button>

              {activeDoc.status === 'draft' && (
                <button
                  onClick={() => updateStatus('review')}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-[7px] transition-colors font-medium"
                  style={{ background: 'rgba(255,149,0,0.12)', color: 'var(--color-orange)', border: '1px solid rgba(255,149,0,0.2)' }}
                >
                  <Send size={12} />
                  Submit for Review
                </button>
              )}

              {isManagerOrAdmin && activeDoc.status === 'review' && (
                <>
                  <button
                    onClick={approveDocument}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-[7px] font-medium transition-colors"
                    style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--color-green)', border: '1px solid rgba(52,199,89,0.2)' }}
                  >
                    <Check size={12} />
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus('draft')}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-[7px] font-medium transition-colors"
                    style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--color-red)', border: '1px solid rgba(255,59,48,0.2)' }}
                  >
                    <RotateCcw size={12} />
                    Request Changes
                  </button>
                </>
              )}

              <button
                onClick={() => deleteDocument(activeDoc.id)}
                className="flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors"
                style={{ color: 'var(--color-red)' }}
                aria-label="Delete document"
                title="Delete document"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Main editor */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Document title"
                className="text-2xl font-bold mb-4 outline-none bg-transparent w-full"
                style={{ color: 'var(--text-primary)', border: 'none', fontFamily: 'inherit' }}
                aria-label="Document title"
              />
              <div className="flex-1" style={{ minHeight: 400 }}>
                <RichTextEditor
                  key={activeDoc.id}
                  initialContent={activeDoc.contentJson}
                  placeholder="Start writing your document…"
                  onChange={handleContentChange}
                  editable={activeDoc.status !== 'approved'}
                />
              </div>
            </div>

            {/* Version history panel */}
            {showVersions && (
              <div
                className="w-72 flex-shrink-0 flex flex-col"
                style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-glass)' }}
              >
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Version History</span>
                  <button
                    onClick={() => setShowVersions(false)}
                    className="p-1 rounded-[5px] hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="Close history"
                  >
                    <X size={14} style={{ color: 'var(--text-secondary)' }} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {versions.length === 0 && (
                    <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                      No versions saved yet
                    </p>
                  )}
                  {versions.map(v => (
                    <div
                      key={v.id}
                      className="px-4 py-3 flex flex-col gap-1"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          v{v.versionNumber}
                        </span>
                        <button
                          onClick={() => restoreVersion(v)}
                          className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-[5px]"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--color-blue)', border: '1px solid var(--border)' }}
                        >
                          <RotateCcw size={10} />
                          Restore
                        </button>
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {v.saverName ?? 'Unknown'} · {new Date(v.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center flex-col gap-3" style={{ color: 'var(--text-tertiary)' }}>
          <FileText size={48} strokeWidth={1} />
          <p className="text-sm">Select a document or create a new one</p>
          <button
            onClick={createDocument}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-[8px] font-medium text-white mt-2"
            style={{ background: 'var(--color-blue)' }}
          >
            <Plus size={14} />
            New Document
          </button>
        </div>
      )}
    </div>
  )
}
