import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { milestones } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// PATCH /api/milestones/[id] — update a milestone
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  const allowed = ['title', 'dueDate', 'status'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Track completedAt when marking complete
  if (updates.status === 'completed') {
    updates.completedAt = new Date()
  } else if (updates.status === 'pending' || updates.status === 'in_progress') {
    updates.completedAt = null
  }

  updates.updatedAt = new Date()

  const [updated] = await db
    .update(milestones)
    .set(updates as any)
    .where(eq(milestones.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

// DELETE /api/milestones/[id] — delete a milestone
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(milestones)
    .where(eq(milestones.id, id))
    .returning({ id: milestones.id })

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
