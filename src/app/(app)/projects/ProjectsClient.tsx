'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Folder, FolderOpen, Plus, Search, LayoutGrid, List,
  Calendar, Users, CheckSquare, ChevronRight, Sparkles,
  Clock, CheckCircle2, Pause, Archive, FolderKanban,
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  planning:  'var(--color-blue)',
  active:    'var(--color-green)',
  on_hold:   'var(--color-orange)',
  completed: 'var(--color-purple)',
  archived:  'var(--text-tertiary)',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  planning:  Clock,
  active:    FolderOpen,
  on_hold:   Pause,
  completed: CheckCircle2,
  archived:  Archive,
}

const STATUS_LABELS: Record<string, string> = {
  planning:  'Planning',
  active:    'Active',
  on_hold:   'On Hold',
  completed: 'Completed',
  archived:  'Archived',
}

const PROJECT_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30',
  '#AF52DE', '#5856D6', '#FF2D55', '#30B0C7',
]

type Project = {
  id: string
  name: string
  description: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'
  ownerId: string | null
  color: string
  icon: string
  startDate: string | null
  endDate: string | null
  createdAt: Date
  ownerName: string | null
  ownerImage: string | null
  memberCount: number
  taskTotal: number
  taskDone: number
}

function ProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div
        className="glass-topbar px-6 py-4 flex items-center gap-4"
        style={{ minHeight: 64 }}
      >
        <FolderKanban size={20} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Projects</h1>
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="pl-8 pr-3 py-1.5 text-sm rounded-[8px] outline-none"
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              width: 200,
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-[8px] outline-none"
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex rounded-[8px] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {(['grid', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-2.5 py-1.5 flex items-center"
              style={{
                background: view === v ? 'var(--color-blue)' : 'var(--bg-glass)',
                color: view === v ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {v === 'grid' ? <LayoutGrid size={15} /> : <List size={15} />}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium text-white"
          style={{ background: 'var(--color-blue)' }}
        >
          <Plus size={15} />
          New Project
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-tertiary)' }}>
            <FolderOpen size={48} strokeWidth={1} />
            <p className="text-sm">No projects found</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm px-4 py-2 rounded-[8px] font-medium text-white"
              style={{ background: 'var(--color-blue)' }}
            >
              Create your first project
            </button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => router.push(`/projects/${p.id}`)} />
            ))}
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            {filtered.map((p, i) => (
              <ProjectRow
                key={p.id}
                project={p}
                last={i === filtered.length - 1}
                onClick={() => router.push(`/projects/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={p => {
            setProjects(prev => [p, ...prev])
            setShowCreate(false)
            router.push(`/projects/${p.id}`)
          }}
        />
      )}
    </div>
  )
}

function ProjectCard({ project: p, onClick }: { project: Project; onClick: () => void }) {
  const StatusIcon = STATUS_ICONS[p.status]
  const pct = p.taskTotal > 0 ? Math.round((p.taskDone / p.taskTotal) * 100) : 0
  const days = daysRemaining(p.endDate)

  return (
    <div
      onClick={onClick}
      className="glass-card p-4 cursor-pointer hover:shadow-lg transition-all group"
      style={{ borderTop: `3px solid ${p.color}` }}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-[8px]"
            style={{ width: 36, height: 36, background: `${p.color}18` }}
          >
            <Folder size={18} style={{ color: p.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight group-hover:text-blue-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
              {p.name}
            </h3>
            {p.ownerName && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{p.ownerName}</p>
            )}
          </div>
        </div>
        <span
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status] }}
        >
          <StatusIcon size={10} />
          {STATUS_LABELS[p.status]}
        </span>
      </div>

      {p.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {p.description}
        </p>
      )}

      {p.taskTotal > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Progress</span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
          </div>
          <ProgressBar done={p.taskDone} total={p.taskTotal} color={p.color} />
        </div>
      )}

      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {p.memberCount}
        </span>
        <span className="flex items-center gap-1">
          <CheckSquare size={12} />
          {p.taskDone}/{p.taskTotal}
        </span>
        {days !== null && (
          <span
            className="flex items-center gap-1 ml-auto"
            style={{ color: days < 0 ? 'var(--color-red)' : days <= 7 ? 'var(--color-orange)' : 'var(--text-tertiary)' }}
          >
            <Calendar size={12} />
            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
          </span>
        )}
      </div>
    </div>
  )
}

function ProjectRow({ project: p, last, onClick }: { project: Project; last: boolean; onClick: () => void }) {
  const StatusIcon = STATUS_ICONS[p.status]
  const pct = p.taskTotal > 0 ? Math.round((p.taskDone / p.taskTotal) * 100) : 0

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div
        className="flex items-center justify-center rounded-[8px] flex-shrink-0"
        style={{ width: 32, height: 32, background: `${p.color}18` }}
      >
        <Folder size={16} style={{ color: p.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-blue-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
          {p.name}
        </p>
        {p.description && (
          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>
        )}
      </div>

      <span
        className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status] }}
      >
        <StatusIcon size={10} />
        {STATUS_LABELS[p.status]}
      </span>

      <div className="flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
        <Users size={12} />
        {p.memberCount}
      </div>

      <div className="w-24 flex-shrink-0">
        <div className="flex justify-between mb-0.5">
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{pct}%</span>
        </div>
        <ProgressBar done={p.taskDone} total={p.taskTotal} color={p.color} />
      </div>

      <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} className="flex-shrink-0" />
    </div>
  )
}

function CreateProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (p: Project) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#007AFF')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [planWithAI, setPlanWithAI] = useState(false)
  const [aiPlan, setAiPlan] = useState<{ summary: string; suggestedTasks: { title: string; priority: string }[]; risks: string[] } | null>(null)
  const [saving, startSave] = useTransition()
  const [planning, startPlan] = useTransition()

  function handlePlanWithAI() {
    if (!name.trim()) return
    startPlan(async () => {
      const res = await fetch(`/api/projects/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, startDate, endDate }),
      })
      if (res.ok) {
        const plan = await res.json()
        setAiPlan(plan)
        setPlanWithAI(true)
      }
    })
  }

  function handleCreate() {
    if (!name.trim()) return
    startSave(async () => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, color,
          startDate: startDate || null,
          endDate:   endDate   || null,
          aiPlan:    aiPlan    ?? null,
        }),
      })
      if (res.ok) {
        const project = await res.json()
        const taskTotal = aiPlan?.suggestedTasks?.length ?? 0
        onCreate({ ...project, memberCount: 1, taskTotal, taskDone: 0, ownerName: null, ownerImage: null })
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card w-full max-w-md p-6 rounded-[16px]"
        style={{ background: 'var(--bg-primary)' }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          New Project
        </h2>

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Project name"
            className="px-3 py-2 text-sm rounded-[8px] outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="px-3 py-2 text-sm rounded-[8px] outline-none resize-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>End date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--text-secondary)' }}>Color</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {aiPlan && (
            <div
              className="rounded-[8px] p-3 text-xs"
              style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)' }}
            >
              <p className="font-medium mb-1" style={{ color: 'var(--color-blue)' }}>
                AI Plan Ready — {aiPlan.suggestedTasks.length} tasks will be created
              </p>
              <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>{aiPlan.summary}</p>
              {aiPlan.suggestedTasks.slice(0, 4).map((t, i) => (
                <p key={i} className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>• {t.title}</p>
              ))}
              {aiPlan.suggestedTasks.length > 4 && (
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>+{aiPlan.suggestedTasks.length - 4} more…</p>
              )}
              {aiPlan.risks?.length > 0 && (
                <p className="mt-2 text-[11px]" style={{ color: 'var(--color-orange)' }}>
                  Risks: {aiPlan.risks.join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={handlePlanWithAI}
            disabled={!name.trim() || planning}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-[8px] font-medium disabled:opacity-50"
            style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}
          >
            <Sparkles size={14} />
            {planning ? 'Planning…' : 'Plan with AI'}
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-[8px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm rounded-[8px] font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--color-blue)' }}
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
