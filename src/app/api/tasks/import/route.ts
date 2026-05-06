import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const VALID_STATUS   = ['triage', 'todo', 'in_progress', 'review', 'done']
const VALID_PRIORITY = ['critical', 'high', 'normal', 'low']

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const vals: string[] = []
    let cur = '', inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { vals.push(cur); cur = '' }
      else cur += ch
    }
    vals.push(cur)
    return Object.fromEntries(header.map((h, i) => [h, (vals[i] ?? '').trim()]))
  })
}

// POST /api/tasks/import — preview=true returns rows without inserting
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData   = await req.formData()
  const file       = formData.get('file') as File | null
  const projectId  = formData.get('projectId') as string | null
  const preview    = formData.get('preview') === 'true'

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const text = await file.text()
  const rows = parseCsv(text)

  if (rows.length === 0) return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 })
  if (rows.length > 500) return NextResponse.json({ error: 'Max 500 rows per import' }, { status: 400 })

  // Resolve assignee emails → IDs
  const emails = [...new Set(rows.map(r => r.assignee_email).filter(Boolean))]
  const emailMap: Record<string, string> = {}
  if (emails.length > 0) {
    const members = await db.select({ id: users.id, email: users.email }).from(users)
    members.forEach(u => { emailMap[u.email] = u.id })
  }

  const parsed = rows.map((r, i) => ({
    rowNum:      i + 2,
    title:       r.title || r['task title'] || r.name || '',
    description: r.description || r.desc || '',
    status:      VALID_STATUS.includes(r.status)     ? r.status   : 'triage',
    priority:    VALID_PRIORITY.includes(r.priority)  ? r.priority : 'normal',
    dueDate:     r.due_date || r.duedate || null,
    assigneeId:  r.assignee_email ? (emailMap[r.assignee_email] ?? null) : null,
    projectId:   projectId || null,
    error:       !r.title && !r['task title'] && !r.name ? 'Missing title' : null,
  }))

  if (preview) return NextResponse.json({ rows: parsed, total: parsed.length })

  const valid = parsed.filter(r => !r.error)
  if (valid.length === 0) return NextResponse.json({ error: 'No valid rows to import' }, { status: 400 })

  await db.insert(tasks).values(
    valid.map(r => ({
      title:       r.title,
      description: r.description || null,
      status:      r.status as any,
      priority:    r.priority as any,
      dueDate:     r.dueDate || null,
      assigneeId:  r.assigneeId || null,
      projectId:   r.projectId || null,
      createdBy:   session.user!.id,
    }))
  )

  return NextResponse.json({ imported: valid.length, skipped: parsed.length - valid.length })
}
