import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { taskDependencies, tasks } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

// POST /api/task-dependencies — add a dependency (taskId is blocked by dependsOnTaskId)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId, dependsOnTaskId } = await req.json()

  if (!taskId || !dependsOnTaskId) {
    return NextResponse.json({ error: 'taskId and dependsOnTaskId are required' }, { status: 400 })
  }

  if (taskId === dependsOnTaskId) {
    return NextResponse.json({ error: 'A task cannot depend on itself' }, { status: 400 })
  }

  // Check for circular dependency (A blocked_by B and B blocked_by A)
  const [circular] = await db
    .select({ taskId: taskDependencies.taskId })
    .from(taskDependencies)
    .where(and(eq(taskDependencies.taskId, dependsOnTaskId), eq(taskDependencies.dependsOnTaskId, taskId)))

  if (circular) {
    return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 })
  }

  const [dep] = await db
    .insert(taskDependencies)
    .values({ taskId, dependsOnTaskId })
    .onConflictDoNothing()
    .returning()

  return NextResponse.json(dep ?? { taskId, dependsOnTaskId }, { status: 201 })
}

// DELETE /api/task-dependencies — remove a dependency
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId, dependsOnTaskId } = await req.json()

  if (!taskId || !dependsOnTaskId) {
    return NextResponse.json({ error: 'taskId and dependsOnTaskId are required' }, { status: 400 })
  }

  await db
    .delete(taskDependencies)
    .where(and(eq(taskDependencies.taskId, taskId), eq(taskDependencies.dependsOnTaskId, dependsOnTaskId)))

  return NextResponse.json({ success: true })
}
