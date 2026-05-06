import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetingRequests, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createNotification } from '@/lib/notifications'

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
    .select({ id: meetingRequests.id, title: meetingRequests.title, createdBy: meetingRequests.createdBy, status: meetingRequests.status })
    .from(meetingRequests)
    .where(eq(meetingRequests.id, id))
    .limit(1)

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { reviewNote } = body as { reviewNote?: string }

  const [updated] = await db
    .update(meetingRequests)
    .set({
      status:     'rejected',
      reviewedBy: session.user.id,
      reviewNote: reviewNote ?? null,
      updatedAt:  new Date(),
    })
    .where(eq(meetingRequests.id, id))
    .returning()

  await createNotification(request.createdBy, 'meeting_request_rejected', {
    requestId:    request.id,
    requestTitle: request.title,
    reviewerName: session.user.name ?? '',
    reviewNote:   reviewNote ?? '',
  })

  return NextResponse.json({ data: updated })
}
