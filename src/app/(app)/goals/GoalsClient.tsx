'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target, Plus, ChevronDown, ChevronRight, Pencil, Trash2,
  Building2, Users, User, CheckCircle2, Circle, Pause, X,
  TrendingUp, Calendar, Loader2, Flag, Link2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalLevel  = 'company' | 'team' | 'individual'
type GoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
type KRMetric   = 'number' | 'percentage' | 'currency' | 'boolean'

type GoalRow = {
  id:           string
  title:        string
  description:  string | null
  level:        GoalLevel
  status:       GoalStatus
  ownerId:      string | null
  teamId:       string | null
  startDate:    string | null
  endDate:      string | null
  parentGoalId: string | null
  createdBy:    string | null
  createdAt:    Date | string
  ownerName:    string | null
  ownerImage:   string | null
}

type KRRow = {
  id:           string
  goalId:       string
  title:        string
  metricType:   KRMetric
  targetValue:  number
  currentValue: number
  unit:         string | null
  startDate:    string | null
  dueDate:      string | null
  createdAt:    Date | string
  updatedAt:    Date | string
}

type UserOption = { id: string; name: string; image: string | null; role: string }
type DeptOption = { id: string; name: string; color: string | null }

type Props = {
  initialGoals:      GoalRow[]
  initialKeyResults: KRRow[]
  allUsers:          UserOption[]
  allDepts:          DeptOption[]
  currentUserId:     string
  currentUserRole:   string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_ICONS: Record<GoalLevel, React.ElementType> = {
  company:    Building2,
  team:       Users,
  individual: User,
}

const LEVEL_COLORS: Record<GoalLevel, string> = {
  company:    'var(--color-blue)',
  team:       'var(--color-purple)',
  individual: 'var(--color-green)',
}

const STATUS_COLORS: Record<GoalStatus, string> = {
  draft:      'var(--text-tertiary)',
  active:     'var(--color-green)',
  paused:     'var(--color-orange)',
  completed:  'var(--color-blue)',
  cancelled:  'var(--color-red)',
}

const METRIC_LABELS: Record<KRMetric, string> = {
  number:     '#',
  percentage: '%',
  currency:   '$',
  boolean:    'done',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function krProgress(kr: KRRow): number {
  if (kr.metricType === 'boolean') return kr.currentValue >= 1 ? 100 : 0
  if (kr.targetValue === 0) return 0
  return Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100))
}

function goalProgress(goalId: string, krs: KRRow[]): number {
  const goalKrs = krs.filter(k => k.goalId === goalId)
  if (goalKrs.length === 0) return 0
  const avg = goalKrs.reduce((s, k) => s + krProgress(k), 0) / goalKrs.length
  return Math.round(avg)
}

