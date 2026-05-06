'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Minus, Check, Calendar } from 'lucide-react'
import { PriorityBadge } from '@/components/ui/Badges'
import { Avatar } from '@/components/layout/Sidebar'
import { formatDate, priorityColor } from '@/lib/utils'
import type { TaskRow } from '../TaskBoardClient'

type SortKey = 'title' | 'priority' | 'status' | 'assigneeName' | 'dueDate' | 'createdAt'
type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
const STATUS_ORDER:   Record<string, number>  = { triage: 0, todo: 1, in_progress: 2, review: 3, done: 4 }
const STATUSES = ['triage', 'todo', 'in_progress', 'review', 'done']
const STATUS_LABELS: Record<string, string> = {
  triage: 'Triage', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
}

export function ListView({
  tasks,
  onTaskClick,
  onUpdate,
}: {
  tasks:       TaskRow[]
  onTaskClick: (task: TaskRow) => void
  onUpdate:    (id: string, updates: Partial<TaskRow>) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'priority':     cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99); break
        case 'status':       cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99); break
        case 'dueDate':      cmp = (a.dueDate ?? '9999') < (b.dueDate ?? '9999') ? -1 : 1; break
        case 'assigneeName': cmp = (a.assigneeName ?? '').localeCompare(b.assigneeName ?? ''); break
        case 'title':        cmp = a.title.localeCompare(b.title); break
        case 'createdAt':    cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [tasks, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleAll() {
    if (selected.size === sorted.length) setSelected(new Set())
    else setSelected(new Set(sorted.map(t => t.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function applyBulk() {
    if (!bulkStatus || selected.size === 0) return
    selected.forEach(id => onUpdate(id, { status: bulkStatus }))
    setSelected(new Set())
    setBulkStatus('')
  }

  const allChecked  = selected.size > 0 && selected.size === sorted.length
  const someChecked = selected.size > 0 && selected.size < sorted.length

  return (
    <div style={{ flex: 1, overflow: 'auto', borderRadius: 12 }}>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 mb-2 rounded-[10px]"
          style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)' }}
        >
          <span className="text-[13px] font-semibold" style={{ color: 'var(--color-blue)' }}>
            {selected.size} selected
          </span>
          <select
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
            aria-label="Bulk move to status"
            style={{
              fontSize: 12, padding: '3px 8px', borderRadius: 6,
              background: 'var(--bg-glass)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', outline: 'none',
            }}
          >
            <option value="">Move to…</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button
            onClick={applyBulk}
            disabled={!bulkStatus}
            className="text-[12px] font-semibold px-3 py-1 rounded-[6px] disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
          >
            Apply
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] ml-auto transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr
            style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)',
              position: 'sticky', top: 0, zIndex: 1,
            }}
          >
            <th style={{ width: 40, padding: '8px 12px' }}>
              <Checkbox checked={allChecked} indeterminate={someChecked} onChange={toggleAll} />
            </th>
            <SortTh label="Title"    sortKey="title"        active={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortTh label="Priority" sortKey="priority"     active={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortTh label="Status"   sortKey="status"       active={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortTh label="Assignee" sortKey="assigneeName" active={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortTh label="Due Date" sortKey="dueDate"      active={sortKey} dir={sortDir} onSort={toggleSort} />
            <SortTh label="Created"  sortKey="createdAt"    active={sortKey} dir={sortDir} onSort={toggleSort} />
          </tr>
        </thead>

        <tbody>
          {sorted.map((task, i) => {
            const isOverdue  = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
            const isSelected = selected.has(task.id)

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                style={{
                  background: isSelected
                    ? 'rgba(0,122,255,0.06)'
                    : i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => {
                  if (!isSelected)
                    (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(0,0,0,0.03)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLTableRowElement).style.background = isSelected
                    ? 'rgba(0,122,255,0.06)'
                    : i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                }}
              >
                {/* Checkbox */}
                <td style={{ padding: '8px 12px', width: 40 }} onClick={e => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onChange={() => toggleOne(task.id)} />
                </td>

                {/* Title */}
                <td style={{ padding: '10px 12px', maxWidth: 320 }}>
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        width: 3, height: 26, borderRadius: 2, flexShrink: 0,
                        background: priorityColor(task.priority),
                      }}
                    />
                    <span
                      className="text-[13px] font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {task.title}
                    </span>
                  </div>
                </td>

                {/* Priority */}
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <PriorityBadge priority={task.priority} small />
                </td>

                {/* Status — inline select */}
                <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                  <select
                    value={task.status}
                    onChange={e => onUpdate(task.id, { status: e.target.value })}
                    aria-label="Task status"
                    style={{
                      fontSize: 12, fontWeight: 500,
                      padding: '3px 8px', borderRadius: 6,
                      background: 'var(--bg-glass)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </td>

                {/* Assignee */}
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  {task.assigneeName ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar name={task.assigneeName} src={task.assigneeAvatarUrl ?? undefined} size={20} />
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {task.assigneeName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>—</span>
                  )}
                </td>

                {/* Due date */}
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  {task.dueDate ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-[5px]"
                      style={{
                        background: isOverdue ? 'rgba(255,59,48,0.1)' : 'var(--bg-secondary)',
                        color:      isOverdue ? 'var(--color-red)'    : 'var(--text-tertiary)',
                        border:     `1px solid ${isOverdue ? 'rgba(255,59,48,0.2)' : 'var(--border)'}`,
                      }}
                    >
                      <Calendar size={10} strokeWidth={1.5} />
                      {formatDate(task.dueDate)}
                    </span>
                  ) : (
                    <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>—</span>
                  )}
                </td>

                {/* Created */}
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDate(String(task.createdAt))}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div
          className="flex items-center justify-center h-32 text-[14px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          No tasks match the current filters.
        </div>
      )}
    </div>
  )
}

// ─── SortTh ──────────────────────────────────────────────────────────────────

function SortTh({
  label, sortKey, active, dir, onSort,
}: {
  label:   string
  sortKey: SortKey
  active:  SortKey
  dir:     SortDir
  onSort:  (key: SortKey) => void
}) {
  const isActive = active === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        color: isActive ? 'var(--color-blue)' : 'var(--text-tertiary)',
        userSelect: 'none',
      }}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive
          ? dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          : <Minus size={10} style={{ opacity: 0.3 }} />
        }
      </div>
    </th>
  )
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

function Checkbox({
  checked, indeterminate, onChange,
}: {
  checked:        boolean
  indeterminate?: boolean
  onChange:       () => void
}) {
  return (
    <button
      onClick={onChange}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      style={{
        width: 16, height: 16, borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${checked || indeterminate ? 'var(--color-blue)' : 'var(--border)'}`,
        background: checked ? 'var(--color-blue)' : 'transparent',
        flexShrink: 0, cursor: 'pointer',
        transition: 'all 150ms',
      }}
    >
      {checked && <Check size={10} strokeWidth={3} color="#fff" />}
      {indeterminate && !checked && (
        <div style={{ width: 8, height: 2, background: 'var(--color-blue)', borderRadius: 1 }} />
      )}
    </button>
  )
}
