import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, users, departments, projects } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const projectId    = sp.get('projectId')
  const status       = sp.get('status')
  const priority     = sp.get('priority')
  const assigneeId   = sp.get('assigneeId')

  const conditions: ReturnType<typeof eq>[] = []
  if (projectId)  conditions.push(eq(tasks.projectId, projectId))
  if (status && status !== 'all')   conditions.push(eq(tasks.status, status as any))
  if (priority && priority !== 'all') conditions.push(eq(tasks.priority, priority as any))
  if (assigneeId && assigneeId !== 'all') conditions.push(eq(tasks.assigneeId, assigneeId))

  const rows = await db
    .select({
      title:         tasks.title,
      description:   tasks.description,
      status:        tasks.status,
      priority:      tasks.priority,
      dueDate:       tasks.dueDate,
      assigneeEmail: users.email,
      assigneeName:  users.name,
      projectName:   projects.name,
      createdAt:     tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(users,    eq(tasks.assigneeId, users.id))
    .leftJoin(projects, eq(tasks.projectId,  projects.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tasks.createdAt)

  const header = ['title', 'description', 'status', 'priority', 'due_date', 'assignee_email', 'assignee_name', 'project', 'created_at']
  const escCsv = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = [
    header.join(','),
    ...rows.map(r => [
      r.title, r.description, r.status, r.priority, r.dueDate,
      r.assigneeEmail, r.assigneeName, r.projectName, r.createdAt,
    ].map(escCsv).join(',')),
  ]

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="tasks-${Date.now()}.csv"`,
    },
  })
}
