'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Folder, ArrowLeft, Settings, Users, CheckSquare,
  FileText, Calendar, ChevronDown, MoreHorizontal,
  Plus, AlertCircle, Clock, CheckCircle2,
  Edit2, Trash2, UserPlus, Sparkles, BookOpen, DollarSign, Zap,
} from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'
import { AutomationsTab } from './AutomationsTab'

const STATUS_OPTIONS = [
  { value: 'planning',  label: 'Planning',  color: 'var(--color-blue)' },
  { value: 'active',    label: 'Active',    color: 'var(--color-green)' },
  { value: 'on_hold',   label: 'On Hold',   color: 'var(--color-orange)' },
  { value: 'completed', label: 'Completed', color: 'var(--color-purple)' },
  { value: 'archived',  label: 'Archived',  color: 'var(--text-tertiary)' },
]

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--color-red)',
  high:     'var(--color-orange)',
  normal:   'var(--color-blue)',
  low:      'var(--text-tertiary)',
}

const TASK_STATUS_LABELS: Record<string, string> = {
  triage: 'Triage', todo: 'To Do', in_progress: 'In Progress',
  review: 'Review', done: 'Done',
}

type Member = {
  userId: string
  role: string
  joinedAt: Date
  userName: string | null
  userEmail: string | null
  userImage: string | null
}

type Task = {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  assigneeId: string | null
  assigneeName: string | null
  assigneeImage: string | null
  createdAt: Date
}

type Meeting = {
  id: string
  title: string
  date: string | null
  source: string
}

type Project = {
  id: string
  name: string
  description: string | null
  status: string
  ownerId: string | null
  color: string
  icon: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  ownerName: string | null
  ownerImage: string | null
}

type Tab = 'overview' | 'tasks' | 'meetings' | 'members' | 'documents' | 'automations' | 'settings'

export function ProjectDetailClient({
  project: initialProject,
  members: initialMembers,
  tasks,
  meetings,
  taskStats,
  currentUserId,
}: {
  project: Project
  members: Member[]
  tasks: Task[]
  meetings: Meeting[]
  taskStats: { total: number; done: number; overdue: number }
  currentUserId: string
}) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [members, setMembers] = useState(initialMembers)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editingStatus, setEditingStatus] = useState(false)
  const [saving, startSave] = useTransition()

  const pct = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0
  const currentStatus = STATUS_OPTIONS.find(s => s.value === project.status) ?? STATUS_OPTIONS[0]

  function updateStatus(status: string) {
    setEditingStatus(false)
    const prev = project.status
    setProject(p => ({ ...p, status }))
    startSave(async () => {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) setProject(p => ({ ...p, status: prev }))
    })
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number; href?: string }[] = [
    { id: 'overview',   label: 'Overview',   icon: Folder },
    { id: 'tasks',      label: 'Tasks',      icon: CheckSquare, count: taskStats.total },
    { id: 'meetings',   label: 'Meetings',   icon: FileText,    count: meetings.length },
    { id: 'members',    label: 'Members',    icon: Users,       count: members.length },
    { id: 'documents',   label: 'Documents',    icon: BookOpen,  href: `/projects/${project.id}/documents` },
    { id: 'automations', label: 'Automations',  icon: Zap },
    { id: 'settings',    label: 'Settings',     icon: Settings },
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="glass-topbar px-6 py-4" style={{ minHeight: 64 }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Back to projects"
          >
            <ArrowLeft size={16} />
          </button>

          <div
            className="flex items-center justify-center rounded-[8px]"
            style={{ width: 32, height: 32, background: `${project.color}18` }}
          >
            <Folder size={16} style={{ color: project.color }} />
          </div>

          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {project.name}
          </h1>

          {/* Status badge */}
          <div className="relative">
            <button
              onClick={() => setEditingStatus(!editingStatus)}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: `${currentStatus.color}18`,
                color: currentStatus.color,
                border: `1px solid ${currentStatus.color}30`,
              }}
            >
              {currentStatus.label}
              <ChevronDown size={11} />
            </button>
            {editingStatus && (
              <div
                className="absolute top-full left-0 mt-1 rounded-[10px] shadow-lg py-1 z-20 w-36"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              >
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus(opt.value)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: opt.color }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          <Link
            href="/projects/portfolio"
            className="text-sm px-3 py-1.5 rounded-[8px]"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}
          >
            Portfolio
          </Link>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            const tabStyle = {
              color:      active ? 'var(--color-blue)'    : 'var(--text-secondary)',
              background: active ? 'rgba(0,122,255,0.10)' : 'transparent',
            }
            const inner = (
              <>
                <Icon size={14} strokeWidth={1.5} />
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: active ? 'rgba(0,122,255,0.15)' : 'var(--border)', color: active ? 'var(--color-blue)' : 'var(--text-tertiary)' }}
                  >
                    {tab.count}
                  </span>
                )}
              </>
            )
            if (tab.href) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
                  style={tabStyle}
                >
                  {inner}
                </Link>
              )
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
                style={tabStyle}
              >
                {inner}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <OverviewTab project={project} taskStats={taskStats} pct={pct} members={members} />
        )}
        {activeTab === 'tasks' && (
          <TasksTab tasks={tasks} projectId={project.id} />
        )}
        {activeTab === 'meetings' && (
          <MeetingsTab meetings={meetings} />
        )}
        {activeTab === 'members' && (
          <MembersTab
            members={members}
            projectId={project.id}
            currentUserId={currentUserId}
            onMembersChange={setMembers}
          />
        )}
        {activeTab === 'automations' && (
          <AutomationsTab projectId={project.id} />
        )}
        {activeTab === 'settings' && (
          <SettingsTab project={project} onUpdate={setProject} />
        )}
      </div>
    </div>
  )
}

