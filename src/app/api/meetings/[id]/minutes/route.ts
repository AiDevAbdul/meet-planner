import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetings, meetingMinutes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateMinutes } from '@/lib/ai/generateMinutes'
import { createNotification } from '@/lib/notifications'

type Params = { params: Promise<{ id: string }> }

// GET /api/meetings/[id]/minutes — fetch existing minutes
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [minutes] = await db
    .select()
    .from(meetingMinutes)
    .where(eq(meetingMinutes.meetingId, id))
    .limit(1)

  return NextResponse.json({ minutes: minutes ?? null })
}

// POST /api/meetings/[id]/minutes — generate (or regenerate) minutes from rawContent
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [meeting] = await db
    .select({ id: meetings.id, title: meetings.title, rawContent: meetings.rawContent })
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1)

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  if (!meeting.rawContent) {
    return NextResponse.json({ error: 'No transcript/notes available to generate minutes from' }, { status: 422 })
  }

  const content = await generateMinutes(meeting.rawContent, meeting.title)

  // Upsert: delete existing then insert fresh
  await db.delete(meetingMinutes).where(eq(meetingMinutes.meetingId, id))

  const [minutes] = await db
    .insert(meetingMinutes)
    .values({
      meetingId:     id,
      content,
      status:        'pending_review',
      generatedByAi: true,
    })
    .returning()

  // Notify managers/admins
  const managers = await db.select({ id: users.id }).from(users).where(eq(users.role, 'manager'))
  const admins   = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'))
  const recipients = [...managers, ...admins].filter(u => u.id !== session.user!.id)

  await Promise.all(
    recipients.map(u =>
      createNotification(u.id, 'minutes_ready_for_review', {
        meetingTitle: meeting.title,
        minutesId:    minutes.id,
        meetingId:    id,
      })
    )
  )

  return NextResponse.json({ minutes })
}

// PATCH /api/meetings/[id]/minutes — update content or status
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { content?: string; status?: string }

  const [existing] = await db
    .select({ id: meetingMinutes.id })
    .from(meetingMinutes)
    .where(eq(meetingMinutes.meetingId, id))
    .limit(1)

  if (!existing) return NextResponse.json({ error: 'Minutes not found' }, { status: 404 })

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.content !== undefined) updates.content = body.content
  if (body.status  !== undefined) updates.status  = body.status

  const [minutes] = await db
    .update(meetingMinutes)
    .set(updates as any)
    .where(eq(meetingMinutes.id, existing.id))
    .returning()

  return NextResponse.json({ minutes })
}
