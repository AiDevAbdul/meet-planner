'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Clock, TrendingUp, Users, FileText, ChevronDown, ChevronUp, Mail, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type StatusBreakdown  = { status: string;   count: number }
type PriorityBreakdown = { priority: string; count: number }
type AssigneeLoad     = { name: string; total: number; done: number }

export type DailyReport = {
  id:              string
  date:            string
  contentHtml:     string
  contentMarkdown: string
  sentAt:          Date | string | null
  recipientIds:    string[] | null
  createdAt:       Date | string
}

type Props = {
  totalTasks:        number
  completedTasks:    number
  overdueTasks:      number
  totalMeetings:     number
  statusBreakdown:   StatusBreakdown[]
  priorityBreakdown: PriorityBreakdown[]
  assigneeLoad:      AssigneeLoad[]
  meetingsThisMonth: number
  dailyReports:      DailyReport[]
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

const TABS = ['Overview', 'Reports', 'Time'] as const
type Tab = (typeof TABS)[number]

export function AnalyticsClient({
  totalTasks, completedTasks, overdueTasks, totalMeetings,
  statusBreakdown, priorityBreakdown, assigneeLoad, meetingsThisMonth,
  dailyReports,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

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

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 mb-6 p-1 rounded-[12px]"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: 'fit-content' }}
        role="tablist"
      >
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className="text-[13px] font-medium px-4 py-1.5 rounded-[9px] transition-all"
            style={{
              background: activeTab === tab ? 'var(--bg-primary)' : 'transparent',
              color:      activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow:  activeTab === tab ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <OverviewTab
          totalTasks={totalTasks}
          completedTasks={completedTasks}
          overdueTasks={overdueTasks}
          totalMeetings={totalMeetings}
          statusBreakdown={statusBreakdown}
          priorityBreakdown={priorityBreakdown}
          assigneeLoad={assigneeLoad}
          meetingsThisMonth={meetingsThisMonth}
        />
      )}

      {activeTab === 'Reports' && (
        <ReportsTab reports={dailyReports} />
      )}

      {activeTab === 'Time' && (
        <TimeTab />
      )}
    </div>
  )
}

// ─── Overview tab (original content) ─────────────────────────────────────────

function OverviewTab({
  totalTasks, completedTasks, overdueTasks, totalMeetings,
  statusBreakdown, priorityBreakdown, assigneeLoad, meetingsThisMonth,
}: Omit<Props, 'dailyReports'>) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const maxStatus   = Math.max(...statusBreakdown.map(s => s.count),  1)
  const maxPriority = Math.max(...priorityBreakdown.map(p => p.count), 1)
  const maxLoad     = Math.max(...assigneeLoad.map(a => a.total), 1)

  return (
    <>
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
    </>
  )
}

// ─── Reports tab ──────────────────────────────────────────────────────────────

function ReportsTab({ reports }: { reports: DailyReport[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (reports.length === 0) {
    return (
      <div className="glass-card p-10 flex flex-col items-center gap-3 text-center">
        <FileText size={32} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>No reports yet</p>
        <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
          Daily reports are generated automatically at 5:00 PM and sent to managers and admins.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map(report => {
        const expanded = expandedId === report.id
        return (
          <div key={report.id} className="glass-card overflow-hidden">
            {/* Report header row */}
            <button
              onClick={() => setExpandedId(expanded ? null : report.id)}
              className="w-full flex items-center justify-between p-5 text-left"
              aria-expanded={expanded}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,122,255,0.1)' }}
                >
                  <FileText size={17} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />
                </div>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Daily Report — {formatDate(report.date)}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {report.sentAt ? (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-green)' }}>
                        <Mail size={10} strokeWidth={1.5} />
                        Sent to {report.recipientIds?.length ?? 0} recipient{(report.recipientIds?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        Email not sent
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {expanded
                ? <ChevronUp size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                : <ChevronDown size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              }
            </button>

            {/* Expanded report content */}
            {expanded && (
              <div
                className="px-5 pb-5"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <div
                  className="mt-4 prose prose-sm max-w-none text-[13px] leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                  dangerouslySetInnerHTML={{ __html: report.contentHtml }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Time tab ─────────────────────────────────────────────────────────────────

type TimeReportData = {
  totalWeekHours:  number
  totalMonthHours: number
  byPersonWeek:    { userId: string | null; name: string; hours: number }[]
  byPersonMonth:   { userId: string | null; name: string; hours: number }[]
  byProject:       { projectId: string | null; projectName: string; hours: number }[]
}

function TimeTab() {
  const [data,    setData]    = useState<TimeReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports/time')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  function exportCsv() {
    window.open('/api/reports/time?format=csv', '_blank')
  }

  if (loading) {
    return (
      <div className="glass-card p-10 flex items-center justify-center gap-3">
        <Clock size={18} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} className="animate-spin" />
        <span className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Loading time data…</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>No time data available.</p>
      </div>
    )
  }

  const maxWeek    = Math.max(...data.byPersonWeek.map(r => r.hours), 1)
  const maxMonth   = Math.max(...data.byPersonMonth.map(r => r.hours), 1)
  const maxProject = Math.max(...data.byProject.map(r => r.hours), 1)

  return (
    <>
      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricCard
          icon={<Clock size={20} strokeWidth={1.5} />}
          label="This Week"
          value={`${data.totalWeekHours}h`}
          sub="Total hours logged this week"
          color="var(--color-blue)"
        />
        <MetricCard
          icon={<TrendingUp size={20} strokeWidth={1.5} />}
          label="This Month"
          value={`${data.totalMonthHours}h`}
          sub="Total hours logged this month"
          color="var(--color-purple)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By person this week */}
        <div className="glass-card p-5">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Hours by Person (This Week)
          </h2>
          {data.byPersonWeek.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No entries this week</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.byPersonWeek.map(r => (
                <BarRow
                  key={r.userId ?? r.name}
                  label={r.name}
                  count={r.hours}
                  max={maxWeek}
                  color="var(--color-blue)"
                />
              ))}
            </div>
          )}
        </div>

        {/* By person this month */}
        <div className="glass-card p-5">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Hours by Person (This Month)
          </h2>
          {data.byPersonMonth.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No entries this month</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.byPersonMonth.map(r => (
                <BarRow
                  key={r.userId ?? r.name}
                  label={r.name}
                  count={r.hours}
                  max={maxMonth}
                  color="var(--color-purple)"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* By project */}
      <div className="glass-card p-5 mb-6">
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Hours by Project (This Month)
        </h2>
        {data.byProject.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No project entries this month</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.byProject.map(r => (
              <BarRow
                key={r.projectId ?? r.projectName}
                label={r.projectName}
                count={r.hours}
                max={maxProject}
                color="var(--color-green)"
              />
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <Download size={14} strokeWidth={1.5} />
          Export CSV
        </button>
      </div>
    </>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

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
