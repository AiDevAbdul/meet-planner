'use client'

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'rgba(255,59,48,0.12)',  text: 'var(--color-red)',    label: 'Critical' },
  high:     { bg: 'rgba(255,149,0,0.12)',   text: 'var(--color-orange)', label: 'High' },
  normal:   { bg: 'rgba(0,122,255,0.12)',   text: 'var(--color-blue)',   label: 'Normal' },
  low:      { bg: 'rgba(255,204,0,0.12)',   text: '#B8860B',             label: 'Low' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  triage:      { bg: 'rgba(175,82,222,0.12)', text: 'var(--color-purple)', label: 'Triage' },
  todo:        { bg: 'rgba(0,122,255,0.12)',  text: 'var(--color-blue)',   label: 'To Do' },
  in_progress: { bg: 'rgba(255,149,0,0.12)', text: 'var(--color-orange)', label: 'In Progress' },
  review:      { bg: 'rgba(88,86,214,0.12)', text: 'var(--color-indigo)', label: 'Review' },
  done:        { bg: 'rgba(52,199,89,0.12)', text: 'var(--color-green)',  label: 'Done' },
}

export function PriorityBadge({ priority, small }: { priority: string; small?: boolean }) {
  const cfg = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.normal
  return (
    <span
      className="inline-flex items-center font-medium"
      style={{
        background: cfg.bg,
        color: cfg.text,
        fontSize: small ? 10 : 12,
        padding: small ? '2px 5px' : '3px 8px',
        borderRadius: 6,
      }}
    >
      {cfg.label}
    </span>
  )
}

export function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.todo
  return (
    <span
      className="inline-flex items-center font-medium whitespace-nowrap"
      style={{
        background: cfg.bg,
        color: cfg.text,
        fontSize: small ? 10 : 12,
        padding: small ? '2px 5px' : '3px 8px',
        borderRadius: 6,
      }}
    >
      {cfg.label}
    </span>
  )
}
