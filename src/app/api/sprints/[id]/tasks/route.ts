import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, users, sprints } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'

// GET /api/sprints/[id]/tasks — tasks in sprint
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select({
      id:           tasks.id,
      title:        tasks.title,
      status:       tasks.status,
      priority:     tasks.priority,
      dueDate:      tasks.dueDate,
      assigneeId:   tasks.assigneeId,
      assigneeName: users.name,
      createdAt:    tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.sprintId, id))

  return NextResponse.json(rows)
}

// POST /api/sprints/[id]/tasks — add task to sprint (body: { taskId })
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { taskId } = await req.json()

  const [updated] = await db.update(tasks)
    .set({ sprintId: id, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning()

  return NextResponse.json(updated)
}

// DELETE /api/sprints/[id]/tasks?taskId= — remove task from sprint
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const [updated] = await db.update(tasks)
    .set({ sprintId: null, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.sprintId, id)))
    .returning()

  return NextResponse.json(updated)
}
