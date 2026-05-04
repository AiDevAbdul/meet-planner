'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckSquare, Clock, MessageSquare, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badges'
import { formatDate } from '@/lib/utils'

type Task = {
  id: string; title: string; status: string;
  priority: string; dueDate: string | null;
}
type Meeting = {
  id: string; title: string; summary: string | null;
  date: string | null; source: string;
}

type Props = {
  tasksDueToday: number
  overdueCount: number | bigint
  unreadCount:  number | bigint
  myTasks:      Task[]
  recentMeetings: Meeting[]
  activityFeed: { id: string; title: string; status: string; updatedAt: Date | null }[]
}

export function DashboardClient({ tasksDueToday, overdueCount, unreadCount, myTasks: initialTasks, recentMeetings, activityFeed }: Props) {
  const [myTasks, setMyTasks] = useState<Task[]>(initialTasks)

  const statCards = [
    { label: 'Tasks Due Today',  value: tasksDueToday,          icon: CheckSquare, color: 'var(--color-blue)' },
    { label: 'Overdue Tasks',    value: Number(overdueCount),   icon: Clock,       color: 'var(--color-red)' },
    { label: 'Unread Messages',  value: Number(unreadCount),    icon: MessageSquare, color: 'var(--color-purple)' },
  ]

  const todo       = myTasks.filter(t => t.status === 'todo')
  const inProgress = myTasks.filter(t => t.status === 'in_progress')
  const done       = myTasks.filter(t => t.status === 'done')

  async function handleStatusChange(id: string, status: string) {
    setMyTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {statCards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* My Tasks (60%) */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                My Tasks
              </h2>
              <Link
                href="/tasks"
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: 'var(--color-blue)' }}
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KanbanLiteCol label="To Do"       tasks={todo}       onStatusChange={handleStatusChange} />
              <KanbanLiteCol label="In Progress"  tasks={inProgress} onStatusChange={handleStatusChange} />
              <KanbanLiteCol label="Done"         tasks={done}       onStatusChange={handleStatusChange} />
            </div>
          </div>
        </div>

        {/* Right panel (40%) */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Recent Meetings */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent Meetings
              </h2>
              <Link href="/meetings" className="text-sm font-medium" style={{ color: 'var(--color-blue)' }}>
                View all
              </Link>
            </div>
            {recentMeetings.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No meetings yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentMeetings.map(m => (
                  <Link
                    key={m.id}
                    href={`/meetings/${m.id}`}
                    className="flex flex-col gap-0.5 p-3 rounded-[10px] transition-all hover:-translate-y-px"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {m.title}
                    </span>
                    {m.summary && (
                      <span className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {m.summary}
                      </span>
                    )}
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {m.date ? formatDate(m.date) : 'Unknown date'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Team Activity */}
          <div className="glass-card p-5">
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Team Activity
            </h2>
            {activityFeed.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No recent activity</p>
            ) : (
              <div className="flex flex-col gap-2">
                {activityFeed.slice(0, 8).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <span className="text-[13px] truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: any; color: string
}) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const duration = 800
    const start    = performance.now()
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(progress * value))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value])

  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon size={22} strokeWidth={1.5} style={{ color }} />
      </div>
      <div>
        <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
          {display}
        </p>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      </div>
    </div>
  )
}

function KanbanLiteCol({
  label, tasks, onStatusChange,
}: {
  label:           string
  tasks:           Task[]
  onStatusChange:  (id: string, status: string) => void
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
        {label} <span style={{ color: 'var(--text-tertiary)' }}>({tasks.length})</span>
      </p>
      <div className="flex flex-col gap-2">
        {tasks.slice(0, 5).map(t => (
          <div
            key={t.id}
            className="p-2.5 rounded-[8px] flex flex-col gap-1.5"
            style={{
              background:      'var(--bg-secondary)',
              border:          '1px solid var(--border)',
              borderLeftWidth: 3,
              borderLeftColor: priorityColor(t.priority),
            }}
          >
            <Link
              href={`/tasks?task=${t.id}`}
              className="flex flex-col gap-1 transition-all hover:opacity-80"
            >
              <span className="text-[12px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                {t.title}
              </span>
              <PriorityBadge priority={t.priority} small />
            </Link>

            {t.status === 'todo' && (
              <button
                onClick={() => onStatusChange(t.id, 'in_progress')}
                className="w-full text-[10px] font-semibold py-0.5 rounded-[5px] transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'rgba(255,149,0,0.1)',
                  color:      'var(--color-orange)',
                  border:     '1px solid rgba(255,149,0,0.2)',
                }}
                aria-label={`Start task: ${t.title}`}
              >
                Start
              </button>
            )}
            {t.status === 'in_progress' && (
              <button
                onClick={() => onStatusChange(t.id, 'done')}
                className="w-full text-[10px] font-semibold py-0.5 rounded-[5px] transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'rgba(52,199,89,0.1)',
                  color:      'var(--color-green)',
                  border:     '1px solid rgba(52,199,89,0.2)',
                }}
                aria-label={`Mark done: ${t.title}`}
              >
                Done
              </button>
            )}
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>None</p>
        )}
      </div>
    </div>
  )
}

function priorityColor(p: string) {
  const map: Record<string, string> = {
    critical: 'var(--color-red)',
    high:     'var(--color-orange)',
    normal:   'var(--color-blue)',
    low:      'var(--color-yellow)',
  }
  return map[p] ?? 'var(--color-blue)'
}
