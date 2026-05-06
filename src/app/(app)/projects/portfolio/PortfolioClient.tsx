'use client'

import { useRouter } from 'next/navigation'
import {
  Folder, Users, CheckSquare, Calendar, AlertTriangle,
  TrendingUp, BarChart2, FolderKanban, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning', active: 'Active', on_hold: 'On Hold',
  completed: 'Completed', archived: 'Archived',
}

type ProjectHealth = 'green' | 'yellow' | 'red'

type PortfolioProject = {
  id: string
  name: string
  description: string | null
  status: string
  color: string
  startDate: string | null
  endDate: string | null
  ownerName: string | null
  memberCount: number
  taskTotal: number
  taskDone: number
  overdueTasks: number
  criticalTasks: number
  percentComplete: number
  health: ProjectHealth
  daysRemaining: number | null
}

const HEALTH_COLORS: Record<ProjectHealth, string> = {
  green:  'var(--color-green)',
  yellow: 'var(--color-orange)',
  red:    'var(--color-red)',
}

const HEALTH_LABELS: Record<ProjectHealth, string> = {
  green:  'On Track',
  yellow: 'At Risk',
  red:    'Off Track',
}

function HealthDot({ health }: { health: ProjectHealth }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ background: HEALTH_COLORS[health] }}
      aria-label={HEALTH_LABELS[health]}
    />
  )
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', minWidth: 80 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  )
}

export function PortfolioClient({ projects }: { projects: PortfolioProject[] }) {
  const router = useRouter()

  const activeCount    = projects.filter(p => p.status === 'active').length
  const atRiskCount    = projects.filter(p => p.health === 'yellow' || p.health === 'red').length
  const overdueTotal   = projects.reduce((s, p) => s + p.overdueTasks, 0)
  const avgCompletion  = projects.length > 0
    ? Math.round(projects.reduce((s, p) => s + p.percentComplete, 0) / projects.length)
    : 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>
      <div className="glass-topbar px-6 py-4 flex items-center gap-3" style={{ minHeight: 64 }}>
        <BarChart2 size={20} strokeWidth={1.5} style={{ color: 'var(--color-purple)' }} />
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Portfolio View</h1>
        </div>
        <div className="flex-1" />
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[8px]"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}
        >
          <FolderKanban size={14} />
          All Projects
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Active Projects', value: activeCount, icon: FolderKanban, color: 'var(--color-blue)' },
            { label: 'Avg Completion', value: `${avgCompletion}%`, icon: TrendingUp, color: 'var(--color-green)' },
            { label: 'At Risk', value: atRiskCount, icon: AlertTriangle, color: 'var(--color-orange)' },
            { label: 'Overdue Tasks', value: overdueTotal, icon: Calendar, color: 'var(--color-red)' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} style={{ color }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Portfolio table */}
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Project', 'Health', 'Status', 'Progress', 'Tasks', 'Members', 'Deadline'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                  style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0"
                        style={{ background: `${p.color}18` }}
                      >
                        <Folder size={14} style={{ color: p.color }} />
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-blue-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
                          {p.name}
                        </p>
                        {p.ownerName && (
                          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{p.ownerName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <HealthDot health={p.health} />
                      <span className="text-xs" style={{ color: HEALTH_COLORS[p.health] }}>
                        {HEALTH_LABELS[p.health]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MiniBar pct={p.percentComplete} color={p.color} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {p.percentComplete}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <CheckSquare size={12} />
                      <span>{p.taskDone}/{p.taskTotal}</span>
                      {p.overdueTasks > 0 && (
                        <span
                          className="ml-1 text-[10px] font-medium px-1 py-0.5 rounded"
                          style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--color-red)' }}
                        >
                          {p.overdueTasks} overdue
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      <Users size={12} />
                      {p.memberCount}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.daysRemaining !== null ? (
                      <span
                        className="text-xs"
                        style={{
                          color: p.daysRemaining < 0
                            ? 'var(--color-red)'
                            : p.daysRemaining <= 7
                            ? 'var(--color-orange)'
                            : 'var(--text-secondary)',
                        }}
                      >
                        {p.daysRemaining < 0
                          ? `${Math.abs(p.daysRemaining)}d overdue`
                          : `${p.daysRemaining}d left`}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {projects.length === 0 && (
            <div className="py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
              <p className="text-sm">No projects yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
