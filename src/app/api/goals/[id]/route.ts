import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { goals, keyResults, goalTaskLinks, tasks, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [goal] = await db
    .select({
      id:          goals.id,
      title:       goals.title,
      description: goals.description,
      level:       goals.level,
      status:      goals.status,
      ownerId:     goals.ownerId,
      teamId:      goals.teamId,
      startDate:   goals.startDate,
      endDate:     goals.endDate,
      parentGoalId: goals.parentGoalId,
      createdBy:   goals.createdBy,
      createdAt:   goals.createdAt,
      updatedAt:   goals.updatedAt,
      ownerName:   users.name,
      ownerImage:  users.image,
    })
    .from(goals)
    .leftJoin(users, eq(goals.ownerId, users.id))
    .where(eq(goals.id, id))

  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const krs = await db
    .select()
    .from(keyResults)
    .where(eq(keyResults.goalId, id))
    .orderBy(keyResults.createdAt)

  const links = await db
    .select({
      keyResultId: goalTaskLinks.keyResultId,
      taskId:      goalTaskLinks.taskId,
      taskTitle:   tasks.title,
      taskStatus:  tasks.status,
    })
    .from(goalTaskLinks)
    .leftJoin(tasks, eq(goalTaskLinks.taskId, tasks.id))
    .where(eq(goalTaskLinks.goalId, id))

  return NextResponse.json({ ...goal, keyResults: krs, taskLinks: links })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const { title, description, level, ownerId, teamId, status, startDate, endDate, parentGoalId } = body

  const [row] = await db
    .update(goals)
    .set({
      ...(title !== undefined       && { title: title.trim() }),
      ...(description !== undefined && { description }),
      ...(level !== undefined       && { level }),
      ...(ownerId !== undefined     && { ownerId }),
      ...(teamId !== undefined      && { teamId }),
      ...(status !== undefined      && { status }),
      ...(startDate !== undefined   && { startDate }),
      ...(endDate !== undefined     && { endDate }),
      ...(parentGoalId !== undefined && { parentGoalId }),
      updatedAt: new Date(),
    })
    .where(eq(goals.id, id))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(goals).where(eq(goals.id, id))
  return new NextResponse(null, { status: 204 })
}
