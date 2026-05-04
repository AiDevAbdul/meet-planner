import { format, parseISO, isValid } from 'date-fns'

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = parseISO(dateStr)
  return isValid(d) ? format(d, 'MMM d, yyyy') : '—'
}

export function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return formatDate(dateStr)
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function priorityColor(p: string): string {
  const map: Record<string, string> = {
    critical: 'var(--color-red)',
    high:     'var(--color-orange)',
    normal:   'var(--color-blue)',
    low:      'var(--color-yellow)',
  }
  return map[p] ?? 'var(--color-blue)'
}
