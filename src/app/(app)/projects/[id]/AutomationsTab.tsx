'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Zap, ZapOff, Plus, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, Clock, AlertTriangle, CheckCircle2,
  Bell, ArrowRight, Users, Calendar,
} from 'lucide-react'

type Automation = {
  id: string
  name: string
  triggerType: string
  triggerConfig: Record<string, unknown>
  actionType: string
  actionConfig: Record<string, unknown>
  enabled: boolean
  lastRunAt: string | null
  runCount: number
}

type PresetTemplate = {
  name: string
  triggerType: string
  triggerConfig: Record<string, unknown>
  actionType: string
  actionConfig: Record<string, unknown>
  description: string
  icon: React.ElementType
  color: string
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name:          'Overdue task reminder',
    triggerType:   'task_overdue',
    triggerConfig: {},
    actionType:    'send_notification',
    actionConfig:  { message: 'You have an overdue task — please update its status.' },
    description:   'Notify assignee when a task passes its due date.',
    icon:          AlertTriangle,
    color:         'var(--color-red)',
  },
  {
    name:          'Due date approaching (2 days)',
    triggerType:   'due_date_approaching',
    triggerConfig: { days: 2 },
    actionType:    'send_notification',
    actionConfig:  { message: 'A task you own is due in 2 days.' },
    description:   'Remind assignee 2 days before due date.',
    icon:          Calendar,
    color:         'var(--color-orange)',
  },
  {
    name:          'Task moved to Review — notify team',
    triggerType:   'task_status_changed',
    triggerConfig: { to: 'review' },
    actionType:    'send_notification',
    actionConfig:  { message: 'A task needs review.' },
    description:   'Broadcast notification when any task enters Review.',
    icon:          Bell,
    color:         'var(--color-purple)',
  },
  {
    name:          'Task completed — notify team',
    triggerType:   'task_status_changed',
    triggerConfig: { to: 'done' },
    actionType:    'send_notification',
    actionConfig:  { message: 'A task has been completed.' },
    description:   'Notify project members when a task is marked Done.',
    icon:          CheckCircle2,
    color:         'var(--color-green)',
  },
  {
    name:          'Critical priority — alert team',
    triggerType:   'task_priority_changed',
    triggerConfig: { to: 'critical' },
    actionType:    'send_notification',
    actionConfig:  { message: 'A task has been marked Critical — immediate attention needed.' },
    description:   'Alert all members when a task priority is raised to Critical.',
    icon:          AlertTriangle,
    color:         'var(--color-red)',
  },
  {
    name:          'Task in progress — start notification',
    triggerType:   'task_status_changed',
    triggerConfig: { to: 'in_progress' },
    actionType:    'send_notification',
    actionConfig:  { message: 'Work has started on a task.' },
    description:   'Notify the team when a task moves to In Progress.',
    icon:          ArrowRight,
    color:         'var(--color-blue)',
  },
  {
    name:          'Milestone completed — celebrate',
    triggerType:   'milestone_completed',
    triggerConfig: {},
    actionType:    'send_notification',
    actionConfig:  { message: 'A milestone has been completed.' },
    description:   'Notify project members when any milestone is marked done.',
    icon:          CheckCircle2,
    color:         'var(--color-green)',
  },
  {
    name:          'Project status change — inform team',
    triggerType:   'project_status_changed',
    triggerConfig: {},
    actionType:    'send_notification',
    actionConfig:  { message: 'The project status has changed.' },
    description:   'Notify all members whenever the project status is updated.',
    icon:          Users,
    color:         'var(--color-blue)',
  },
  {
    name:          'Task overdue — escalate priority to High',
    triggerType:   'task_overdue',
    triggerConfig: {},
    actionType:    'change_task_priority',
    actionConfig:  { priority: 'high' },
    description:   'Automatically escalate overdue tasks to High priority.',
    icon:          AlertTriangle,
    color:         'var(--color-orange)',
  },
  {
    name:          'Due date in 1 day — urgent reminder',
    triggerType:   'due_date_approaching',
    triggerConfig: { days: 1 },
    actionType:    'send_notification',
    actionConfig:  { message: 'A task you own is due tomorrow — make sure to complete it.' },
    description:   'Send an urgent reminder the day before a task is due.',
    icon:          Clock,
    color:         'var(--color-red)',
  },
]

const TRIGGER_LABELS: Record<string, string> = {
  task_overdue:          'Task overdue',
  due_date_approaching:  'Due date approaching',
  task_status_changed:   'Task status changed',
  task_priority_changed: 'Task priority changed',
  milestone_completed:   'Milestone completed',
  project_status_changed:'Project status changed',
  task_created:          'Task created',
  task_assigned:         'Task assigned',
  comment_added:         'Comment added',
  time_entry_logged:     'Time entry logged',
}

const ACTION_LABELS: Record<string, string> = {
  send_notification:    'Send notification',
  change_task_status:   'Change task status',
  change_task_priority: 'Change task priority',
  assign_task:          'Assign task',
  create_task:          'Create task',
  post_to_channel:      'Post to channel',
  set_due_date_offset:  'Set due date offset',
  move_to_project:      'Move to project',
  add_tag:              'Add tag',
  mark_milestone_done:  'Mark milestone done',
}

