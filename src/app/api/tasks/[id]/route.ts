import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  type TaskUpdate = {
    title?: string
    description?: string
    priority?: 'critical' | 'high' | 'normal' | 'low'
    status?: 'triage' | 'todo' | 'in_progress' | 'review' | 'done'
    assigneeId?: string | null
    dueDate?: string | null
    updatedAt?: Date
  }

  const allowedFields = ['title', 'description', 'priority', 'status', 'assigneeId', 'dueDate'] as const
  const updates: TaskUpdate = {}
  for (const field of allowedFields) {
    if (field in body) {
      (updates as Record<string, unknown>)[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updatedAt = new Date()

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json({ task: updated })
}

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning({ id: tasks.id })

  if (!deleted) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
