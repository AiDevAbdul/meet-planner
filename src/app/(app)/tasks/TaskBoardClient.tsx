'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, GripVertical, Calendar, SlidersHorizontal, ChevronDown,
  Kanban, List, GanttChart, CalendarDays,
} from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badges'
import { Avatar } from '@/components/layout/Sidebar'
import { formatDate, priorityColor, cn } from '@/lib/utils'
import { TaskDetailPanel } from './TaskDetailPanel'
import { AddTaskModal } from './AddTaskModal'
import { ListView }     from './views/ListView'
import { GanttView }    from './views/GanttView'
import { CalendarView } from './views/CalendarView'

type ViewType = 'kanban' | 'list' | 'gantt' | 'calendar'

const VIEW_OPTIONS: { id: ViewType; icon: React.ReactNode; label: string }[] = [
  { id: 'kanban',   icon: <Kanban      size={15} strokeWidth={1.75} />, label: 'Kanban'   },
  { id: 'list',     icon: <List        size={15} strokeWidth={1.75} />, label: 'List'     },
  { id: 'gantt',    icon: <GanttChart  size={15} strokeWidth={1.75} />, label: 'Gantt'    },
  { id: 'calendar', icon: <CalendarDays size={15} strokeWidth={1.75} />, label: 'Calendar' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskRow = {
  id:           string
  title:        string
  description:  string | null
  priority:     string
  status:       string
  assigneeId:   string | null
  createdBy:    string | null
  meetingId:    string | null
  departmentId: string | null
  dueDate:      string | null
  position:     number | null
  createdAt:    Date | string
  updatedAt:    Date | string
  assigneeName:      string | null
  assigneeEmail:     string | null
  assigneeAvatarUrl: string | null
  milestoneTotal?: number | null
  milestoneDone?:  number | null
}

export type UserRow = {
  id:        string
  name:      string
  email:     string
  avatarUrl: string | null
}

export type DeptRow = {
  id:   string
  name: string
  slug: string
}

type Props = {
  initialTasks:  TaskRow[]
  users:         UserRow[]
  departments:   DeptRow[]
  currentUserId: string
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: 'triage',      label: 'Triage',      color: 'var(--color-purple)' },
  { id: 'todo',        label: 'To Do',       color: 'var(--color-blue)'   },
  { id: 'in_progress', label: 'In Progress', color: 'var(--color-orange)' },
  { id: 'review',      label: 'Review',      color: 'var(--color-indigo)' },
  { id: 'done',        label: 'Done',        color: 'var(--color-green)'  },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function TaskBoardClient({ initialTasks, users, departments, currentUserId }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [taskList,      setTaskList]      = useState<TaskRow[]>(initialTasks)
  const [activeTask,    setActiveTask]    = useState<TaskRow | null>(null)
  const [selectedTask,  setSelectedTask]  = useState<TaskRow | null>(null)
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [viewType,      setViewType]      = useState<ViewType>(() => {
    if (typeof window === 'undefined') return 'kanban'
    return (localStorage.getItem('tasks:view') as ViewType) ?? 'kanban'
  })

  function switchView(v: ViewType) {
    setViewType(v)
    localStorage.setItem('tasks:view', v)
  }

  // Filters — from URL search params
  const filterPriority   = searchParams.get('priority')   ?? 'all'
  const filterAssignee   = searchParams.get('assignee')   ?? 'all'
  const filterDept       = searchParams.get('department') ?? 'all'

  // Open task detail if ?task=ID in URL
  useEffect(() => {
    const taskId = searchParams.get('task')
    if (taskId) {
      const found = taskList.find(t => t.id === taskId)
      if (found) setSelectedTask(found)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selectedTask in sync with taskList edits
  useEffect(() => {
    if (selectedTask) {
      const updated = taskList.find(t => t.id === selectedTask.id)
      if (updated) setSelectedTask(updated)
    }
  }, [taskList]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered task list
  const filteredTasks = taskList.filter(t => {
    if (filterPriority !== 'all' && t.priority     !== filterPriority)   return false
    if (filterAssignee !== 'all' && t.assigneeId   !== filterAssignee)   return false
    if (filterDept     !== 'all' && t.departmentId !== filterDept)       return false
    return true
  })

  // ── URL filter helpers ─────────────────────────────────────────────────────

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete(key)
    else params.set(key, value)
    startTransition(() => router.replace(`/tasks?${params.toString()}`, { scroll: false }))
  }

  // ── DnD sensors ────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = taskList.find(t => t.id === event.active.id)
    setActiveTask(task ?? null)
  }, [taskList])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId   = over.id   as string

    // Check if dropped over a column header (column id)
    const overColumn = COLUMNS.find(c => c.id === overId)
    if (overColumn) {
      setTaskList(prev =>
        prev.map(t => t.id === activeId ? { ...t, status: overColumn.id } : t)
      )
      return
    }

    // Dropped over another task
    const overTask = taskList.find(t => t.id === overId)
    if (!overTask) return

    setTaskList(prev => {
      const activeIdx = prev.findIndex(t => t.id === activeId)
      const overIdx   = prev.findIndex(t => t.id === overId)
      if (activeIdx === -1 || overIdx === -1) return prev

      const updated = [...prev]
      // Move to over task's column
      updated[activeIdx] = { ...updated[activeIdx], status: overTask.status }
      return arrayMove(updated, activeIdx, overIdx)
    })
  }, [taskList])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return
    const activeId = active.id as string

    const task = taskList.find(t => t.id === activeId)
    if (!task) return

    // Persist status + position change to API
    try {
      const tasksInColumn = taskList
        .filter(t => t.status === task.status)
        .map((t, i) => ({ id: t.id, position: i }))

      // Update all positions in column
      await Promise.all(
        tasksInColumn.map(({ id, position }) =>
          fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position }),
          })
        )
      )

      // Ensure status is persisted for the dragged task
      await fetch(`/api/tasks/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: task.status }),
      })
    } catch {
      // Silently fail — optimistic update already applied
    }
  }, [taskList])

  // ── Task mutations (called from detail panel & card) ───────────────────────

  const updateTask = useCallback(async (id: string, updates: Partial<TaskRow>) => {
    // Optimistic update
    setTaskList(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))

    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      // Revert (reload from server is simpler)
      router.refresh()
    }
  }, [router])

  const deleteTask = useCallback(async (id: string) => {
    setTaskList(prev => prev.filter(t => t.id !== id))
    setSelectedTask(null)

    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }, [])

  const addTask = useCallback((task: TaskRow) => {
    setTaskList(prev => [task, ...prev])
    setShowAddModal(false)
  }, [])

  const approveTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      const updated = await res.json()
      setTaskList(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t))
    }
  }, [])

  const openTask = useCallback((task: TaskRow) => {
    setSelectedTask(task)
    const params = new URLSearchParams(searchParams.toString())
    params.set('task', task.id)
    startTransition(() => router.replace(`/tasks?${params.toString()}`, { scroll: false }))
  }, [router, searchParams])

  const closePanel = useCallback(() => {
    setSelectedTask(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('task')
    startTransition(() => router.replace(`/tasks?${params.toString()}`, { scroll: false }))
  }, [router, searchParams])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px - 48px)', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between flex-shrink-0 mb-4"
        style={{ paddingBottom: 0 }}
      >
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>
            Tasks
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div
            className="flex items-center gap-0.5 p-1 rounded-[10px]"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            {VIEW_OPTIONS.map(v => (
              <button
                key={v.id}
                onClick={() => switchView(v.id)}
                aria-label={`Switch to ${v.label} view`}
                title={v.label}
                style={{
                  display:      'flex', alignItems: 'center', justifyContent: 'center',
                  width:        32, height: 28, borderRadius: 7,
                  background:   viewType === v.id ? 'var(--bg-primary)' : 'transparent',
                  color:        viewType === v.id ? 'var(--color-blue)' : 'var(--text-tertiary)',
                  boxShadow:    viewType === v.id ? 'var(--shadow-sm)' : 'none',
                  transition:   'all 150ms',
                  cursor:       'pointer',
                }}
              >
                {v.icon}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 font-semibold text-[14px] px-4 py-2.5 rounded-[10px] transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
            aria-label="Add new task"
          >
            <Plus size={16} strokeWidth={2} />
            Add Task
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <FilterBar
        filterPriority={filterPriority}
        filterAssignee={filterAssignee}
        filterDept={filterDept}
        users={users}
        departments={departments}
        setFilter={setFilter}
      />

      {/* ── Views ── */}

      {/* List view */}
      {viewType === 'list' && (
        <ListView
          tasks={filteredTasks}
          onTaskClick={openTask}
          onUpdate={updateTask}
        />
      )}

      {/* Gantt view */}
      {viewType === 'gantt' && (
        <GanttView
          tasks={filteredTasks}
          onTaskClick={openTask}
        />
      )}

      {/* Calendar view */}
      {viewType === 'calendar' && (
        <CalendarView
          tasks={filteredTasks}
          onTaskClick={openTask}
        />
      )}

      {/* Kanban board */}
      {viewType === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex gap-3 flex-1 overflow-x-auto pb-4"
            style={{ marginTop: 12 }}
          >
            {COLUMNS.map(col => {
              const colTasks = filteredTasks
                .filter(t => t.status === col.id)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={colTasks}
                  onTaskClick={openTask}
                  onApprove={col.id === 'triage' ? approveTask : undefined}
                  currentUserId={currentUserId}
                  onStatusChange={(id, status) => updateTask(id, { status })}
                />
              )
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                onClick={() => {}}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Detail panel ── */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          users={users}
          onClose={closePanel}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}

      {/* ── Add modal ── */}
      {showAddModal && (
        <AddTaskModal
          users={users}
          departments={departments}
          onClose={() => setShowAddModal(false)}
          onCreated={addTask}
        />
      )}
    </div>
  )
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({
  filterPriority, filterAssignee, filterDept,
  users, departments,
  setFilter,
}: {
  filterPriority: string
  filterAssignee: string
  filterDept:     string
  users:          UserRow[]
  departments:    DeptRow[]
  setFilter:      (key: string, value: string) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
      <SlidersHorizontal size={15} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />

      <FilterSelect
        label="Priority"
        value={filterPriority}
        onChange={v => setFilter('priority', v)}
        options={[
          { value: 'all',      label: 'All priorities' },
          { value: 'critical', label: 'Critical' },
          { value: 'high',     label: 'High' },
          { value: 'normal',   label: 'Normal' },
          { value: 'low',      label: 'Low' },
        ]}
      />

      <FilterSelect
        label="Assignee"
        value={filterAssignee}
        onChange={v => setFilter('assignee', v)}
        options={[
          { value: 'all', label: 'All assignees' },
          ...users.map(u => ({ value: u.id, label: u.name })),
        ]}
      />

      <FilterSelect
        label="Department"
        value={filterDept}
        onChange={v => setFilter('department', v)}
        options={[
          { value: 'all', label: 'All departments' },
          ...departments.map(d => ({ value: d.id, label: d.name })),
        ]}
      />

      {(filterPriority !== 'all' || filterAssignee !== 'all' || filterDept !== 'all') && (
        <button
          onClick={() => {
            setFilter('priority', 'all')
            setFilter('assignee', 'all')
            setFilter('department', 'all')
          }}
          className="text-[12px] font-medium px-2.5 py-1 rounded-[6px] transition-all hover:opacity-80"
          style={{ color: 'var(--color-red)', background: 'rgba(255,59,48,0.08)' }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  options:  { value: string; label: string }[]
}) {
  const active = value !== 'all'
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        style={{
          appearance:  'none',
          WebkitAppearance: 'none',
          background:  active ? 'rgba(0,122,255,0.08)' : 'var(--bg-glass)',
          border:      `1px solid ${active ? 'var(--color-blue)' : 'var(--border)'}`,
          borderRadius: 8,
          color:       active ? 'var(--color-blue)' : 'var(--text-secondary)',
          fontSize:    13,
          fontWeight:  active ? 600 : 400,
          padding:     '5px 26px 5px 10px',
          cursor:      'pointer',
          outline:     'none',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        size={12}
        strokeWidth={2}
        style={{
          position: 'absolute', right: 8, top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: active ? 'var(--color-blue)' : 'var(--text-tertiary)',
        }}
      />
    </div>
  )
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  column, tasks, onTaskClick, onApprove, currentUserId, onStatusChange,
}: {
  column:          { id: string; label: string; color: string }
  tasks:           TaskRow[]
  onTaskClick:     (task: TaskRow) => void
  onApprove?:      (id: string) => void
  currentUserId:   string
  onStatusChange:  (id: string, status: string) => void
}) {
  return (
    <div
      style={{
        width:        272,
        minWidth:     272,
        flexShrink:   0,
        display:      'flex',
        flexDirection: 'column',
        maxHeight:    '100%',
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center gap-2 mb-2 px-1"
        style={{ flexShrink: 0 }}
      >
        <span
          style={{
            width:        8,
            height:       8,
            borderRadius: '50%',
            background:   column.color,
            flexShrink:   0,
          }}
        />
        <span
          className="text-[13px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {column.label}
        </span>
        <span
          className="text-[12px] font-medium px-1.5 py-0.5 rounded-full"
          style={{
            background: `${column.color}18`,
            color:      column.color,
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <SortableContext
        id={column.id}
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          id={column.id}
          className="flex flex-col gap-2 flex-1 overflow-y-auto rounded-[12px] p-2"
          style={{
            background:  'var(--bg-secondary)',
            border:      '1px solid var(--border)',
            minHeight:   120,
          }}
        >
          {tasks.map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              onApprove={onApprove}
              currentUserId={currentUserId}
              onStatusChange={onStatusChange}
            />
          ))}

          {tasks.length === 0 && (
            <div
              className="flex items-center justify-center text-[12px] h-20 rounded-[8px]"
              style={{
                color:      'var(--text-tertiary)',
                border:     '1px dashed var(--border)',
              }}
            >
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ─── SortableTaskCard ─────────────────────────────────────────────────────────

function SortableTaskCard({
  task, onClick, onApprove, currentUserId, onStatusChange,
}: {
  task:            TaskRow
  onClick:         (task: TaskRow) => void
  onApprove?:      (id: string) => void
  currentUserId:   string
  onStatusChange:  (id: string, status: string) => void
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity:    isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
        onApprove={onApprove}
        currentUserId={currentUserId}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

export function TaskCard({
  task, onClick, dragHandleProps, isDragging, onApprove, currentUserId, onStatusChange,
}: {
  task:             TaskRow
  onClick:          (task: TaskRow) => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isDragging?:      boolean
  onApprove?:       (id: string) => void
  currentUserId?:   string
  onStatusChange?:  (id: string, status: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'done'

  return (
    <div
      className="glass-card relative cursor-pointer select-none"
      onClick={() => onClick(task)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 14,
        padding:      '10px 12px',
        borderLeft:   `3px solid ${priorityColor(task.priority)}`,
        transform:    hovered && !isDragging ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow:    hovered && !isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transition:   'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
        cursor:       isDragging ? 'grabbing' : 'pointer',
      }}
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(task) }}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        onClick={e => e.stopPropagation()}
        style={{
          position:  'absolute',
          top:       8,
          right:     8,
          opacity:   hovered ? 1 : 0,
          transition: 'opacity 150ms',
          cursor:    'grab',
          color:     'var(--text-tertiary)',
          padding:   2,
        }}
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} strokeWidth={1.5} />
      </div>

      {/* Title */}
      <p
        className="text-[13px] font-semibold leading-snug pr-5 mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {task.title}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={task.priority} small />

          {/* Due date */}
          {task.dueDate && (
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
          )}
        </div>

        {/* Assignee avatar */}
        {task.assigneeName && (
          <Avatar
            name={task.assigneeName}
            src={task.assigneeAvatarUrl ?? undefined}
            size={22}
          />
        )}
      </div>

      {/* Milestone progress bar */}
      {(task.milestoneTotal ?? 0) > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Milestones {task.milestoneDone ?? 0}/{task.milestoneTotal ?? 0}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {Math.round(((task.milestoneDone ?? 0) / (task.milestoneTotal ?? 1)) * 100)}%
            </span>
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height:     '100%',
                width:      `${Math.round(((task.milestoneDone ?? 0) / (task.milestoneTotal ?? 1)) * 100)}%`,
                background: (task.milestoneDone ?? 0) === (task.milestoneTotal ?? 0)
                  ? 'var(--color-green)'
                  : 'var(--color-blue)',
                borderRadius: 2,
                transition:   'width 300ms var(--ease-out)',
              }}
            />
          </div>
        </div>
      )}

      {/* Triage approve button */}
      {task.status === 'triage' && onApprove && (
        <button
          onClick={e => { e.stopPropagation(); onApprove(task.id) }}
          className="mt-2 w-full text-[11px] font-semibold py-1 rounded-[6px] transition-all hover:opacity-90"
          style={{
            background: 'rgba(0,122,255,0.1)',
            color:      'var(--color-blue)',
            border:     '1px solid rgba(0,122,255,0.2)',
          }}
        >
          Approve → To Do
        </button>
      )}

      {/* Assignee quick-action buttons */}
      {task.status === 'todo' && task.assigneeId === currentUserId && onStatusChange && (
        <button
          onClick={e => { e.stopPropagation(); onStatusChange(task.id, 'in_progress') }}
          className="mt-2 w-full text-[11px] font-semibold py-1 rounded-[6px] transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'rgba(255,149,0,0.1)',
            color:      'var(--color-orange)',
            border:     '1px solid rgba(255,149,0,0.2)',
          }}
          aria-label="Start task"
        >
          Start Task
        </button>
      )}
      {task.status === 'in_progress' && task.assigneeId === currentUserId && onStatusChange && (
        <button
          onClick={e => { e.stopPropagation(); onStatusChange(task.id, 'done') }}
          className="mt-2 w-full text-[11px] font-semibold py-1 rounded-[6px] transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'rgba(52,199,89,0.1)',
            color:      'var(--color-green)',
            border:     '1px solid rgba(52,199,89,0.2)',
          }}
          aria-label="Mark task done"
        >
          Mark Done
        </button>
      )}
    </div>
  )
}
