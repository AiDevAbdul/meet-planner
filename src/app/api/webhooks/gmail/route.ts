import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { meetings, meetingMinutes, tasks, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { extractMeeting } from '@/lib/ai/extractMeeting'
import { generateMinutes } from '@/lib/ai/generateMinutes'
import { fetchDriveFileText, extractDriveFileId } from '@/lib/google/drive'
import { createNotification } from '@/lib/notifications'

// ─── POST /api/webhooks/gmail ─────────────────────────────────────────────────
// Receives Gmail push notifications via Google Cloud Pub/Sub.
// The request body is a Pub/Sub message with base64-encoded Gmail notification data.
export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-gmail-webhook-secret')
  if (secret !== process.env.GMAIL_WEBHOOK_SECRET) {
    console.warn('[gmail-webhook] Invalid secret')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    message?: {
      data?: string
      messageId?: string
      publishTime?: string
    }
    subscription?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Decode the base64 Pub/Sub message data
  const encodedData = body?.message?.data
  if (!encodedData) {
    // Acknowledge without processing (empty ping)
    return NextResponse.json({ ok: true })
  }

  let decodedData: {
    emailAddress?: string
    historyId?: string
    subject?: string
    snippet?: string
    body?: string
    rawContent?: string
  }

  try {
    const jsonStr = Buffer.from(encodedData, 'base64').toString('utf-8')
    decodedData = JSON.parse(jsonStr)
  } catch {
    console.error('[gmail-webhook] Failed to decode base64 data')
    return NextResponse.json({ ok: true }) // Acknowledge to avoid retries
  }

  const rawContent = decodedData.rawContent ?? decodedData.body ?? decodedData.snippet

  // ── Google Meet recording email ────────────────────────────────────────────
  const subject = decodedData.subject ?? ''
  if (subject.toLowerCase().includes('recording available')) {
    await handleRecordingEmail(decodedData)
    return NextResponse.json({ ok: true })
  }

  if (!rawContent) {
    return NextResponse.json({ ok: true })
  }

  // Find or create a system user for the webhook (use the email address from the notification)
  const senderEmail = decodedData.emailAddress
  let creatorId: string | null = null
  if (senderEmail) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, senderEmail))
      .limit(1)
    creatorId = user?.id ?? null
  }

  // Insert placeholder meeting
  const [meeting] = await db
    .insert(meetings)
    .values({
      title:      decodedData.subject ?? 'Gmail Meeting (processing…)',
      source:     'gmail',
      rawContent,
      createdBy:  creatorId ?? undefined,
    })
    .returning()

  // Trigger AI extraction asynchronously
  // (In a real prod setup this would be a background job/queue; here we run inline)
  try {
    const roster = await db
      .select({ name: users.name, email: users.email, role: users.role })
      .from(users)

    const extracted = await extractMeeting(rawContent, roster)

    await db
      .update(meetings)
      .set({
        title:     extracted.title,
        summary:   extracted.summary,
        date:      extracted.date ?? null,
        decisions: extracted.decisions,
        attendees: extracted.attendees,
      })
      .where(eq(meetings.id, meeting.id))

    // Map names to user IDs
    const emailToId: Record<string, string> = {}
    const nameToEmail: Record<string, string> = {}
    for (const u of roster) {
      emailToId[u.email.toLowerCase()] = ''
      nameToEmail[u.name.toLowerCase()] = u.email
    }
    const fullUsers = await db.select({ id: users.id, email: users.email }).from(users)
    for (const u of fullUsers) {
      emailToId[u.email.toLowerCase()] = u.id
    }

    if (extracted.tasks.length > 0) {
      const taskValues = extracted.tasks.map((t, i) => {
        let assigneeId: string | null = null
        if (t.assignee_name) {
          const email = nameToEmail[t.assignee_name.toLowerCase()]
          if (email) assigneeId = emailToId[email.toLowerCase()] ?? null
        }
        return {
          title:       t.title,
          description: t.description ?? null,
          priority:    (t.priority ?? 'normal') as 'critical' | 'high' | 'normal' | 'low',
          status:      'triage' as const,
          assigneeId,
          createdBy:   creatorId ?? undefined,
          meetingId:   meeting.id,
          dueDate:     t.due_date ?? null,
          position:    i,
        }
      })
      await db.insert(tasks).values(taskValues)
    }
  } catch (err) {
    console.error('[gmail-webhook] extraction error:', err)
    await db
      .update(meetings)
      .set({ title: 'Gmail Meeting (extraction failed)' })
      .where(eq(meetings.id, meeting.id))
  }

  // Always return 200 to acknowledge the Pub/Sub push
  return NextResponse.json({ ok: true })
}

// ─── Handle Google Meet recording / transcript email ──────────────────────────
async function handleRecordingEmail(data: {
  emailAddress?: string
  subject?: string
  body?: string
  snippet?: string
  rawContent?: string
}) {
  const subject    = data.subject ?? 'Meeting Recording'
  const emailBody  = data.rawContent ?? data.body ?? data.snippet ?? ''
  const meetingTitle = subject.replace(/^recording available:?\s*/i, '').trim() || 'Google Meet Recording'

  // Find Drive link in email body
  const driveUrlMatch = emailBody.match(/https:\/\/(?:drive|docs)\.google\.com\/[^\s"<>]+/)
  let transcript = emailBody

  if (driveUrlMatch) {
    const fileId = extractDriveFileId(driveUrlMatch[0])
    if (fileId) {
      try {
        transcript = await fetchDriveFileText(fileId)
      } catch (err) {
        console.warn('[gmail-webhook] Could not fetch Drive transcript, using email body:', err)
      }
    }
  }

  // Find sender in DB
  let creatorId: string | null = null
  if (data.emailAddress) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.emailAddress))
      .limit(1)
    creatorId = user?.id ?? null
  }

  // Create meeting record
  const [meeting] = await db
    .insert(meetings)
    .values({
      title:      meetingTitle,
      source:     'google_meet',
      rawContent: transcript,
      createdBy:  creatorId ?? undefined,
    })
    .returning()

  // Generate minutes with AI
  try {
    const content = await generateMinutes(transcript, meetingTitle)

    const [minutes] = await db
      .insert(meetingMinutes)
      .values({
        meetingId:     meeting.id,
        content,
        status:        'pending_review',
        generatedByAi: true,
      })
      .returning()

    // Notify all managers/admins that minutes are ready for review
    const managers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'manager'))

    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))

    const recipients = [...managers, ...admins]
    await Promise.all(
      recipients.map(u =>
        createNotification(u.id, 'minutes_ready_for_review', {
          meetingTitle,
          minutesId: minutes.id,
          meetingId: meeting.id,
        })
      )
    )
  } catch (err) {
    console.error('[gmail-webhook] Minutes generation failed:', err)
  }
}
