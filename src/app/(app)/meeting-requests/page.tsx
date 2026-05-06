import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetingRequests, users } from '@/lib/db/schema'
import { desc, eq, inArray, or } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { MeetingRequestsClient } from './MeetingRequestsClient'

export const metadata = { title: 'Meeting Requests — MeetPlanner' }

export default async function MeetingRequestsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const currentUser = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const isManagerOrAdmin = ['admin', 'manager'].includes(currentUser[0]?.role ?? '')

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

  // Enrich attendees
  const allAttendeeIds = [...new Set(rows.flatMap(r => r.attendeeIds ?? []))]
  let attendeeMap: Record<string, { id: string; name: string; email: string; avatarUrl: string | null }> = {}

  if (allAttendeeIds.length > 0) {
    const attendeeRows = await db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .where(inArray(users.id, allAttendeeIds))
    for (const a of attendeeRows) attendeeMap[a.id] = a
  }

  const data = rows.map(r => ({
    ...r,
    proposedTime: r.proposedTime.toISOString(),
    createdAt:    r.createdAt.toISOString(),
    updatedAt:    r.updatedAt.toISOString(),
    attendees:    (r.attendeeIds ?? []).map(id => attendeeMap[id]).filter(Boolean),
  }))

  // All team members for the form attendee picker
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .where(or(eq(users.role, 'admin'), eq(users.role, 'manager'), eq(users.role, 'member')))

  return (
    <MeetingRequestsClient
      initialRequests={data}
      allUsers={allUsers}
      currentUserId={session.user.id}
      isManagerOrAdmin={isManagerOrAdmin}
    />
  )
}
