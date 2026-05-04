import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { messages, channelMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// PATCH /api/messages/[id]/flag — set messages.flagged = true
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: messageId } = await params
  const userId = session.user.id

  // Fetch message to check membership
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Verify user is a member of the channel this message belongs to
  const [membership] = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, message.channelId), eq(channelMembers.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [updated] = await db
    .update(messages)
    .set({ flagged: true })
    .where(eq(messages.id, messageId))
    .returning()

  return NextResponse.json(updated)
}
