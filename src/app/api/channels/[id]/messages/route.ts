import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { messages, channelMembers, users } from '@/lib/db/schema'
import { eq, and, lt, desc } from 'drizzle-orm'

const PAGE_SIZE = 40

// GET /api/channels/[id]/messages
// Cursor-based pagination, newest first.
// ?cursor=<message-createdAt ISO string> for older pages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: channelId } = await params
  const userId = session.user.id

  // Verify membership
  const [membership] = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cursor = req.nextUrl.searchParams.get('cursor')

  const conditions = [eq(messages.channelId, channelId)]
  if (cursor) {
    conditions.push(lt(messages.createdAt, new Date(cursor)))
  }

  const rows = await db
    .select({
      id:        messages.id,
      channelId: messages.channelId,
      content:   messages.content,
      replyTo:   messages.replyTo,
      flagged:   messages.flagged,
      createdAt: messages.createdAt,
      editedAt:  messages.editedAt,
      userId:    messages.userId,
      userName:  users.name,
      userEmail: users.email,
      userAvatar: users.avatarUrl,
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(PAGE_SIZE + 1)

  const hasMore = rows.length > PAGE_SIZE
  const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows

  const nextCursor = hasMore
    ? items[items.length - 1].createdAt.toISOString()
    : null

  return NextResponse.json({ items, nextCursor, hasMore })
}

// POST /api/channels/[id]/messages — send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: channelId } = await params
  const userId = session.user.id

  // Verify membership
  const [membership] = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { content, replyTo } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
  }

  const [message] = await db
    .insert(messages)
    .values({
      channelId,
      userId,
      content: content.trim(),
      replyTo: replyTo ?? null,
      flagged: false,
    })
    .returning()

  // Return the full message with user info
  const [full] = await db
    .select({
      id:        messages.id,
      channelId: messages.channelId,
      content:   messages.content,
      replyTo:   messages.replyTo,
      flagged:   messages.flagged,
      createdAt: messages.createdAt,
      editedAt:  messages.editedAt,
      userId:    messages.userId,
      userName:  users.name,
      userEmail: users.email,
      userAvatar: users.avatarUrl,
    })
    .from(messages)
    .innerJoin(users, eq(messages.userId, users.id))
    .where(eq(messages.id, message.id))

  return NextResponse.json(full, { status: 201 })
}
