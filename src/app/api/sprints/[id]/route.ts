import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sprints, tasks } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id))
  if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [totalRow]  = await db.select({ value: count() }).from(tasks).where(eq(tasks.sprintId, id))
  const [doneRow]   = await db.select({ value: count() }).from(tasks).where(and(eq(tasks.sprintId, id), eq(tasks.status, 'done')))
  const sprintTasks = await db.select().from(tasks).where(eq(tasks.sprintId, id))

  return NextResponse.json({
    ...sprint,
    taskCount:  Number(totalRow?.value ?? 0),
    doneCount:  Number(doneRow?.value ?? 0),
    tasks:      sprintTasks,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const [updated] = await db.update(sprints)
    .set({
      name:      body.name,
      goal:      body.goal,
      startDate: body.startDate,
      endDate:   body.endDate,
      status:    body.status,
      updatedAt: new Date(),
    })
    .where(eq(sprints.id, id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(sprints).where(eq(sprints.id, id))
  return NextResponse.json({ ok: true })
}
