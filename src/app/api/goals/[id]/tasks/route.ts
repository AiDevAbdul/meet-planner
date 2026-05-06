import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { goalTaskLinks } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: goalId } = await params
  const { keyResultId, taskId } = await req.json()

  if (!keyResultId || !taskId)
    return NextResponse.json({ error: 'keyResultId and taskId required' }, { status: 400 })

  const [row] = await db
    .insert(goalTaskLinks)
    .values({ goalId, keyResultId, taskId })
    .onConflictDoNothing()
    .returning()

  return NextResponse.json(row ?? {}, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: goalId } = await params
  const { keyResultId, taskId } = await req.json()

  await db
    .delete(goalTaskLinks)
    .where(and(
      eq(goalTaskLinks.goalId, goalId),
      eq(goalTaskLinks.keyResultId, keyResultId),
      eq(goalTaskLinks.taskId, taskId),
    ))

  return new NextResponse(null, { status: 204 })
}
