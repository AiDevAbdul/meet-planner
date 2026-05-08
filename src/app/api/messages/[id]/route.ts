import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { messages, channelMembers, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET /api/messages/[id] — fetch a single message with user info
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: messageId } = await params
  const userId = session.user.id

  const [row] = await db
    .select({
      id:         messages.id,
      channelId:  messages.channelId,
      content:    messages.content,
      replyTo:    messages.replyTo,
      flagged:    messages.flagged,
      createdAt:  messages.createdAt,
      editedAt:   messages.editedAt,
      userId:     messages.userId,
      userName:   users.name,
      userEmail:  users.email,
      userAvatar: users.avatarUrl,
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify the caller is a member of the channel
  const [membership] = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, row.channelId), eq(channelMembers.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(row)
}

// DELETE /api/messages/[id] — delete own message
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: messageId } = await params
  const userId = session.user.id

  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Only the message author can delete it
  if (message.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))

  return new NextResponse(null, { status: 204 })
}
