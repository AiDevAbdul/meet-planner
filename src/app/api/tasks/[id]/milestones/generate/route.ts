import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateMilestones } from '@/lib/ai/generateMilestones'

// POST /api/tasks/[id]/milestones/generate — AI-suggest milestones
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: taskId } = await params

  const [task] = await db
    .select({ title: tasks.title, description: tasks.description })
    .from(tasks)
    .where(eq(tasks.id, taskId))

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const suggestions = await generateMilestones(task.title, task.description)

  return NextResponse.json(suggestions)
}
