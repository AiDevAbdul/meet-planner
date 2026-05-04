'use client'

import { CheckSquare, Clock, TrendingUp, Users } from 'lucide-react'

type StatusBreakdown  = { status: string;   count: number }
type PriorityBreakdown = { priority: string; count: number }
type AssigneeLoad     = { name: string; total: number; done: number }

type Props = {
  totalTasks:       number
  completedTasks:   number
  overdueTasks:     number
  totalMeetings:    number
  statusBreakdown:  StatusBreakdown[]
  priorityBreakdown: PriorityBreakdown[]
  assigneeLoad:     AssigneeLoad[]
  meetingsThisMonth: number
}

const STATUS_COLORS: Record<string, string> = {
  triage:      'var(--color-yellow)',
  todo:        'var(--text-tertiary)',
  in_progress: 'var(--color-blue)',
  review:      'var(--color-purple)',
  done:        'var(--color-green)',
}
const STATUS_LABELS: Record<string, string> = {
  triage: 'Triage', todo: 'To Do', in_progress: 'In Progress',
  review: 'Review', done: 'Done',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'var(--color-red)',
  high:     'var(--color-orange)',
  normal:   'var(--color-blue)',
  low:      'var(--color-yellow)',
}

export function AnalyticsClient({
  totalTasks, completedTasks, overdueTasks, totalMeetings,
  statusBreakdown, priorityBreakdown, assigneeLoad, meetingsThisMonth,
}: Props) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const maxStatus   = Math.max(...statusBreakdown.map(s => s.count),  1)
  const maxPriority = Math.max(...priorityBreakdown.map(p => p.count), 1)
  const maxLoad     = Math.max(...assigneeLoad.map(a => a.total), 1)

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-9 h-9 rounded-[10px]"
          style={{ background: 'rgba(0,122,255,0.1)' }}>
          <TrendingUp size={18} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Team performance and task insights
          </p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<CheckSquare size={20} strokeWidth={1.5} />}
          label="Completion Rate"
          value={`${completionRate}%`}
          sub={`${completedTasks} of ${totalTasks} tasks done`}
          color="var(--color-green)"
        />
        <MetricCard
          icon={<Clock size={20} strokeWidth={1.5} />}
          label="Overdue Tasks"
          value={String(overdueTasks)}
          sub="Need immediate attention"
          color="var(--color-red)"
        />
        <MetricCard
          icon={<TrendingUp size={20} strokeWidth={1.5} />}
          label="Meetings (Month)"
          value={String(meetingsThisMonth)}
          sub={`${totalMeetings} all time`}
          color="var(--color-blue)"
        />
        <MetricCard
          icon={<Users size={20} strokeWidth={1.5} />}
          label="Active Tasks"
          value={String(totalTasks - completedTasks)}
          sub="In progress or pending"
          color="var(--color-purple)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tasks by status */}
        <div className="glass-card p-5">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Tasks by Status
          </h2>
          <div className="flex flex-col gap-3">
            {statusBreakdown.map(s => (
              <BarRow
                key={s.status}
                label={STATUS_LABELS[s.status] ?? s.status}
                count={s.count}
                max={maxStatus}
                color={STATUS_COLORS[s.status] ?? 'var(--color-blue)'}
              />
            ))}
          </div>
        </div>

        {/* Tasks by priority */}
        <div className="glass-card p-5">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Tasks by Priority
          </h2>
          <div className="flex flex-col gap-3">
            {priorityBreakdown.map(p => (
              <BarRow
                key={p.priority}
                label={p.priority.charAt(0).toUpperCase() + p.priority.slice(1)}
                count={p.count}
                max={maxPriority}
                color={PRIORITY_COLORS[p.priority] ?? 'var(--color-blue)'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Team workload */}
      <div className="glass-card p-5">
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Team Workload
        </h2>
        {assigneeLoad.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No assigned tasks yet</p>
        ) : (
          <div className="flex flex-col gap-4">
            {assigneeLoad.map(a => {
              const pct  = Math.round((a.total / maxLoad) * 100)
              const done = a.total > 0 ? Math.round((a.done / a.total) * 100) : 0
              return (
                <div key={a.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {a.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        {a.done}/{a.total} done
                      </span>
                      <span
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[4px]"
                        style={{
                          background: done >= 80 ? 'rgba(52,199,89,0.12)' : done >= 50 ? 'rgba(0,122,255,0.1)' : 'rgba(255,149,0,0.12)',
                          color:      done >= 80 ? 'var(--color-green)' : done >= 50 ? 'var(--color-blue)' : 'var(--color-orange)',
                        }}
                      >
                        {done}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: a.total > 8 ? 'var(--color-orange)' : 'var(--color-blue)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, color }}>
          {icon}
        </div>
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <p className="text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
    </div>
  )
}

function BarRow({
  label, count, max, color,
}: {
  label: string; count: number; max: number; color: string
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
