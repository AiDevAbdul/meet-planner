import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, tasks, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ─── GET /api/meetings/:id ────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1)

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const meetingTasks = await db
    .select({
      id:          tasks.id,
      title:       tasks.title,
      description: tasks.description,
      priority:    tasks.priority,
      status:      tasks.status,
      assigneeId:  tasks.assigneeId,
      dueDate:     tasks.dueDate,
      position:    tasks.position,
      createdAt:   tasks.createdAt,
      updatedAt:   tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.meetingId, id))
    .orderBy(tasks.position)

  // Attach assignee names
  const assigneeIds = [...new Set(meetingTasks.map(t => t.assigneeId).filter(Boolean))] as string[]
  let assigneeMap: Record<string, { name: string; email: string; avatarUrl: string | null }> = {}

  if (assigneeIds.length > 0) {
    const assignees = await db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, assigneeIds[0])) // simple case; for multiple use inArray

    // For multiple IDs, iterate
    const allAssignees = await Promise.all(
      assigneeIds.map(aid =>
        db.select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.id, aid))
          .limit(1)
      )
    )
    for (const rows of allAssignees) {
      if (rows[0]) assigneeMap[rows[0].id] = rows[0]
    }
  }

  const enrichedTasks = meetingTasks.map(t => ({
    ...t,
    assignee: t.assigneeId ? (assigneeMap[t.assigneeId] ?? null) : null,
  }))

  return NextResponse.json({ meeting, tasks: enrichedTasks })
}