function formatKRValue(kr: KRRow): string {
  if (kr.metricType === 'boolean') return kr.currentValue >= 1 ? 'Done' : 'Not done'
  if (kr.metricType === 'currency') return `$${kr.currentValue.toLocaleString()} / $${kr.targetValue.toLocaleString()}`
  if (kr.metricType === 'percentage') return `${kr.currentValue}% / ${kr.targetValue}%`
  const unit = kr.unit ? ` ${kr.unit}` : ''
  return `${kr.currentValue}${unit} / ${kr.targetValue}${unit}`
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', flex: 1 }}>
      <div
        style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: pct >= 100 ? 'var(--color-green)' : pct >= 60 ? color : 'var(--color-orange)',
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

// ─── KR Form ──────────────────────────────────────────────────────────────────

function KRForm({
  goalId, initial, onSave, onCancel,
}: {
  goalId:   string
  initial?: Partial<KRRow>
  onSave:   (kr: KRRow) => void
  onCancel: () => void
}) {
  const [title,        setTitle]        = useState(initial?.title        ?? '')
  const [metricType,   setMetricType]   = useState<KRMetric>(initial?.metricType ?? 'percentage')
  const [targetValue,  setTargetValue]  = useState(String(initial?.targetValue  ?? 100))
  const [currentValue, setCurrentValue] = useState(String(initial?.currentValue ?? 0))
  const [unit,         setUnit]         = useState(initial?.unit ?? '')
  const [dueDate,      setDueDate]      = useState(initial?.dueDate ?? '')
  const [saving, startSaving] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startSaving(async () => {
      const body = {
        title, metricType,
        targetValue:  parseInt(targetValue)  || 0,
        currentValue: parseInt(currentValue) || 0,
        unit:         unit || null,
        dueDate:      dueDate || null,
      }

      const res = initial?.id
        ? await fetch(`/api/key-results/${initial.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/goals/${goalId}/key-results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      if (res.ok) onSave(await res.json())
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{
      padding: '12px 16px',
      background: 'var(--glass-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      marginTop: 8,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <input
        required
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Key result title…"
        style={{
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 7, padding: '6px 10px', fontSize: 14,
          color: 'var(--text-primary)', width: '100%',
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          value={metricType}
          onChange={e => setMetricType(e.target.value as KRMetric)}
          style={{
            background: 'var(--glass-bg)', border: '1px solid var(--border)',
            borderRadius: 7, padding: '6px 10px', fontSize: 13, color: 'var(--text-primary)',
          }}
        >
          <option value="percentage">Percentage</option>
          <option value="number">Number</option>
          <option value="currency">Currency</option>
          <option value="boolean">Boolean</option>
        </select>
        {metricType !== 'boolean' && (
          <>
            <input
              type="number"
              value={currentValue}
              onChange={e => setCurrentValue(e.target.value)}
              placeholder="Current"
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 7, padding: '6px 10px', fontSize: 13,
                color: 'var(--text-primary)', width: 90,
              }}
            />
            <input
              type="number"
              value={targetValue}
              onChange={e => setTargetValue(e.target.value)}
              placeholder="Target"
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 7, padding: '6px 10px', fontSize: 13,
                color: 'var(--text-primary)', width: 90,
              }}
            />
            <input
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="Unit"
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 7, padding: '6px 10px', fontSize: 13,
                color: 'var(--text-primary)', width: 80,
              }}
            />
          </>
        )}
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 7, padding: '6px 10px', fontSize: 13,
            color: 'var(--text-primary)',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer',
            background: 'var(--color-blue)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          {saving && <Loader2 size={13} className="animate-spin" />}
          {initial?.id ? 'Update' : 'Add KR'}
        </button>
      </div>
    </form>
  )
}

// ─── Goal Form Modal ──────────────────────────────────────────────────────────

function GoalModal({
  initial, allUsers, allDepts, goals: allGoals,
  onSave, onClose,
}: {
  initial?:  Partial<GoalRow>
  allUsers:  UserOption[]
  allDepts:  DeptOption[]
  goals:     GoalRow[]
  onSave:    (g: GoalRow) => void
  onClose:   () => void
}) {
  const [title,        setTitle]        = useState(initial?.title       ?? '')
  const [description,  setDescription]  = useState(initial?.description ?? '')
  const [level,        setLevel]        = useState<GoalLevel>(initial?.level  ?? 'company')
  const [status,       setStatus]       = useState<GoalStatus>(initial?.status ?? 'active')
  const [ownerId,      setOwnerId]      = useState(initial?.ownerId     ?? '')
  const [teamId,       setTeamId]       = useState(initial?.teamId      ?? '')
  const [startDate,    setStartDate]    = useState(initial?.startDate   ?? '')
  const [endDate,      setEndDate]      = useState(initial?.endDate     ?? '')
  const [parentGoalId, setParentGoalId] = useState(initial?.parentGoalId ?? '')
  const [saving, startSaving] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startSaving(async () => {
      const body = {
        title, description: description || null, level, status,
        ownerId:      ownerId      || null,
        teamId:       teamId       || null,
        startDate:    startDate    || null,
        endDate:      endDate      || null,
        parentGoalId: parentGoalId || null,
      }
      const res = initial?.id
        ? await fetch(`/api/goals/${initial.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          })
        : await fetch('/api/goals', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          })
      if (res.ok) onSave(await res.json())
    })
  }

  const parentOptions = allGoals.filter(g => g.id !== initial?.id)

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: 520, maxHeight: '90vh',
        overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            {initial?.id ? 'Edit Goal' : 'New Goal'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Title *</label>
            <input
              required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Increase ARR by 40%"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', fontSize: 14, color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="What does success look like?"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', fontSize: 14, color: 'var(--text-primary)', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Level</label>
              <select value={level} onChange={e => setLevel(e.target.value as GoalLevel)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--glass-bg)', fontSize: 14, color: 'var(--text-primary)' }}>
                <option value="company">Company</option>
                <option value="team">Team</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as GoalStatus)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--glass-bg)', fontSize: 14, color: 'var(--text-primary)' }}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Owner</label>
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--glass-bg)', fontSize: 14, color: 'var(--text-primary)' }}>
                <option value="">— none —</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Team / Dept</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--glass-bg)', fontSize: 14, color: 'var(--text-primary)' }}>
                <option value="">— none —</option>
                {allDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', fontSize: 14, color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', fontSize: 14, color: 'var(--text-primary)' }} />
            </div>
          </div>

          {parentOptions.length > 0 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Parent Goal</label>
              <select value={parentGoalId} onChange={e => setParentGoalId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--glass-bg)', fontSize: 14, color: 'var(--text-primary)' }}>
                <option value="">— top level —</option>
                {parentOptions.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '8px 18px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                background: 'var(--color-blue)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial?.id ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── KR Update Modal ──────────────────────────────────────────────────────────

function KRUpdateModal({ kr, onSave, onClose }: { kr: KRRow; onSave: (kr: KRRow) => void; onClose: () => void }) {
  const [currentValue, setCurrentValue] = useState(String(kr.currentValue))
  const [saving, startSaving] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startSaving(async () => {
      const res = await fetch(`/api/key-results/${kr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentValue: parseInt(currentValue) || 0 }),
      })
      if (res.ok) onSave(await res.json())
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: 360, border: '1px solid var(--border)', boxShadow: '0 16px 40px rgba(0,0,0,0.2)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Update Progress</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{kr.title}</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {kr.metricType === 'boolean' ? (
              <select value={currentValue} onChange={e => setCurrentValue(e.target.value)}
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--glass-bg)', fontSize: 14, color: 'var(--text-primary)' }}>
                <option value="0">Not done</option>
                <option value="1">Done</option>
              </select>
            ) : (
              <input
                type="number"
                value={currentValue}
                onChange={e => setCurrentValue(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', fontSize: 14, color: 'var(--text-primary)' }}
              />
            )}
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              / {kr.targetValue} {METRIC_LABELS[kr.metricType]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: 'var(--color-blue)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              {saving && <Loader2 size={12} className="animate-spin" />}
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal, krs, allUsers, allDepts, allGoals,
  onGoalUpdate, onGoalDelete, onKRUpdate,
}: {
  goal:         GoalRow
  krs:          KRRow[]
  allUsers:     UserOption[]
  allDepts:     DeptOption[]
  allGoals:     GoalRow[]
  onGoalUpdate: (g: GoalRow) => void
  onGoalDelete: (id: string) => void
  onKRUpdate:   (kr: KRRow) => void
}) {
  const [expanded,    setExpanded]    = useState(true)
  const [showEdit,    setShowEdit]    = useState(false)
  const [showAddKR,   setShowAddKR]   = useState(false)
  const [editingKR,   setEditingKR]   = useState<KRRow | null>(null)
  const [updatingKR,  setUpdatingKR]  = useState<KRRow | null>(null)
  const [, startTrans] = useTransition()

  const goalKRs = krs.filter(k => k.goalId === goal.id)
  const pct     = goalProgress(goal.id, krs)
  const LevelIcon = LEVEL_ICONS[goal.level]

  async function deleteGoal() {
    if (!confirm('Delete this goal and all its key results?')) return
    await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
    onGoalDelete(goal.id)
  }

  async function deleteKR(krId: string) {
    if (!confirm('Delete this key result?')) return
    await fetch(`/api/key-results/${krId}`, { method: 'DELETE' })
    onKRUpdate({ ...krs.find(k => k.id === krId)!, id: '__deleted__' + krId })
  }

  return (
    <>
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}>
        {/* Goal header */}
        <div
          style={{
            padding: '14px 16px',
            borderLeft: `4px solid ${LEVEL_COLORS[goal.level]}`,
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(e => !e)}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <LevelIcon size={18} style={{ color: LEVEL_COLORS[goal.level], flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{goal.title}</span>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
                  background: STATUS_COLORS[goal.status] + '22',
                  color: STATUS_COLORS[goal.status],
                }}>
                  {goal.status}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
                  background: LEVEL_COLORS[goal.level] + '22',
                  color: LEVEL_COLORS[goal.level],
                }}>
                  {goal.level}
                </span>
              </div>
              {goal.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
                  {goal.description}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <ProgressBar pct={pct} color={LEVEL_COLORS[goal.level]} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>{pct}%</span>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                {goal.ownerName && (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    Owner: <span style={{ color: 'var(--text-secondary)' }}>{goal.ownerName}</span>
                  </span>
                )}
                {goal.endDate && (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    Due: <span style={{ color: 'var(--text-secondary)' }}>{goal.endDate}</span>
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {goalKRs.length} key result{goalKRs.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowEdit(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)' }}
                title="Edit goal"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={deleteGoal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-red)' }}
                title="Delete goal"
              >
                <Trash2 size={14} />
              </button>
              {expanded ? <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />}
            </div>
          </div>
        </div>

        {/* Key Results */}
        {expanded && (
          <div style={{ padding: '0 16px 14px 16px', borderTop: '1px solid var(--border)' }}>
            {goalKRs.length === 0 && !showAddKR && (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '12px 0' }}>
                No key results yet.
              </p>
            )}
            {goalKRs.map(kr => {
              const p = krProgress(kr)
              if (editingKR?.id === kr.id) {
                return (
                  <KRForm
                    key={kr.id}
                    goalId={goal.id}
                    initial={kr}
                    onSave={updated => { onKRUpdate(updated); setEditingKR(null) }}
                    onCancel={() => setEditingKR(null)}
                  />
                )
              }
              return (
                <div key={kr.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: p >= 100 ? 'var(--color-green)' : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p >= 100
                      ? <CheckCircle2 size={16} style={{ color: '#fff' }} />
                      : <TrendingUp size={14} style={{ color: 'var(--text-tertiary)' }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{kr.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <ProgressBar pct={p} color="var(--color-blue)" />
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{formatKRValue(kr)}</span>
                    </div>
                    {kr.dueDate && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Due {kr.dueDate}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setUpdatingKR(kr)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-blue)' }}
                      title="Update progress"
                    >
                      <TrendingUp size={13} />
                    </button>
                    <button
                      onClick={() => setEditingKR(kr)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)' }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => deleteKR(kr.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-red)' }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}

            {showAddKR ? (
              <KRForm
                goalId={goal.id}
                onSave={kr => { onKRUpdate(kr); setShowAddKR(false) }}
                onCancel={() => setShowAddKR(false)}
              />
            ) : (
              <button
                onClick={() => setShowAddKR(true)}
                style={{
                  marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-blue)', fontSize: 13, fontWeight: 500,
                }}
              >
                <Plus size={14} />
                Add Key Result
              </button>
            )}
          </div>
        )}
      </div>

      {showEdit && (
        <GoalModal
          initial={goal}
          allUsers={allUsers}
          allDepts={allDepts}
          goals={allGoals}
          onSave={updated => { onGoalUpdate(updated); setShowEdit(false) }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {updatingKR && (
        <KRUpdateModal
          kr={updatingKR}
          onSave={updated => { onKRUpdate(updated); setUpdatingKR(null) }}
          onClose={() => setUpdatingKR(null)}
        />
      )}
    </>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────

const LEVEL_TABS: { value: GoalLevel | 'all'; label: string }[] = [
  { value: 'all',        label: 'All Goals' },
  { value: 'company',    label: 'Company' },
  { value: 'team',       label: 'Team' },
  { value: 'individual', label: 'Individual' },
]

export function GoalsClient({
  initialGoals, initialKeyResults, allUsers, allDepts, currentUserId, currentUserRole,
}: Props) {
  const router = useRouter()
  const [goals,       setGoals]       = useState<GoalRow[]>(initialGoals)
  const [krs,         setKRs]         = useState<KRRow[]>(initialKeyResults)
  const [levelFilter, setLevelFilter] = useState<GoalLevel | 'all'>('all')
  const [statusFilter,setStatusFilter]= useState<GoalStatus | 'all'>('all')
  const [showCreate,  setShowCreate]  = useState(false)

  function handleGoalSave(g: GoalRow) {
    setGoals(prev => {
      const idx = prev.findIndex(x => x.id === g.id)
      if (idx >= 0) {
        const next = [...prev]
        // Merge ownerName back (API PATCH doesn't return joined fields)
        next[idx] = { ...prev[idx], ...g }
        return next
      }
      return [...prev, g]
    })
    setShowCreate(false)
  }

  function handleGoalDelete(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id))
    setKRs(prev => prev.filter(k => k.goalId !== id))
  }

  function handleKRUpdate(kr: KRRow) {
    if (kr.id.startsWith('__deleted__')) {
      const realId = kr.id.replace('__deleted__', '')
      setKRs(prev => prev.filter(k => k.id !== realId))
      return
    }
    setKRs(prev => {
      const idx = prev.findIndex(k => k.id === kr.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = kr; return n }
      return [...prev, kr]
    })
  }

  const filtered = goals.filter(g => {
    if (levelFilter  !== 'all' && g.level  !== levelFilter)  return false
    if (statusFilter !== 'all' && g.status !== statusFilter) return false
    return true
  })

  // Totals for header
  const activeCount    = goals.filter(g => g.status === 'active').length
  const completedCount = goals.filter(g => g.status === 'completed').length
  const overallPct     = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + goalProgress(g.id, krs), 0) / goals.length)
    : 0

  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager'

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Goals & OKRs</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {activeCount} active · {completedCount} completed · {overallPct}% overall progress
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: 'var(--color-blue)', color: '#fff', border: 'none',
              borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            New Goal
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Level tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: 3 }}>
          {LEVEL_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setLevelFilter(t.value as any)}
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 13, border: 'none', cursor: 'pointer',
                background: levelFilter === t.value ? 'var(--color-blue)' : 'transparent',
                color:      levelFilter === t.value ? '#fff'              : 'var(--text-secondary)',
                fontWeight: levelFilter === t.value ? 600                 : 400,
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          style={{
            padding: '6px 10px', borderRadius: 9, border: '1px solid var(--border)',
            background: 'var(--glass-bg)', fontSize: 13, color: 'var(--text-secondary)',
          }}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Goals List */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          color: 'var(--text-tertiary)', fontSize: 14,
        }}>
          <Target size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0 }}>No goals found.</p>
          {canManage && (
            <button onClick={() => setShowCreate(true)}
              style={{ marginTop: 12, color: 'var(--color-blue)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              Create your first goal
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              krs={krs}
              allUsers={allUsers}
              allDepts={allDepts}
              allGoals={goals}
              onGoalUpdate={handleGoalSave}
              onGoalDelete={handleGoalDelete}
              onKRUpdate={handleKRUpdate}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <GoalModal
          allUsers={allUsers}
          allDepts={allDepts}
          goals={goals}
          onSave={handleGoalSave}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
