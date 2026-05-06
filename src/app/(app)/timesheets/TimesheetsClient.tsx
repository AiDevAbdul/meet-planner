'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Download, Clock, Loader2 } from 'lucide-react'

type TimeEntry = {
  id:          string
  date:        string
  minutes:     number
  note:        string | null
  billable:    boolean
  taskId:      string | null
  taskTitle:   string | null
  projectId:   string | null
  projectName: string | null
}

type DayTotal = { date: string; minutes: number }

type WeekData = {
  weekStart: string
  days:      DayTotal[]
  entries:   TimeEntry[]
}

type TaskOption = { id: string; title: string }

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getMondayOfCurrentWeek(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end   = addDays(start, 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

export function TimesheetsClient() {
  const [weekDate, setWeekDate] = useState<Date>(() => getMondayOfCurrentWeek())
  const [weekData, setWeekData] = useState<WeekData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [tasks,    setTasks]    = useState<TaskOption[]>([])

  // Form state
  const [fDate,     setFDate]     = useState(() => toDateString(new Date()))
  const [fHours,    setFHours]    = useState('')
  const [fNote,     setFNote]     = useState('')
  const [fTaskId,   setFTaskId]   = useState('')
  const [fBillable, setFBillable] = useState(false)
  const [saving,    startSave]    = useTransition()

  const weekStr = toDateString(weekDate)

  const fetchWeek = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/timesheets?week=${weekStr}`)
      if (res.ok) setWeekData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [weekStr])

  useEffect(() => { fetchWeek() }, [fetchWeek])

  // Fetch tasks for selector
  useEffect(() => {
    fetch('/api/tasks?limit=200')
      .then(r => r.ok ? r.json() : [])
      .then((rows: TaskOption[]) => setTasks(Array.isArray(rows) ? rows : []))
      .catch(() => {})
  }, [])

  function prevWeek() { setWeekDate(d => addDays(d, -7)) }
  function nextWeek() { setWeekDate(d => addDays(d, 7)) }
  function goToday()  { setWeekDate(getMondayOfCurrentWeek()) }

  function submitEntry() {
    const hours = parseFloat(fHours)
    if (!fDate || isNaN(hours) || hours <= 0 || !fTaskId) return

    const minutes = Math.round(hours * 60)

    startSave(async () => {
      const res = await fetch(`/api/tasks/${fTaskId}/time-entries`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: fDate, minutes, note: fNote || null, billable: fBillable }),
      })
      if (res.ok) {
        setShowForm(false)
        setFHours('')
        setFNote('')
        setFTaskId('')
        setFBillable(false)
        fetchWeek()
      }
    })
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
    if (res.ok) fetchWeek()
  }

  function exportCsv() {
    window.open('/api/reports/time?format=csv', '_blank')
  }

  const totalWeekMinutes = weekData?.days.reduce((s, d) => s + d.minutes, 0) ?? 0

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-[10px]"
          style={{ background: 'rgba(0,122,255,0.1)' }}
        >
          <Clock size={18} strokeWidth={1.5} style={{ color: 'var(--color-blue)' }} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>Timesheets</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Track time logged per day and task</p>
        </div>
        <div className="flex-1" />
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          aria-label="Export CSV"
        >
          <Download size={14} strokeWidth={1.5} />
          Export CSV
        </button>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-blue)' }}
          aria-label="Log time"
        >
          <Plus size={14} strokeWidth={2} />
          Log Time
        </button>
      </div>

      {/* Week navigator */}
      <div className="glass-card px-5 py-4 mb-5 flex items-center gap-3">
        <button
          onClick={prevWeek}
          className="w-7 h-7 flex items-center justify-center rounded-[7px] transition-all hover:opacity-70"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          aria-label="Previous week"
        >
          <ChevronLeft size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
        </button>

        <span className="text-[15px] font-semibold flex-1 text-center" style={{ color: 'var(--text-primary)' }}>
          {weekData ? formatWeekLabel(weekData.weekStart) : '…'}
        </span>

        <button
          onClick={nextWeek}
          className="w-7 h-7 flex items-center justify-center rounded-[7px] transition-all hover:opacity-70"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          aria-label="Next week"
        >
          <ChevronRight size={15} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
        </button>

        <button
          onClick={goToday}
          className="text-[13px] px-3 py-1.5 rounded-[7px] font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          Today
        </button>

        <div
          className="px-3 py-1 rounded-full text-[12px] font-semibold"
          style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--color-blue)' }}
        >
          {formatHours(totalWeekMinutes)} total
        </div>
      </div>

      {/* Log Time Form */}
      {showForm && (
        <div
          className="glass-card p-5 mb-5"
          style={{ border: '1px solid rgba(0,122,255,0.2)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Log Time Entry</h3>
            <button
              onClick={() => setShowForm(false)}
              className="hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Close form"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Date</label>
              <input
                type="date"
                value={fDate}
                onChange={e => setFDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                aria-label="Date"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Hours (e.g. 1.5)</label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={fHours}
                onChange={e => setFHours(e.target.value)}
                placeholder="1.5"
                className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                aria-label="Hours"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Task (required)</label>
            <select
              value={fTaskId}
              onChange={e => setFTaskId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              aria-label="Task"
            >
              <option value="">Select a task…</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Note (optional)</label>
            <input
              type="text"
              value={fNote}
              onChange={e => setFNote(e.target.value)}
              placeholder="What did you work on?"
              className="w-full px-3 py-2 text-sm rounded-[8px] outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              aria-label="Note"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                onClick={() => setFBillable(v => !v)}
                className="w-4 h-4 rounded border flex items-center justify-center transition-all"
                style={{
                  background:  fBillable ? 'var(--color-blue)' : 'transparent',
                  borderColor: fBillable ? 'var(--color-blue)' : 'var(--border)',
                }}
                aria-label="Toggle billable"
                type="button"
              >
                {fBillable && (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Billable</span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-2 text-sm rounded-[8px]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={submitEntry}
                disabled={saving || !fDate || !fHours || !fTaskId}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-[8px] font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--color-blue)' }}
              >
                {saving && <Loader2 size={12} strokeWidth={2} className="animate-spin" />}
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly grid */}
      {loading ? (
        <div className="glass-card p-10 flex items-center justify-center gap-3">
          <Loader2 size={18} strokeWidth={2} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</span>
        </div>
      ) : weekData ? (
        <>
          {/* Day column headers */}
          <div className="glass-card overflow-hidden mb-4">
            <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)' }}>
              {weekData.days.map((day, i) => {
                const d       = new Date(day.date + 'T00:00:00')
                const isToday = day.date === toDateString(new Date())
                return (
                  <div
                    key={day.date}
                    className="p-3 text-center"
                    style={{
                      borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                      background:  isToday ? 'rgba(0,122,255,0.04)' : 'transparent',
                    }}
                  >
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider mb-0.5"
                      style={{ color: isToday ? 'var(--color-blue)' : 'var(--text-tertiary)' }}
                    >
                      {DAY_NAMES[i]}
                    </p>
                    <p
                      className="text-[13px] font-medium"
                      style={{ color: isToday ? 'var(--color-blue)' : 'var(--text-secondary)' }}
                    >
                      {d.getDate()}
                    </p>
                    {day.minutes > 0 && (
                      <p className="text-[11px] mt-0.5 font-semibold" style={{ color: 'var(--color-green)' }}>
                        {formatHours(day.minutes)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Entries list */}
          {weekData.entries.length === 0 ? (
            <div className="glass-card py-12 flex flex-col items-center gap-3 text-center">
              <Clock size={32} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>No time logged this week</p>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                Click "Log Time" to add your first entry.
              </p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Entries — {weekData.entries.length}
                </span>
              </div>
              {weekData.entries.map((entry, i) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  isLast={i === weekData.entries.length - 1}
                  onDelete={() => deleteEntry(entry.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function EntryRow({
  entry, isLast, onDelete,
}: {
  entry:    TimeEntry
  isLast:   boolean
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Date */}
      <div style={{ width: 80, flexShrink: 0 }}>
        <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Task / Note */}
      <div className="flex-1 min-w-0">
        {entry.taskTitle ? (
          <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {entry.taskTitle}
          </p>
        ) : null}
        {entry.note && (
          <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{entry.note}</p>
        )}
        {entry.projectName && (
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{entry.projectName}</p>
        )}
      </div>

      {/* Billable badge */}
      {entry.billable && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: 'rgba(52,199,89,0.1)', color: 'var(--color-green)', border: '1px solid rgba(52,199,89,0.2)' }}
        >
          Billable
        </span>
      )}

      {/* Hours */}
      <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
        {formatHours(entry.minutes)}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex-shrink-0 transition-opacity hover:opacity-70"
        style={{ opacity: hovered ? 1 : 0, color: 'var(--text-tertiary)' }}
        aria-label="Delete entry"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  )
}
