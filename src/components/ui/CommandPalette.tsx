'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, CheckSquare, FileText, Users,
  Loader2, Sparkles, ArrowRight, Clock,
} from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badges'

type TaskResult   = { id: string; title: string; status: string; priority: string }
type MeetResult   = { id: string; title: string; summary: string | null; date: string | null }
type UserResult   = { id: string; name: string; email: string; avatarUrl: string | null; role: string }
type SearchResult = { tasks: TaskResult[]; meetings: MeetResult[]; users: UserResult[] }

type Item =
  | { kind: 'task';    data: TaskResult }
  | { kind: 'meeting'; data: MeetResult }
  | { kind: 'user';    data: UserResult }
  | { kind: 'ai';      data: null }

function isQuestion(q: string) {
  const lower = q.toLowerCase().trim()
  return (
    lower.endsWith('?') ||
    /^(who|what|when|where|why|how|which|show|list|give|find|are there|is there|tell me)/.test(lower)
  )
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)

  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<SearchResult | null>(null)
  const [searching,   setSearching]   = useState(false)
  const [aiAnswer,    setAiAnswer]    = useState<string | null>(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(0)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setAiAnswer(null)
      setActiveIdx(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) {
      setResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
        setActiveIdx(0)
      } finally {
        setSearching(false)
      }
    }, 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Build flat list for keyboard nav
  const items: Item[] = []
  if (results) {
    results.tasks.forEach(d    => items.push({ kind: 'task',    data: d }))
    results.meetings.forEach(d => items.push({ kind: 'meeting', data: d }))
    results.users.forEach(d    => items.push({ kind: 'user',    data: d }))
  }
  if (query.trim().length > 3 && isQuestion(query)) {
    items.push({ kind: 'ai', data: null })
  }

  function navigate(item: Item) {
    onClose()
    if (item.kind === 'task')    router.push(`/tasks?task=${item.data.id}`)
    if (item.kind === 'meeting') router.push(`/meetings/${item.data.id}`)
    if (item.kind === 'user')    router.push(`/people/${item.data.id}`)
    if (item.kind === 'ai')      handleAsk()
  }

  const handleAsk = useCallback(async () => {
    if (!query.trim()) return
    setAiLoading(true)
    setAiAnswer(null)
    try {
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question: query }),
      })
      const data = await res.json()
      setAiAnswer(data.answer ?? 'No answer.')
    } finally {
      setAiLoading(false)
    }
  }, [query])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     { onClose(); return }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)) }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && items[activeIdx]) {
        e.preventDefault()
        navigate(items[activeIdx])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, items, activeIdx, onClose])

  if (!open) return null

  const showEmpty = !query.trim()
  const hasResults = results && (results.tasks.length + results.meetings.length + results.users.length) > 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="w-full max-w-xl flex flex-col overflow-hidden"
        style={{
          background:   'var(--bg-primary)',
          borderRadius: 'var(--radius-xl)',
          border:       '1px solid var(--border)',
          boxShadow:    'var(--shadow-xl)',
          maxHeight:    '70vh',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {searching ? (
            <Loader2 size={17} strokeWidth={1.5} className="animate-spin flex-shrink-0" style={{ color: 'var(--color-blue)' }} />
          ) : (
            <Search size={17} strokeWidth={1.5} className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, meetings, people… or ask a question"
            className="flex-1 text-[15px] outline-none bg-transparent"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Search or ask"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear">
              <X size={15} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-[4px] flex-shrink-0"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {showEmpty && (
            <div className="flex flex-col items-center gap-2 py-12">
              <Search size={28} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                Type to search, or ask a question
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                e.g. &ldquo;Who has the most tasks?&rdquo; or &ldquo;design sprint&rdquo;
              </p>
            </div>
          )}

          {/* AI Answer */}
          {(aiLoading || aiAnswer) && (
            <div className="px-4 pt-4 pb-2">
              <div
                className="rounded-[10px] p-4"
                style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.15)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-blue)' }}>
                    AI Answer
                  </span>
                </div>
                {aiLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={13} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Thinking…</span>
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {aiAnswer}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* AI Ask prompt (appears in result list) */}
          {query.trim().length > 3 && isQuestion(query) && !aiAnswer && !aiLoading && (
            <ResultSection label="AI Assistant">
              <ResultRow
                active={activeIdx === items.findIndex(i => i.kind === 'ai')}
                onClick={handleAsk}
                icon={<Sparkles size={15} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />}
                title={`Ask: "${query}"`}
                subtitle="Get an AI-generated answer from your data"
                rightEl={<ArrowRight size={13} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />}
              />
            </ResultSection>
          )}

          {hasResults && (
            <>
              {results!.tasks.length > 0 && (
                <ResultSection label="Tasks">
                  {results!.tasks.map((t, i) => {
                    const idx = items.findIndex(x => x.kind === 'task' && x.data.id === t.id)
                    return (
                      <ResultRow
                        key={t.id}
                        active={activeIdx === idx}
                        onClick={() => { onClose(); router.push(`/tasks?task=${t.id}`) }}
                        icon={<CheckSquare size={15} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />}
                        title={t.title}
                        rightEl={
                          <div className="flex items-center gap-1.5">
                            <PriorityBadge priority={t.priority} small />
                            <StatusBadge status={t.status} />
                          </div>
                        }
                      />
                    )
                  })}
                </ResultSection>
              )}

              {results!.meetings.length > 0 && (
                <ResultSection label="Meetings">
                  {results!.meetings.map(m => {
                    const idx = items.findIndex(x => x.kind === 'meeting' && x.data.id === m.id)
                    return (
                      <ResultRow
                        key={m.id}
                        active={activeIdx === idx}
                        onClick={() => { onClose(); router.push(`/meetings/${m.id}`) }}
                        icon={<FileText size={15} strokeWidth={1.5} style={{ color: 'var(--color-purple)' }} />}
                        title={m.title}
                        subtitle={m.summary ?? undefined}
                        rightEl={m.date ? (
                          <div className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                            <Clock size={11} strokeWidth={1.5} />
                            <span className="text-[11px]">{m.date}</span>
                          </div>
                        ) : undefined}
                      />
                    )
                  })}
                </ResultSection>
              )}

              {results!.users.length > 0 && (
                <ResultSection label="People">
                  {results!.users.map(u => {
                    const idx = items.findIndex(x => x.kind === 'user' && x.data.id === u.id)
                    return (
                      <ResultRow
                        key={u.id}
                        active={activeIdx === idx}
                        onClick={() => { onClose(); router.push(`/people/${u.id}`) }}
                        icon={<Avatar name={u.name} src={u.avatarUrl ?? undefined} size={22} />}
                        title={u.name}
                        subtitle={u.email}
                        rightEl={
                          <span className="text-[11px] capitalize px-1.5 py-0.5 rounded-[4px]"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                            {u.role}
                          </span>
                        }
                      />
                    )
                  })}
                </ResultSection>
              )}
            </>
          )}

          {!showEmpty && !searching && results && !hasResults && !aiAnswer && (
            <div className="flex flex-col items-center gap-2 py-10">
              <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {[
            ['↑↓', 'Navigate'],
            ['↵', 'Select'],
            ['Esc', 'Close'],
          ].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              <kbd className="px-1 py-0.5 rounded-[3px] font-mono text-[10px]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-3 pb-1">
      <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function ResultRow({
  active, onClick, icon, title, subtitle, rightEl,
}: {
  active:    boolean
  onClick:   () => void
  icon:      React.ReactNode
  title:     string
  subtitle?: string
  rightEl?:  React.ReactNode
}) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <button
      ref={ref}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{
        background: active ? 'rgba(0,122,255,0.08)' : 'transparent',
        borderLeft: active ? '3px solid var(--color-blue)' : '3px solid transparent',
      }}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        {subtitle && (
          <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {rightEl && <div className="flex-shrink-0">{rightEl}</div>}
    </button>
  )
}