export function AutomationsTab({ projectId }: { projectId: string }) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, startAdd]    = useTransition()
  const [deleting, startDel]  = useTransition()
  const [toggling, startTog]  = useTransition()
  const [showPresets, setShowPresets] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/automations`)
      .then(r => r.ok ? r.json() : [])
      .then(setAutomations)
      .finally(() => setLoading(false))
  }, [projectId])

  function addPreset(template: PresetTemplate) {
    startAdd(async () => {
      const res = await fetch(`/api/projects/${projectId}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          template.name,
          triggerType:   template.triggerType,
          triggerConfig: template.triggerConfig,
          actionType:    template.actionType,
          actionConfig:  template.actionConfig,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setAutomations(prev => [...prev, created])
        setShowPresets(false)
      }
    })
  }

  function toggleEnabled(automation: Automation) {
    const next = !automation.enabled
    setAutomations(prev => prev.map(a => a.id === automation.id ? { ...a, enabled: next } : a))
    startTog(async () => {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!res.ok) {
        setAutomations(prev => prev.map(a => a.id === automation.id ? { ...a, enabled: automation.enabled } : a))
      }
    })
  }

  function deleteAutomation(id: string) {
    if (!confirm('Delete this automation? This cannot be undone.')) return
    setAutomations(prev => prev.filter(a => a.id !== id))
    startDel(async () => {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' })
    })
  }

  const activeCount = automations.filter(a => a.enabled).length

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: 'var(--color-blue)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Automations
          </h2>
          {automations.length > 0 && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {activeCount} active
            </span>
          )}
        </div>
        <button
          onClick={() => setShowPresets(!showPresets)}
          disabled={adding}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors"
          style={{ background: 'var(--color-blue)', color: '#fff' }}
        >
          <Plus size={13} />
          Add automation
          <ChevronDown size={12} style={{ transform: showPresets ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
        </button>
      </div>

      {/* Preset picker */}
      {showPresets && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Choose a preset template to add
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {PRESET_TEMPLATES.map((t, i) => {
              const Icon    = t.icon
              const already = automations.some(a => a.name === t.name)
              return (
                <button
                  key={i}
                  onClick={() => !already && addPreset(t)}
                  disabled={already || adding}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors disabled:opacity-40"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => { if (!already) (e.currentTarget as HTMLElement).style.background = 'var(--bg-glass)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div
                    className="flex items-center justify-center rounded-[6px] shrink-0"
                    style={{ width: 28, height: 28, background: `${t.color}18` }}
                  >
                    <Icon size={14} style={{ color: t.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t.description}</p>
                  </div>
                  {already && (
                    <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                      Added
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Automation list */}
      {loading ? (
        <div className="glass-card p-6 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading…</p>
        </div>
      ) : automations.length === 0 ? (
        <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: 'var(--bg-secondary)' }}
          >
            <ZapOff size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No automations yet</p>
          <p className="text-xs max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Add a preset rule to automatically send notifications or update tasks when conditions are met.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {automations.map((auto, i) => {
            const preset = PRESET_TEMPLATES.find(p => p.triggerType === auto.triggerType && p.actionType === auto.actionType)
            const Icon   = preset?.icon ?? Zap
            const color  = preset?.color ?? 'var(--color-blue)'
            return (
              <div
                key={auto.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < automations.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <div
                  className="flex items-center justify-center rounded-[6px] shrink-0"
                  style={{ width: 32, height: 32, background: `${color}18`, opacity: auto.enabled ? 1 : 0.4 }}
                >
                  <Icon size={15} style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--text-primary)', opacity: auto.enabled ? 1 : 0.5 }}
                  >
                    {auto.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {TRIGGER_LABELS[auto.triggerType] ?? auto.triggerType}
                    {' → '}
                    {ACTION_LABELS[auto.actionType] ?? auto.actionType}
                    {auto.runCount > 0 && (
                      <span className="ml-2">· Fired {auto.runCount}×</span>
                    )}
                  </p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleEnabled(auto)}
                  disabled={toggling}
                  aria-label={auto.enabled ? 'Disable automation' : 'Enable automation'}
                  className="shrink-0 p-1 transition-colors"
                >
                  {auto.enabled
                    ? <ToggleRight size={22} style={{ color: 'var(--color-blue)' }} />
                    : <ToggleLeft  size={22} style={{ color: 'var(--text-tertiary)' }} />
                  }
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteAutomation(auto.id)}
                  disabled={deleting}
                  aria-label="Delete automation"
                  className="shrink-0 p-1 rounded-[6px] transition-colors"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,59,48,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <Trash2 size={14} style={{ color: 'var(--color-red)' }} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        Automations run every hour via a scheduled job. Time-based triggers (overdue, due date) are evaluated on each run.
        Event-based triggers check activity from the past hour.
      </p>
    </div>
  )
}
