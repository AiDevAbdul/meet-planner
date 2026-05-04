import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { channels, channelMembers, messages, users } from '@/lib/db/schema'
import { eq, desc, count, inArray } from 'drizzle-orm'

// GET /api/channels — list all channels the current user belongs to
// Returns each channel with member count, latest message, and unread count
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  // Fetch channels where user is a member
  const memberRows = await db
    .select({
      channelId:   channelMembers.channelId,
      channelName: channels.name,
      channelSlug: channels.slug,
      channelType: channels.type,
      departmentId: channels.departmentId,
      createdBy:   channels.createdBy,
      createdAt:   channels.createdAt,
    })
    .from(channelMembers)
    .innerJoin(channels, eq(channelMembers.channelId, channels.id))
    .where(eq(channelMembers.userId, userId))
    .orderBy(channels.name)

  if (memberRows.length === 0) {
    return NextResponse.json([])
  }

  const channelIds = memberRows.map(r => r.channelId)

  // Member counts per channel
  const memberCounts = await db
    .select({
      channelId: channelMembers.channelId,
      count: count(),
    })
    .from(channelMembers)
    .where(inArray(channelMembers.channelId, channelIds))
    .groupBy(channelMembers.channelId)

  const memberCountMap: Record<string, number> = {}
  for (const row of memberCounts) {
    memberCountMap[row.channelId] = row.count
  }

  // Latest message per channel — use a subquery approach
  // We'll fetch the last message for each channel
  const latestMessages: Array<{
    channelId: string
    content: string
    senderName: string
    createdAt: Date
  }> = []

  for (const cId of channelIds) {
    const [latest] = await db
      .select({
        channelId: messages.channelId,
        content:   messages.content,
        senderName: users.name,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.channelId, cId))
      .orderBy(desc(messages.createdAt))
      .limit(1)

    if (latest) latestMessages.push(latest)
  }

  const latestMessageMap: Record<string, typeof latestMessages[0]> = {}
  for (const msg of latestMessages) {
    latestMessageMap[msg.channelId] = msg
  }

  const result = memberRows.map(row => ({
    id:          row.channelId,
    name:        row.channelName,
    slug:        row.channelSlug,
    type:        row.channelType,
    departmentId: row.departmentId,
    createdBy:   row.createdBy,
    createdAt:   row.createdAt,
    memberCount: memberCountMap[row.channelId] ?? 0,
    latestMessage: latestMessageMap[row.channelId] ?? null,
    // Unread tracking would require a read-cursor table; using 0 as placeholder
    unreadCount: 0,
  }))

  return NextResponse.json(result)
}

// POST /api/channels — create a new channel
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const { name, type, departmentId, memberIds } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
  }

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()

  const [channel] = await db
    .insert(channels)
    .values({
      name:        name.trim(),
      slug,
      type:        type ?? 'public',
      departmentId: departmentId ?? null,
      createdBy:   userId,
    })
    .returning()

  // Add creator as owner
  const membersToInsert: Array<{ channelId: string; userId: string; role: 'owner' | 'member' }> = [
    { channelId: channel.id, userId, role: 'owner' },
  ]

  // Add additional members (for DMs or private channels)
  if (Array.isArray(memberIds)) {
    for (const mid of memberIds) {
      if (mid !== userId) {
        membersToInsert.push({ channelId: channel.id, userId: mid, role: 'member' })
      }
    }
  }

  await db.insert(channelMembers).values(membersToInsert)

  return NextResponse.json(channel, { status: 201 })
}
