import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetingRequests, users } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { createNotification } from '@/lib/notifications'
import { createCalendarEvent } from '@/lib/google/calendar'
import { sendEmail } from '@/lib/google/gmail'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const currentUser = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!['admin', 'manager'].includes(currentUser[0]?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden — managers and admins only' }, { status: 403 })
  }

  const { id } = await params
  const [request] = await db
    .select()
    .from(meetingRequests)
    .where(eq(meetingRequests.id, id))
    .limit(1)

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status === 'approved' || request.status === 'sent') {
    return NextResponse.json({ error: 'Already approved' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const { reviewNote } = body as { reviewNote?: string }

  // Look up attendee emails
  const attendeeUserIds = request.attendeeIds ?? []
  let attendeeEmails: string[] = []

  if (attendeeUserIds.length > 0) {
    const attendeeRows = await db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.id, attendeeUserIds))
    attendeeEmails = attendeeRows.map(r => r.email)
  }

  // Create Google Calendar event (if configured)
  let calendarEventId: string | null = null
  const hasGoogleConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)

  if (hasGoogleConfig) {
    try {
      calendarEventId = await createCalendarEvent({
        title:          request.title,
        description:    request.agenda ?? '',
        startTime:      new Date(request.proposedTime),
        durationMinutes: request.durationMinutes,
        location:       request.location ?? '',
        attendeeEmails,
      })
    } catch (err) {
      console.error('[calendar] Failed to create event:', err)
    }
  }

  // Update request to approved/sent
  const newStatus = calendarEventId ? 'sent' : 'approved'
  const [updated] = await db
    .update(meetingRequests)
    .set({
      status:                newStatus as 'approved' | 'sent',
      reviewedBy:            session.user.id,
      reviewNote:            reviewNote ?? null,
      googleCalendarEventId: calendarEventId,
      updatedAt:             new Date(),
    })
    .where(eq(meetingRequests.id, id))
    .returning()

  // Notify the requester
  await createNotification(request.createdBy, 'meeting_request_approved', {
    requestId:    request.id,
    requestTitle: request.title,
    reviewerName: session.user.name ?? '',
  })

  // Send email to attendees if no Google Calendar (fallback)
  if (!calendarEventId && attendeeEmails.length > 0 && hasGoogleConfig) {
    try {
      const proposedDate = new Date(request.proposedTime)
      await sendEmail({
        to: attendeeEmails,
        subject: `Meeting Scheduled: ${request.title}`,
        html: `
          <h2>${request.title}</h2>
          <p><strong>Date:</strong> ${proposedDate.toLocaleString()}</p>
          <p><strong>Duration:</strong> ${request.durationMinutes} minutes</p>
          ${request.location ? `<p><strong>Location:</strong> ${request.location}</p>` : ''}
          ${request.agenda ? `<p><strong>Agenda:</strong><br>${request.agenda.replace(/\n/g, '<br>')}</p>` : ''}
        `,
      })
    } catch (err) {
      console.error('[gmail] Failed to send invite email:', err)
    }
  }

  return NextResponse.json({ data: updated })
}
