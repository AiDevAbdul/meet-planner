import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { timeEntries } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// PATCH /api/time-entries/[id] — update a time entry
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

  const allowed = ['date', 'minutes', 'note', 'billable']
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (updates.minutes !== undefined) {
    updates.minutes = Math.round(Number(updates.minutes))
  }

  const [updated] = await db
    .update(timeEntries)
    .set(updates as any)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, session.user.id)))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  return NextResponse.json(updated)
}

// DELETE /api/time-entries/[id] — delete a time entry
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
    .delete(timeEntries)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, session.user.id)))
    .returning()

  if (!deleted) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
