import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, users } from '@/lib/db/schema'
import { eq, asc, and, isNull } from 'drizzle-orm'

// GET /api/tasks/[id]/subtasks — list subtasks for a parent task
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: parentTaskId } = await params

  const rows = await db
    .select({
      id:          tasks.id,
      title:       tasks.title,
      status:      tasks.status,
      priority:    tasks.priority,
      assigneeId:  tasks.assigneeId,
      dueDate:     tasks.dueDate,
      createdAt:   tasks.createdAt,
      assigneeName:      users.name,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.parentTaskId, parentTaskId))
    .orderBy(asc(tasks.createdAt))

  return NextResponse.json(rows)
}

// POST /api/tasks/[id]/subtasks — create a subtask
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: parentTaskId } = await params
  const body = await req.json()
  const { title, assigneeId, dueDate, priority } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Verify parent task exists
  const [parent] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, parentTaskId))
  if (!parent) {
    return NextResponse.json({ error: 'Parent task not found' }, { status: 404 })
  }

  const [subtask] = await db
    .insert(tasks)
    .values({
      title:        title.trim(),
      parentTaskId,
      assigneeId:   assigneeId ?? null,
      dueDate:      dueDate ?? null,
      priority:     priority ?? 'normal',
      status:       'todo',
      createdBy:    session.user.id,
    })
    .returning()

  return NextResponse.json(subtask, { status: 201 })
}
