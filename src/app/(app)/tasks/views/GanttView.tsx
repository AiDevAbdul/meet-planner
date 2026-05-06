'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'
import { priorityColor } from '@/lib/utils'
import type { TaskRow } from '../TaskBoardClient'

type ZoomLevel = 'week' | 'month' | 'quarter'

const ZOOM: Record<ZoomLevel, { dayPx: number; visibleDays: number; shift: number; label: string }> = {
  week:    { dayPx: 56, visibleDays: 28,  shift: 7,  label: 'Week'    },
  month:   { dayPx: 26, visibleDays: 90,  shift: 30, label: 'Month'   },
  quarter: { dayPx: 10, visibleDays: 180, shift: 90, label: 'Quarter' },
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const LEFT_W = 256

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000)
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function GanttView({
  tasks,
  onTaskClick,
}: {
  tasks:       TaskRow[]
  onTaskClick: (task: TaskRow) => void
}) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayKey = toKey(today)

  const [zoom, setZoom]           = useState<ZoomLevel>('month')
  const [rangeStart, setRangeStart] = useState(() => addDays(today, -14))

  const { dayPx, visibleDays, shift } = ZOOM[zoom]
  const rangeEnd = addDays(rangeStart, visibleDays)

  // Header day cells
  const headerDays = useMemo(() => {
    const days: Date[] = []
    const cur = new Date(rangeStart)
    while (cur < rangeEnd) {
      days.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return days
  }, [rangeStart, rangeEnd])

  // Group by month for the top header row
  const monthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = []
    for (const day of headerDays) {
      const label = `${MONTH_ABBR[day.getMonth()]} ${day.getFullYear()}`
      if (!groups.length || groups[groups.length-1].label !== label)
        groups.push({ label, count: 1 })
      else
        groups[groups.length-1].count++
    }
    return groups
  }, [headerDays])

  const todayOff = diffDays(today, rangeStart)
  const todayX   = todayOff * dayPx

  function prev() { setRangeStart(d => addDays(d, -shift)) }
  function next() { setRangeStart(d => addDays(d, +shift)) }
  function goToday() { setRangeStart(addDays(today, -14)) }

  const totalW = visibleDays * dayPx

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <button
          onClick={prev}
          className="p-1.5 rounded-[7px] transition-all hover:opacity-80"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          aria-label="Previous period"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <button
          onClick={goToday}
          className="text-[12px] font-medium px-2.5 py-1 rounded-[6px] transition-all hover:opacity-80"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          Today
        </button>
        <button
          onClick={next}
          className="p-1.5 rounded-[7px] transition-all hover:opacity-80"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          aria-label="Next period"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>

        <div className="flex items-center gap-1 ml-auto">
          {(['week','month','quarter'] as ZoomLevel[]).map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className="text-[12px] font-medium px-2.5 py-1 rounded-[6px] transition-all"
              style={{
                background: zoom === z ? 'var(--color-blue)' : 'var(--bg-secondary)',
                color:      zoom === z ? '#fff'               : 'var(--text-secondary)',
                border:     `1px solid ${zoom === z ? 'var(--color-blue)' : 'var(--border)'}`,
              }}
            >
              {ZOOM[z].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div
        style={{
          flex: 1, overflow: 'hidden', display: 'flex',
          borderRadius: 12, border: '1px solid var(--border)',
        }}
      >
        {/* ── Left: task name panel ── */}
        <div
          style={{
            width: LEFT_W, flexShrink: 0,
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg-primary)',
            zIndex: 1,
          }}
        >
          {/* Header spacer */}
          <div
            style={{
              height: 56, flexShrink: 0,
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', paddingLeft: 16,
              background: 'var(--bg-secondary)',
            }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Task
            </span>
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick(task)}
                style={{
                  height: 44, display: 'flex', alignItems: 'center',
                  padding: '0 12px', gap: 8, cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <span
                  style={{
                    width: 3, height: 22, borderRadius: 2, flexShrink: 0,
                    background: priorityColor(task.priority),
                  }}
                />
                <span
                  className="text-[12px] font-medium truncate"
                  style={{ color: 'var(--text-primary)', flex: 1 }}
                  title={task.title}
                >
                  {task.title}
                </span>
                {task.assigneeName && (
                  <Avatar name={task.assigneeName} src={task.assigneeAvatarUrl ?? undefined} size={18} />
                )}
              </div>
            ))}

            {tasks.length === 0 && (
              <div style={{ padding: 24, fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                No tasks
              </div>
            )}
          </div>
        </div>

        {/* ── Right: timeline ── */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <div style={{ width: Math.max(totalW, 400), position: 'relative' }}>

            {/* Month header */}
            <div
              style={{
                height: 28, display: 'flex',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                position: 'sticky', top: 0, zIndex: 2,
              }}
            >
              {monthGroups.map((g, i) => (
                <div
                  key={i}
                  style={{
                    width: g.count * dayPx, flexShrink: 0,
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                    fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                    borderRight: '1px solid var(--border)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {g.label}
                </div>
              ))}
            </div>

            {/* Day header */}
            <div
              style={{
                height: 28, display: 'flex',
                borderBottom: '2px solid var(--border)',
                background: 'var(--bg-secondary)',
                position: 'sticky', top: 28, zIndex: 2,
              }}
            >
              {headerDays.map((day, i) => {
                const isToday   = toKey(day) === todayKey
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                return (
                  <div
                    key={i}
                    style={{
                      width: dayPx, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: isToday ? 700 : 500,
                      color: isToday
                        ? 'var(--color-blue)'
                        : isWeekend ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                      borderRight: '1px solid var(--border)',
                      background: isWeekend ? 'rgba(0,0,0,0.015)' : 'transparent',
                    }}
                  >
                    {dayPx >= 18
                      ? day.getDate()
                      : day.getDate() % 5 === 1
                        ? day.getDate()
                        : ''}
                  </div>
                )
              })}
            </div>

            {/* Task rows + bars */}
            <div style={{ position: 'relative' }}>
              {/* Today vertical line */}
              {todayX >= 0 && todayX <= totalW && (
                <div
                  style={{
                    position: 'absolute',
                    left: todayX + dayPx / 2 - 1,
                    top: 0, bottom: 0, width: 2,
                    background: 'var(--color-blue)',
                    opacity: 0.5,
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
              )}

              {tasks.map(task => {
                const created  = new Date(task.createdAt)
                const dueDate  = task.dueDate ? new Date(task.dueDate) : null

                const startOff = diffDays(created,  rangeStart)
                const endOff   = dueDate
                  ? diffDays(dueDate, rangeStart)
                  : startOff + 3

                const barLeft  = Math.max(0, startOff) * dayPx
                const barRight = Math.min(visibleDays, endOff + 1) * dayPx
                const barW     = Math.max(barRight - barLeft, dayPx)

                const inView   = endOff >= 0 && startOff <= visibleDays
                const isOverdue = dueDate && dueDate < today && task.status !== 'done'
                const isDone    = task.status === 'done'

                const color = isDone
                  ? 'var(--color-green)'
                  : isOverdue
                    ? 'var(--color-red)'
                    : priorityColor(task.priority)

                return (
                  <div
                    key={task.id}
                    style={{
                      height: 44, position: 'relative',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {/* Weekend shading */}
                    {headerDays.map((day, i) => {
                      if (day.getDay() !== 0 && day.getDay() !== 6) return null
                      return (
                        <div
                          key={i}
                          style={{
                            position: 'absolute', left: i * dayPx,
                            width: dayPx, top: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.01)',
                            pointerEvents: 'none',
                          }}
                        />
                      )
                    })}

                    {/* Task bar */}
                    {inView && (
                      <button
                        onClick={() => onTaskClick(task)}
                        title={`${task.title}${task.dueDate ? ` — Due ${task.dueDate}` : ' (no due date)'}`}
                        aria-label={`Task: ${task.title}`}
                        style={{
                          position: 'absolute',
                          left: barLeft, width: barW,
                          height: 26, borderRadius: 6,
                          background: `${color}22`,
                          border: `1.5px solid ${color}55`,
                          cursor: 'pointer', zIndex: 1,
                          display: 'flex', alignItems: 'center',
                          paddingLeft: 7, overflow: 'hidden',
                          transition: 'opacity 150ms',
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.75')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                      >
                        <span style={{
                          fontSize: 11, fontWeight: 500, color,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {task.title}
                        </span>
                      </button>
                    )}
                  </div>
                )
              })}

              {tasks.length === 0 && (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  No tasks to display
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
