import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { milestones } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

// GET /api/tasks/[id]/milestones — list milestones for a task
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: taskId } = await params

  const rows = await db
    .select()
    .from(milestones)
    .where(eq(milestones.taskId, taskId))
    .orderBy(asc(milestones.createdAt))

  return NextResponse.json(rows)
}

// POST /api/tasks/[id]/milestones — create a milestone
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: taskId } = await params
  const body = await req.json()
  const { title, dueDate, aiSuggested } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const [milestone] = await db
    .insert(milestones)
    .values({
      taskId,
      title:       title.trim(),
      dueDate:     dueDate ?? null,
      status:      'pending',
      createdBy:   session.user.id,
      aiSuggested: aiSuggested ?? false,
    })
    .returning()

  return NextResponse.json(milestone, { status: 201 })
}
