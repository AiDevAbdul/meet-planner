import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// POST /api/tasks/[id]/approve — move task from triage to todo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Fetch current task to verify it's in triage
  const [existing] = await db
    .select({ id: tasks.id, status: tasks.status })
    .from(tasks)
    .where(eq(tasks.id, id))

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  if (existing.status !== 'triage') {
    return NextResponse.json(
      { error: `Task is in '${existing.status}', not triage` },
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(tasks)
    .set({ status: 'todo', updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning()

  return NextResponse.json(updated)
}
