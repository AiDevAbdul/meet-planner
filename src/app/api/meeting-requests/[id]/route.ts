import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetingRequests, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// ─── GET /api/meeting-requests/:id ───────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [row] = await db
    .select()
    .from(meetingRequests)
    .where(eq(meetingRequests.id, id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: row })
}

// ─── PATCH /api/meeting-requests/:id ─────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [existing] = await db
    .select({ createdBy: meetingRequests.createdBy, status: meetingRequests.status })
    .from(meetingRequests)
    .where(eq(meetingRequests.id, id))
    .limit(1)

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentUser = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const isManagerOrAdmin = ['admin', 'manager'].includes(currentUser[0]?.role ?? '')
  const isOwner = existing.createdBy === session.user.id

  if (!isOwner && !isManagerOrAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, agenda, proposedTime, durationMinutes, location, attendeeIds, status } = body as {
    title?: string
    agenda?: string
    proposedTime?: string
    durationMinutes?: number
    location?: string
    attendeeIds?: string[]
    status?: 'draft' | 'pending_review'
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (title           !== undefined) updates.title           = title
  if (agenda          !== undefined) updates.agenda          = agenda
  if (proposedTime    !== undefined) updates.proposedTime    = new Date(proposedTime)
  if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes
  if (location        !== undefined) updates.location        = location
  if (attendeeIds     !== undefined) updates.attendeeIds     = attendeeIds
  if (status          !== undefined) updates.status          = status

  const [updated] = await db
    .update(meetingRequests)
    .set(updates as any)
    .where(eq(meetingRequests.id, id))
    .returning()

  return NextResponse.json({ data: updated })
}

// ─── DELETE /api/meeting-requests/:id ────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [existing] = await db
    .select({ createdBy: meetingRequests.createdBy })
    .from(meetingRequests)
    .where(eq(meetingRequests.id, id))
    .limit(1)

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const currentUser = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const isManagerOrAdmin = ['admin', 'manager'].includes(currentUser[0]?.role ?? '')
  if (existing.createdBy !== session.user.id && !isManagerOrAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(meetingRequests).where(eq(meetingRequests.id, id))
  return NextResponse.json({ success: true })
}