type BudgetData = {
  budget:        number | null
  spentCents:    number
  timeMinutes:   number
  expensesCount: number
}

function BudgetSection({ projectId, projectBudget }: { projectId: string; projectBudget: number | null }) {
  const [data, setData] = useState<BudgetData | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/budget`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
  }, [projectId])

  if (!data) return null

  const budget    = data.budget ?? projectBudget
  const spentDol  = data.spentCents / 100
  const pct       = budget ? Math.min(Math.round((spentDol / budget) * 100), 100) : 0
  const barColor  = pct > 85 ? 'var(--color-red)' : pct > 60 ? 'var(--color-orange)' : 'var(--color-green)'

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={15} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Budget</h2>
      </div>

      {!budget ? (
        <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No budget set</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              ${spentDol.toLocaleString()} spent
            </span>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              ${budget.toLocaleString()} budget
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--border)' }}>
            <div
              style={{
                height:     '100%',
                width:      `${pct}%`,
                background: barColor,
                borderRadius: 9999,
                transition:   'width 0.4s ease',
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              {pct}% used · {data.expensesCount} expense{data.expensesCount !== 1 ? 's' : ''}
            </span>
            {data.timeMinutes > 0 && (
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {Math.round(data.timeMinutes / 60)}h logged
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function OverviewTab({ project, taskStats, pct, members }: { project: Project; taskStats: { total: number; done: number; overdue: number }; pct: number; members: Member[] }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Stats */}
      <div className="col-span-2 flex flex-col gap-4">
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Project Progress</h2>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: 'var(--border)' }}
            >
              <div
                style={{ height: '100%', width: `${pct}%`, background: project.color, borderRadius: 9999, transition: 'width 0.4s ease' }}
              />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Total Tasks', value: taskStats.total, color: 'var(--text-primary)' },
              { label: 'Completed', value: taskStats.done, color: 'var(--color-green)' },
              { label: 'Overdue', value: taskStats.overdue, color: 'var(--color-red)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {project.description && (
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Description</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
          </div>
        )}

        <BudgetSection projectId={project.id} projectBudget={project.budget} />
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-4">
        <div className="glass-card p-4">
          <h2 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-tertiary)' }}>DETAILS</h2>
          <div className="flex flex-col gap-2.5">
            {project.startDate && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Start</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {new Date(project.startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {project.endDate && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>End</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {new Date(project.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {project.budget && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Budget</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  ${project.budget.toLocaleString()}
                </span>
              </div>
            )}
            {project.ownerName && (
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Owner</span>
                <div className="flex items-center gap-1">
                  <Avatar name={project.ownerName} src={project.ownerImage ?? undefined} size={18} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{project.ownerName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-4">
          <h2 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-tertiary)' }}>TEAM</h2>
          <div className="flex flex-col gap-2">
            {members.slice(0, 5).map(m => (
              <div key={m.userId} className="flex items-center gap-2">
                <Avatar name={m.userName ?? ''} src={m.userImage ?? undefined} size={24} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.userName}</p>
                </div>
                <span
                  className="text-[10px] font-medium capitalize"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {m.role}
                </span>
              </div>
            ))}
            {members.length > 5 && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>+{members.length - 5} more</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TasksTab({ tasks, projectId }: { tasks: Task[]; projectId: string }) {
  const grouped = ['triage', 'todo', 'in_progress', 'review', 'done'].reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          {tasks.length}
        </span>
        <div className="flex-1" />
        <Link
          href={`/tasks?projectId=${projectId}`}
          className="text-sm px-3 py-1.5 rounded-[8px] font-medium text-white"
          style={{ background: 'var(--color-blue)' }}
        >
          Open Board
        </Link>
      </div>

      {['todo', 'in_progress', 'review', 'triage', 'done'].map(status => {
        const group = grouped[status] ?? []
        if (group.length === 0) return null
        return (
          <div key={status} className="glass-card overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {TASK_STATUS_LABELS[status]}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-tertiary)' }}>
                {group.length}
              </span>
            </div>
            {group.map((task, i) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: i < group.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: PRIORITY_COLORS[task.priority] }}
                />
                <p className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                {task.assigneeName && (
                  <Avatar name={task.assigneeName} src={task.assigneeImage ?? undefined} size={20} />
                )}
                {task.dueDate && (
                  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {tasks.length === 0 && (
        <div className="glass-card py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          <CheckSquare size={32} strokeWidth={1} className="mx-auto mb-2" />
          <p className="text-sm">No tasks yet</p>
        </div>
      )}
    </div>
  )
}

function MeetingsTab({ meetings }: { meetings: Meeting[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Meetings</h2>
      {meetings.length === 0 ? (
        <div className="glass-card py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
          <FileText size={32} strokeWidth={1} className="mx-auto mb-2" />
          <p className="text-sm">No meetings linked</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {meetings.map((m, i) => (
            <Link
              key={m.id}
              href={`/meetings/${m.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderBottom: i < meetings.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <FileText size={16} style={{ color: 'var(--color-blue)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.title}</p>
                {m.date && (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(m.date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full capitalize"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {m.source}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function MembersTab({
  members: initialMembers,
  projectId,
  currentUserId,
  onMembersChange,
}: {
  members: Member[]
  projectId: string
  currentUserId: string
  onMembersChange: (m: Member[]) => void
}) {
  const [members, setMembers] = useState(initialMembers)
  const [removing, startRemove] = useTransition()

  function removeMember(userId: string) {
    startRemove(async () => {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        const updated = members.filter(m => m.userId !== userId)
        setMembers(updated)
        onMembersChange(updated)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Members</h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          {members.length}
        </span>
      </div>

      <div className="glass-card overflow-hidden">
        {members.map((m, i) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <Avatar name={m.userName ?? ''} src={m.userImage ?? undefined} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.userName ?? m.userEmail}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.userEmail}</p>
            </div>
            <span
              className="text-[11px] font-medium capitalize px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {m.role}
            </span>
            {m.userId !== currentUserId && (
              <button
                onClick={() => removeMember(m.userId)}
                disabled={removing}
                className="p-1 rounded-[6px] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label="Remove member"
              >
                <Trash2 size={14} style={{ color: 'var(--color-red)' }} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsTab({ project, onUpdate }: { project: Project; onUpdate: (p: Project) => void }) {
  const router = useRouter()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [startDate, setStartDate] = useState(project.startDate ?? '')
  const [endDate, setEndDate] = useState(project.endDate ?? '')
  const [budget, setBudget] = useState(project.budget?.toString() ?? '')
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    startSave(async () => {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          startDate: startDate || null,
          endDate: endDate || null,
          budget: budget ? Number(budget) : null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...project, ...updated })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  function handleDelete() {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    startDelete(async () => {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (res.ok) router.push('/projects')
    })
  }

  return (
    <div className="max-w-lg flex flex-col gap-4">
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>General Settings</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Project Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-[8px] outline-none resize-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>End Date</label>
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
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Budget ($)</label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm rounded-[8px] font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--color-blue)' }}
          >
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="glass-card p-5" style={{ border: '1px solid rgba(255,59,48,0.2)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-red)' }}>Danger Zone</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Deleting this project will remove all associated data. This cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-[8px] font-medium disabled:opacity-50"
          style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--color-red)' }}
        >
          <Trash2 size={14} />
          {deleting ? 'Deleting…' : 'Delete Project'}
        </button>
      </div>
    </div>
  )
}
