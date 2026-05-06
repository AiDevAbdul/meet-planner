import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetingMinutes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

// POST /api/meetings/[id]/minutes/approve — manager/admin approves minutes
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [existing] = await db
    .select({ id: meetingMinutes.id, status: meetingMinutes.status })
    .from(meetingMinutes)
    .where(eq(meetingMinutes.meetingId, id))
    .limit(1)

  if (!existing) return NextResponse.json({ error: 'Minutes not found' }, { status: 404 })

  const [minutes] = await db
    .update(meetingMinutes)
    .set({
      status:     'approved',
      approvedBy: session.user.id,
      reviewedBy: session.user.id,
      updatedAt:  new Date(),
    })
    .where(eq(meetingMinutes.id, existing.id))
    .returning()

  return NextResponse.json({ minutes })
}
