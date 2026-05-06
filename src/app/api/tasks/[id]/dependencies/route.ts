import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { taskDependencies, tasks } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'

// GET /api/tasks/[id]/dependencies — list dependencies for a task
// Returns { blockedBy: Task[], blocks: Task[] }
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: taskId } = await params

  // Tasks that block this task (this task depends on them)
  const blockedByRows = await db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.dependsOnTaskId, tasks.id))
    .where(eq(taskDependencies.taskId, taskId))

  // Tasks that this task blocks (they depend on this task)
  const blocksRows = await db
    .select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.taskId, tasks.id))
    .where(eq(taskDependencies.dependsOnTaskId, taskId))

  return NextResponse.json({ blockedBy: blockedByRows, blocks: blocksRows })
}
