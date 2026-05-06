import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, users, departments } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

// GET /api/tasks — list tasks with optional filters
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const status       = searchParams.get('status')
  const assigneeId   = searchParams.get('assigneeId')
  const priority     = searchParams.get('priority')
  const departmentId = searchParams.get('departmentId')

  const conditions = []

  if (status && status !== 'all') {
    const statuses = status.split(',')
    if (statuses.length === 1) {
      conditions.push(eq(tasks.status, status as any))
    } else {
      conditions.push(inArray(tasks.status, statuses as any[]))
    }
  }
  if (assigneeId) {
    conditions.push(eq(tasks.assigneeId, assigneeId))
  }
  if (priority) {
    conditions.push(eq(tasks.priority, priority as any))
  }
  if (departmentId) {
    conditions.push(eq(tasks.departmentId, departmentId))
  }

  const rows = await db
    .select({
      id:           tasks.id,
      title:        tasks.title,
      description:  tasks.description,
      priority:     tasks.priority,
      status:       tasks.status,
      assigneeId:   tasks.assigneeId,
      createdBy:    tasks.createdBy,
      meetingId:    tasks.meetingId,
      departmentId: tasks.departmentId,
      projectId:    tasks.projectId,
      dueDate:      tasks.dueDate,
      position:     tasks.position,
      createdAt:    tasks.createdAt,
      updatedAt:    tasks.updatedAt,
      assigneeName:      users.name,
      assigneeEmail:     users.email,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tasks.position, tasks.createdAt)

  return NextResponse.json(rows)
}

// POST /api/tasks — create a new task
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, priority, assigneeId, departmentId, dueDate, meetingId } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const [task] = await db
    .insert(tasks)
    .values({
      title:        title.trim(),
      description:  description ?? null,
      priority:     priority    ?? 'normal',
      status:       'triage',
      assigneeId:   assigneeId   ?? null,
      createdBy:    session.user.id,
      meetingId:    meetingId    ?? null,
      departmentId: departmentId ?? null,
      dueDate:      dueDate      ?? null,
      position:     0,
    })
    .returning()

  return NextResponse.json(task, { status: 201 })
}
