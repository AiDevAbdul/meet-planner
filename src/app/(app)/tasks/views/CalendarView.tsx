'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { priorityColor } from '@/lib/utils'
import type { TaskRow } from '../TaskBoardClient'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function CalendarView({
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

  const todayKey = toDateKey(today)

  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )

  // dueDate → tasks for quick lookup
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskRow[]> = {}
    for (const task of tasks) {
      if (!task.dueDate) continue
      const key = task.dueDate.split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(task)
    }
    return map
  }, [tasks])

  // Build weeks array for the visible month
  const weeks = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const last  = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)

    const start = new Date(first)
    start.setDate(start.getDate() - start.getDay())

    const end = new Date(last)
    end.setDate(end.getDate() + (6 - end.getDay()))

    const all: Date[] = []
    const cur = new Date(start)
    while (cur <= end) {
      all.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }

    const result: Date[][] = []
    for (let i = 0; i < all.length; i += 7) result.push(all.slice(i, i + 7))
    return result
  }, [viewDate])

  const currentMonth = viewDate.getMonth()

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
  function goToday()   { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)) }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h2>
          <button
            onClick={goToday}
            className="text-[12px] font-medium px-2.5 py-1 rounded-[6px] transition-all hover:opacity-80"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-[7px] transition-all hover:opacity-80"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            aria-label="Previous month"
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-[7px] transition-all hover:opacity-80"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            aria-label="Next month"
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          marginBottom: 2, flexShrink: 0,
        }}
      >
        {DAYS.map(d => (
          <div
            key={d}
            style={{
              padding: '5px 0', textAlign: 'center',
              fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          gap: 1, overflow: 'hidden',
          borderRadius: 12, border: '1px solid var(--border)',
          background: 'var(--border)',
        }}
      >
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, flex: 1 }}
          >
            {week.map((day, di) => {
              const key         = toDateKey(day)
              const dayTasks    = tasksByDate[key] ?? []
              const isToday     = key === todayKey
              const isOtherMo   = day.getMonth() !== currentMonth
              const isWeekend   = day.getDay() === 0 || day.getDay() === 6

              return (
                <div
                  key={di}
                  style={{
                    background: isToday
                      ? 'rgba(0,122,255,0.05)'
                      : isOtherMo
                        ? 'var(--bg-secondary)'
                        : isWeekend
                          ? 'rgba(0,0,0,0.01)'
                          : 'var(--bg-primary)',
                    padding: '6px 8px',
                    minHeight: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Day number */}
                  <div style={{ flexShrink: 0, marginBottom: 3 }}>
                    <span
                      style={{
                        display:      'inline-flex',
                        alignItems:   'center',
                        justifyContent: 'center',
                        width:        isToday ? 22 : 'auto',
                        height:       isToday ? 22 : 'auto',
                        borderRadius: isToday ? '50%' : 0,
                        background:   isToday ? 'var(--color-blue)' : 'transparent',
                        fontSize:     12,
                        fontWeight:   isToday ? 700 : 500,
                        color:        isToday
                          ? '#fff'
                          : isOtherMo
                            ? 'var(--text-tertiary)'
                            : 'var(--text-primary)',
                      }}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Task chips */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                    {dayTasks.slice(0, 3).map(task => (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        title={task.title}
                        aria-label={`Task: ${task.title}`}
                        style={{
                          display:      'block',
                          width:        '100%',
                          textAlign:    'left',
                          padding:      '2px 5px',
                          borderRadius: 4,
                          fontSize:     11,
                          fontWeight:   500,
                          lineHeight:   1.4,
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace:   'nowrap',
                          background:   `${priorityColor(task.priority)}20`,
                          color:        priorityColor(task.priority),
                          border:       `1px solid ${priorityColor(task.priority)}30`,
                          cursor:       'pointer',
                          transition:   'opacity 150ms',
                          flexShrink:   0,
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', padding: '0 2px' }}>
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
