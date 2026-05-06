'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckSquare, Clock, TrendingUp, Users, FileText,
  ChevronDown, ChevronUp, Mail, Download, Sparkles,
  Loader2, BarChart2, Pin, PinOff, Trash2, Plus, X,
} from 'lucide-react'
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

const TABS = ['Overview', 'Advanced', 'Builder', 'Reports', 'Time'] as const
type Tab = (typeof TABS)[number]

export function AnalyticsClient({
  totalTasks, completedTasks, overdueTasks, totalMeetings,
  statusBreakdown, priorityBreakdown, assigneeLoad, meetingsThisMonth,
  dailyReports,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  return (
    <div className="max-w-7xl mx-auto">
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

      <div
        className="flex items-center gap-1 mb-6 p-1 rounded-[12px] overflow-x-auto"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: 'fit-content' }}
        role="tablist"
      >
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className="text-[13px] font-medium px-4 py-1.5 rounded-[9px] transition-all whitespace-nowrap"
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
      {activeTab === 'Advanced' && (
        <AdvancedTab
          statusBreakdown={statusBreakdown}
          priorityBreakdown={priorityBreakdown}
          assigneeLoad={assigneeLoad}
        />
      )}
      {activeTab === 'Builder' && <BuilderTab />}
      {activeTab === 'Reports' && <ReportsTab reports={dailyReports} />}
      {activeTab === 'Time' && <TimeTab />}
    </div>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={<CheckSquare size={20} strokeWidth={1.5} />} label="Completion Rate"
          value={`${completionRate}%`} sub={`${completedTasks} of ${totalTasks} tasks done`} color="var(--color-green)" />
        <MetricCard icon={<Clock size={20} strokeWidth={1.5} />} label="Overdue Tasks"
          value={String(overdueTasks)} sub="Need immediate attention" color="var(--color-red)" />
        <MetricCard icon={<TrendingUp size={20} strokeWidth={1.5} />} label="Meetings (Month)"
          value={String(meetingsThisMonth)} sub={`${totalMeetings} all time`} color="var(--color-blue)" />
        <MetricCard icon={<Users size={20} strokeWidth={1.5} />} label="Active Tasks"
          value={String(totalTasks - completedTasks)} sub="In progress or pending" color="var(--color-purple)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-5">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Tasks by Status</h2>
          <div className="flex flex-col gap-3">
            {statusBreakdown.map(s => (
              <BarRow key={s.status} label={STATUS_LABELS[s.status] ?? s.status} count={s.count}
                max={maxStatus} color={STATUS_COLORS[s.status] ?? 'var(--color-blue)'} />
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Tasks by Priority</h2>
          <div className="flex flex-col gap-3">
            {priorityBreakdown.map(p => (
              <BarRow key={p.priority} label={p.priority.charAt(0).toUpperCase() + p.priority.slice(1)}
                count={p.count} max={maxPriority} color={PRIORITY_COLORS[p.priority] ?? 'var(--color-blue)'} />
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Team Workload</h2>
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
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{a.done}/{a.total} done</span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[4px]"
                        style={{
                          background: done >= 80 ? 'rgba(52,199,89,0.12)' : done >= 50 ? 'rgba(0,122,255,0.1)' : 'rgba(255,149,0,0.12)',
                          color:      done >= 80 ? 'var(--color-green)' : done >= 50 ? 'var(--color-blue)' : 'var(--color-orange)',
                        }}>{done}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: a.total > 8 ? 'var(--color-orange)' : 'var(--color-blue)' }} />
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

// ─── Advanced tab ─────────────────────────────────────────────────────────────

type BurndownData = { points: { date: string; ideal: number; actual: number }[]; totalTasks: number }
type VelocityData = { sprints: { sprintName: string; startDate: string; totalTasks: number; completedTasks: number; completionRate: number; status: string }[] }
type CycleTimeData = {
  average: number; median: number
  distribution: { label: string; count: number }[]
  byPriority: { priority: string; average: number; count: number }[]
}

function AdvancedTab({
  statusBreakdown, priorityBreakdown, assigneeLoad,
}: { statusBreakdown: StatusBreakdown[]; priorityBreakdown: PriorityBreakdown[]; assigneeLoad: AssigneeLoad[] }) {
  const [burndown,   setBurndown]   = useState<BurndownData | null>(null)
  const [velocity,   setVelocity]   = useState<VelocityData | null>(null)
  const [cycleTime,  setCycleTime]  = useState<CycleTimeData | null>(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/burndown').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/analytics/velocity').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/analytics/cycle-time').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([b, v, c]) => {
      if (b) setBurndown(b)
      if (v) setVelocity(v)
      if (c) setCycleTime(c)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-10 flex items-center justify-center gap-3">
        <Loader2 size={18} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Loading advanced analytics…</span>
      </div>
    )
  }

  const maxBurndown = burndown?.totalTasks ?? 1
  const maxVelocity = velocity ? Math.max(...velocity.sprints.map(s => s.totalTasks), 1) : 1
  const maxCycleDist = cycleTime ? Math.max(...cycleTime.distribution.map(d => d.count), 1) : 1
  const maxLoad     = Math.max(...assigneeLoad.map(a => a.total), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Burndown Chart */}
      {burndown && (
        <ChartCard title="Sprint Burndown" chartType="burndown" data={burndown}>
          {burndown.points.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No active sprint found.</p>
          ) : (
            <div className="relative h-40">
              <BurndownChart points={burndown.points} totalTasks={burndown.totalTasks} />
            </div>
          )}
        </ChartCard>
      )}

      {/* Velocity Chart */}
      {velocity && (
        <ChartCard title="Sprint Velocity" chartType="velocity" data={velocity}>
          {velocity.sprints.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No sprints found. Create sprints in a project to track velocity.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {velocity.sprints.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{s.sprintName}</span>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {s.completedTasks}/{s.totalTasks} ({s.completionRate}%)
                    </span>
                  </div>
                  <div className="h-5 rounded-[4px] overflow-hidden relative" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-[4px] transition-all duration-700 flex items-center"
                      style={{ width: `${Math.round((s.totalTasks / maxVelocity) * 100)}%`, background: 'rgba(0,122,255,0.15)' }}>
                    </div>
                    <div className="absolute inset-0 h-full rounded-[4px] transition-all duration-700"
                      style={{ width: `${Math.round((s.completedTasks / maxVelocity) * 100)}%`, background: 'var(--color-blue)', opacity: 0.9 }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(0,122,255,0.15)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--color-blue)', opacity: 0.9 }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Completed</span>
                </div>
              </div>
            </div>
          )}
        </ChartCard>
      )}

      {/* Cycle Time Distribution */}
      {cycleTime && (
        <ChartCard title="Cycle Time Distribution" chartType="cycleTime" data={cycleTime}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex gap-4 mb-4">
                <div>
                  <p className="text-[11px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Average</p>
                  <p className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>
                    {cycleTime.average >= 24 ? `${Math.round(cycleTime.average / 24)}d` : `${cycleTime.average}h`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Median</p>
                  <p className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>
                    {cycleTime.median >= 24 ? `${Math.round(cycleTime.median / 24)}d` : `${cycleTime.median}h`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {cycleTime.distribution.map(d => (
                  <BarRow key={d.label} label={d.label} count={d.count} max={maxCycleDist} color="var(--color-purple)" />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>By Priority</p>
              <div className="flex flex-col gap-2">
                {cycleTime.byPriority.map(p => (
                  <div key={p.priority} className="flex items-center justify-between py-1.5 px-3 rounded-[8px]"
                    style={{ background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[p.priority] ?? 'var(--color-blue)' }} />
                      <span className="text-[13px] capitalize" style={{ color: 'var(--text-secondary)' }}>{p.priority}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{p.count} tasks</span>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {p.average >= 24 ? `${Math.round(p.average / 24)}d` : `${p.average}h`}
                      </span>
                    </div>
                  </div>
                ))}
                {cycleTime.byPriority.length === 0 && (
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No completed tasks with timing data.</p>
                )}
              </div>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Team Performance Table */}
      <ChartCard title="Team Performance" chartType="workload" data={assigneeLoad}>
        {assigneeLoad.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Member', 'Total Tasks', 'Completed', 'Rate', 'Load'].map(h => (
                    <th key={h} className="text-left pb-2 pr-4 font-medium" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assigneeLoad.map(a => {
                  const rate = a.total > 0 ? Math.round((a.done / a.total) * 100) : 0
                  const load = Math.round((a.total / maxLoad) * 100)
                  return (
                    <tr key={a.name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{a.total}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{a.done}</td>
                      <td className="py-2 pr-4">
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[4px]"
                          style={{
                            background: rate >= 80 ? 'rgba(52,199,89,0.12)' : rate >= 50 ? 'rgba(0,122,255,0.1)' : 'rgba(255,149,0,0.12)',
                            color:      rate >= 80 ? 'var(--color-green)' : rate >= 50 ? 'var(--color-blue)' : 'var(--color-orange)',
                          }}>{rate}%</span>
                      </td>
                      <td className="py-2">
                        <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                          <div className="h-full rounded-full" style={{ width: `${load}%`, background: a.total > 8 ? 'var(--color-orange)' : 'var(--color-blue)' }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  )
}

// ─── Burndown SVG Chart ───────────────────────────────────────────────────────

function BurndownChart({ points, totalTasks }: { points: { date: string; ideal: number; actual: number }[]; totalTasks: number }) {
  if (points.length === 0) return null
  const W = 600; const H = 160; const PAD = 10
  const maxY = totalTasks
  const n = points.length - 1

  const px = (i: number) => PAD + (i / Math.max(n, 1)) * (W - PAD * 2)
  const py = (v: number) => H - PAD - ((v / Math.max(maxY, 1)) * (H - PAD * 2))

  const idealPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.ideal).toFixed(1)}`).join(' ')
  const actualPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.actual).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" style={{ overflow: 'visible' }}>
      <path d={idealPath} fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={actualPath} fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={px(i)} cy={py(p.actual)} r="3" fill="var(--color-blue)" />
      ))}
      <g style={{ fontSize: '10px', fill: 'var(--text-tertiary)' }}>
        <text x={W - PAD} y={py(0) + 12} textAnchor="end">Done</text>
        <text x={W - PAD} y={py(maxY) - 4} textAnchor="end">Start</text>
      </g>
    </svg>
  )
}

// ─── Chart Card with AI Insights ─────────────────────────────────────────────

function ChartCard({ title, chartType, data, children }: {
  title: string; chartType: string; data: unknown; children: React.ReactNode
}) {
  const [insight,  setInsight]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [showAI,   setShowAI]   = useState(false)

  async function fetchInsight() {
    setLoading(true); setShowAI(true)
    try {
      const r = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartType, data }),
      })
      if (r.ok) {
        const { insight: text } = await r.json()
        setInsight(text)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <button
          onClick={fetchInsight}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: 'rgba(175,82,222,0.1)', color: 'var(--color-purple)', border: '1px solid rgba(175,82,222,0.2)' }}
        >
          {loading ? <Loader2 size={12} strokeWidth={1.5} className="animate-spin" /> : <Sparkles size={12} strokeWidth={1.5} />}
          AI Insights
        </button>
      </div>
      {children}
      {showAI && (
        <div className="mt-4 p-3 rounded-[8px] flex gap-2" style={{ background: 'rgba(175,82,222,0.06)', border: '1px solid rgba(175,82,222,0.15)' }}>
          <Sparkles size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-purple)' }} />
          {loading ? (
            <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Analyzing data…</span>
          ) : (
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{insight}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Report Builder tab ───────────────────────────────────────────────────────

type ReportConfig = {
  name:    string
  metrics: string[]
  filters: { timeRange: string; projectId: string }
}

type SavedReport = {
  id: string; name: string; pinned: boolean
  config: Record<string, unknown>; createdAt: string
}

const METRIC_OPTIONS = [
  { id: 'completion_rate',  label: 'Completion Rate' },
  { id: 'overdue_count',    label: 'Overdue Tasks' },
  { id: 'velocity',         label: 'Sprint Velocity' },
  { id: 'cycle_time',       label: 'Cycle Time' },
  { id: 'workload',         label: 'Team Workload' },
  { id: 'status_breakdown', label: 'Status Breakdown' },
  { id: 'priority_mix',     label: 'Priority Mix' },
  { id: 'meetings_count',   label: 'Meetings Count' },
]

function BuilderTab() {
  const [saved,    setSaved]    = useState<SavedReport[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [config,   setConfig]   = useState<ReportConfig>({
    name: '', metrics: [], filters: { timeRange: '30d', projectId: '' },
  })

  useEffect(() => {
    fetch('/api/reports/saved')
      .then(r => r.ok ? r.json() : [])
      .then(setSaved)
      .finally(() => setLoading(false))
  }, [])

  async function saveReport() {
    if (!config.name || config.metrics.length === 0) return
    setSaving(true)
    try {
      const r = await fetch('/api/reports/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: config.name, config }),
      })
      if (r.ok) {
        const report = await r.json()
        setSaved(prev => [report, ...prev])
        setConfig({ name: '', metrics: [], filters: { timeRange: '30d', projectId: '' } })
      }
    } finally {
      setSaving(false)
    }
  }

  async function togglePin(id: string, pinned: boolean) {
    const r = await fetch('/api/reports/saved', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pinned: !pinned }),
    })
    if (r.ok) setSaved(prev => prev.map(s => s.id === id ? { ...s, pinned: !pinned } : s))
  }

  async function deleteReport(id: string) {
    const r = await fetch(`/api/reports/saved?id=${id}`, { method: 'DELETE' })
    if (r.ok) setSaved(prev => prev.filter(s => s.id !== id))
  }

  function toggleMetric(id: string) {
    setConfig(c => ({
      ...c,
      metrics: c.metrics.includes(id) ? c.metrics.filter(m => m !== id) : [...c.metrics, id],
    }))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Builder form */}
      <div className="glass-card p-5">
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Custom Report Builder</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Report Name</label>
            <input
              value={config.name}
              onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
              placeholder="e.g. Weekly Engineering Summary"
              className="w-full px-3 py-2 rounded-[8px] text-[13px] outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Metrics to Include</label>
            <div className="grid grid-cols-2 gap-2">
              {METRIC_OPTIONS.map(m => (
                <button
                  key={m.id}
                  onClick={() => toggleMetric(m.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-[12px] text-left transition-all"
                  style={{
                    background: config.metrics.includes(m.id) ? 'rgba(0,122,255,0.1)' : 'var(--bg-secondary)',
                    border:     `1px solid ${config.metrics.includes(m.id) ? 'rgba(0,122,255,0.3)' : 'var(--border)'}`,
                    color:      config.metrics.includes(m.id) ? 'var(--color-blue)' : 'var(--text-secondary)',
                  }}
                >
                  <div className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: config.metrics.includes(m.id) ? 'var(--color-blue)' : 'var(--border)' }}>
                    {config.metrics.includes(m.id) && <span style={{ color: 'white', fontSize: 9, lineHeight: 1 }}>✓</span>}
                  </div>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Time Range</label>
            <select
              value={config.filters.timeRange}
              onChange={e => setConfig(c => ({ ...c, filters: { ...c.filters, timeRange: e.target.value } }))}
              className="w-full px-3 py-2 rounded-[8px] text-[13px] outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <button
            onClick={saveReport}
            disabled={saving || !config.name || config.metrics.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-medium transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--color-blue)', color: 'white' }}
          >
            {saving ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> : <Plus size={14} strokeWidth={1.5} />}
            Save Report
          </button>
        </div>
      </div>

      {/* Saved reports */}
      <div>
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Saved Reports</h2>
        {loading ? (
          <div className="glass-card p-6 flex items-center justify-center gap-2">
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</span>
          </div>
        ) : saved.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <BarChart2 size={28} strokeWidth={1} style={{ color: 'var(--text-tertiary)', margin: '0 auto 8px' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No saved reports yet. Build one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {saved.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map(r => (
              <div key={r.id} className="glass-card p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {r.pinned && <Pin size={12} strokeWidth={1.5} style={{ color: 'var(--color-orange)' }} />}
                    <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {((r.config as ReportConfig)?.metrics?.length ?? 0)} metrics · {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => togglePin(r.id, r.pinned)} title={r.pinned ? 'Unpin' : 'Pin'}
                    className="p-1.5 rounded-[6px] transition-all hover:opacity-70"
                    style={{ color: r.pinned ? 'var(--color-orange)' : 'var(--text-tertiary)' }}>
                    {r.pinned ? <PinOff size={13} strokeWidth={1.5} /> : <Pin size={13} strokeWidth={1.5} />}
                  </button>
                  <button onClick={() => deleteReport(r.id)} title="Delete"
                    className="p-1.5 rounded-[6px] transition-all hover:opacity-70"
                    style={{ color: 'var(--text-tertiary)' }}>
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
          Daily reports are generated automatically at 5:00 PM and weekly digests every Monday at 8:00 AM.
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
            <button
              onClick={() => setExpandedId(expanded ? null : report.id)}
              className="w-full flex items-center justify-between p-5 text-left"
              aria-expanded={expanded}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,122,255,0.1)' }}>
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
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Email not sent</span>
                    )}
                  </div>
                </div>
              </div>
              {expanded
                ? <ChevronUp size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                : <ChevronDown size={16} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
            </button>
            {expanded && (
              <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
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
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricCard icon={<Clock size={20} strokeWidth={1.5} />} label="This Week"
          value={`${data.totalWeekHours}h`} sub="Total hours logged this week" color="var(--color-blue)" />
        <MetricCard icon={<TrendingUp size={20} strokeWidth={1.5} />} label="This Month"
          value={`${data.totalMonthHours}h`} sub="Total hours logged this month" color="var(--color-purple)" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-5">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Hours by Person (This Week)</h2>
          {data.byPersonWeek.length === 0
            ? <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No entries this week</p>
            : <div className="flex flex-col gap-3">{data.byPersonWeek.map(r => (
                <BarRow key={r.userId ?? r.name} label={r.name} count={r.hours} max={maxWeek} color="var(--color-blue)" />
              ))}</div>}
        </div>
        <div className="glass-card p-5">
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Hours by Person (This Month)</h2>
          {data.byPersonMonth.length === 0
            ? <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No entries this month</p>
            : <div className="flex flex-col gap-3">{data.byPersonMonth.map(r => (
                <BarRow key={r.userId ?? r.name} label={r.name} count={r.hours} max={maxMonth} color="var(--color-purple)" />
              ))}</div>}
        </div>
      </div>
      <div className="glass-card p-5 mb-6">
        <h2 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Hours by Project (This Month)</h2>
        {data.byProject.length === 0
          ? <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No project entries this month</p>
          : <div className="flex flex-col gap-3">{data.byProject.map(r => (
              <BarRow key={r.projectId ?? r.projectName} label={r.projectName} count={r.hours} max={maxProject} color="var(--color-green)" />
            ))}</div>}
      </div>
      <div className="flex justify-end">
        <button onClick={() => window.open('/api/reports/time?format=csv', '_blank')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <Download size={14} strokeWidth={1.5} />
          Export CSV
        </button>
      </div>
    </>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, color }: {
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
      <p className="text-[28px] font-bold leading-none mb-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
    </div>
  )
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
