import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetingRequests, users } from '@/lib/db/schema'
import { desc, eq, inArray, or } from 'drizzle-orm'
import { createNotification } from '@/lib/notifications'

// ─── GET /api/meeting-requests ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // optional filter

  const isManagerOrAdmin = ['admin', 'manager'].includes(
    (await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1))[0]?.role ?? ''
  )

  const rows = await db
    .select({
      id:                    meetingRequests.id,
      title:                 meetingRequests.title,
      agenda:                meetingRequests.agenda,
      proposedTime:          meetingRequests.proposedTime,
      durationMinutes:       meetingRequests.durationMinutes,
      location:              meetingRequests.location,
      attendeeIds:           meetingRequests.attendeeIds,
      status:                meetingRequests.status,
      createdBy:             meetingRequests.createdBy,
      reviewedBy:            meetingRequests.reviewedBy,
      reviewNote:            meetingRequests.reviewNote,
      googleCalendarEventId: meetingRequests.googleCalendarEventId,
      createdAt:             meetingRequests.createdAt,
      updatedAt:             meetingRequests.updatedAt,
      creatorName:           users.name,
      creatorEmail:          users.email,
      creatorAvatarUrl:      users.avatarUrl,
    })
    .from(meetingRequests)
    .leftJoin(users, eq(meetingRequests.createdBy, users.id))
    .where(
      !isManagerOrAdmin
        ? eq(meetingRequests.createdBy, session.user.id)
        : undefined
    )
    .orderBy(desc(meetingRequests.createdAt))

  const filtered = status
    ? rows.filter(r => r.status === status)
    : rows

  // Enrich with attendee details
  const allAttendeeIds = [...new Set(filtered.flatMap(r => r.attendeeIds ?? []))]
  let attendeeMap: Record<string, { id: string; name: string; email: string; avatarUrl: string | null }> = {}

  if (allAttendeeIds.length > 0) {
    const attendeeRows = await db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.id, allAttendeeIds))
    for (const a of attendeeRows) attendeeMap[a.id] = a
  }

  const enriched = filtered.map(r => ({
    ...r,
    attendees: (r.attendeeIds ?? []).map(id => attendeeMap[id]).filter(Boolean),
  }))

  return NextResponse.json({ data: enriched })
}

// ─── POST /api/meeting-requests ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, agenda, proposedTime, durationMinutes = 60, location, attendeeIds = [], status = 'pending_review' } = body as {
    title: string
    agenda?: string
    proposedTime: string
    durationMinutes?: number
    location?: string
    attendeeIds?: string[]
    status?: 'draft' | 'pending_review'
  }

  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })
  if (!proposedTime)   return NextResponse.json({ error: 'proposedTime is required' }, { status: 400 })

  const [row] = await db
    .insert(meetingRequests)
    .values({
      title:          title.trim(),
      agenda:         agenda?.trim() ?? null,
      proposedTime:   new Date(proposedTime),
      durationMinutes,
      location:       location?.trim() ?? null,
      attendeeIds,
      status:         status as 'draft' | 'pending_review',
      createdBy:      session.user.id,
    })
    .returning()

  // Notify all managers/admins when submitted for review
  if (status === 'pending_review') {
    const managers = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.role, 'admin'), eq(users.role, 'manager')))

    await Promise.all(managers.map(m =>
      createNotification(m.id, 'meeting_request_submitted', {
        requestId:    row.id,
        requestTitle: row.title,
        requesterName: session.user.name ?? '',
      })
    ))
  }

  return NextResponse.json({ data: row }, { status: 201 })
}
