import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { meetingRequests, users } from '@/lib/db/schema'
import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/google/gmail'

// Vercel Cron: every 15 minutes — finds meetings starting in ~30 min, sends reminders
export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now     = new Date()
  const in25min = new Date(now.getTime() + 25 * 60_000)
  const in35min = new Date(now.getTime() + 35 * 60_000)

  // Find approved/sent meetings starting in the 25-35 min window that haven't been reminded yet
  const upcoming = await db
    .select()
    .from(meetingRequests)
    .where(
      and(
        or(eq(meetingRequests.status, 'approved'), eq(meetingRequests.status, 'sent')),
        gte(meetingRequests.proposedTime, in25min),
        lte(meetingRequests.proposedTime, in35min),
        isNull(meetingRequests.reminderSentAt),
      )
    )

  if (upcoming.length === 0) {
    return NextResponse.json({ reminded: 0 })
  }

  let reminded = 0

  for (const request of upcoming) {
    const attendeeIds = [request.createdBy, ...(request.attendeeIds ?? [])]
    const uniqueIds   = [...new Set(attendeeIds)]

    const attendees = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(inArray(users.id, uniqueIds))

    const proposedDate = new Date(request.proposedTime)

    // In-app notifications
    await Promise.all(attendees.map(u =>
      createNotification(u.id, 'meeting_reminder', {
        requestId:    request.id,
        requestTitle: request.title,
        startTime:    proposedDate.toISOString(),
      })
    ))

    // Email reminders
    const hasGoogleConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
    if (hasGoogleConfig) {
      try {
        await sendEmail({
          to:      attendees.map(u => u.email),
          subject: `Reminder: "${request.title}" starts in 30 minutes`,
          html: `
            <h2>Meeting Reminder</h2>
            <p><strong>${request.title}</strong> starts in approximately 30 minutes.</p>
            <p><strong>Time:</strong> ${proposedDate.toLocaleString()}</p>
            <p><strong>Duration:</strong> ${request.durationMinutes} minutes</p>
            ${request.location ? `<p><strong>Location:</strong> ${request.location}</p>` : ''}
          `,
        })
      } catch (err) {
        console.error('[cron] Failed to send reminder email for', request.id, err)
      }
    }

    // Mark reminder as sent
    await db
      .update(meetingRequests)
      .set({ reminderSentAt: new Date() })
      .where(eq(meetingRequests.id, request.id))

    reminded++
  }

  return NextResponse.json({ reminded })
}
