import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { channels, channelMembers, messages, users } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
import { MessagingLayout } from './MessagingLayout'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export type ChannelWithMeta = {
  id: string
  name: string
  slug: string
  type: 'public' | 'private' | 'direct'
  departmentId: string | null
  createdBy: string | null
  createdAt: Date
  memberCount: number
  latestMessage: {
    content: string
    senderName: string
    createdAt: Date
  } | null
  unreadCount: number
}

export default async function MessagingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  // Fetch channels where user is a member
  const memberRows = await db
    .select({
      channelId:    channelMembers.channelId,
      channelName:  channels.name,
      channelSlug:  channels.slug,
      channelType:  channels.type,
      departmentId: channels.departmentId,
      createdBy:    channels.createdBy,
      createdAt:    channels.createdAt,
    })
    .from(channelMembers)
    .innerJoin(channels, eq(channelMembers.channelId, channels.id))
    .where(eq(channelMembers.userId, userId))
    .orderBy(channels.name)

  // Build enriched channel list
  const enriched: ChannelWithMeta[] = []

  for (const row of memberRows) {
    const [memberCountResult] = await db
      .select({ count: count() })
      .from(channelMembers)
      .where(eq(channelMembers.channelId, row.channelId))

    const [latestMsg] = await db
      .select({
        content:    messages.content,
        senderName: users.name,
        createdAt:  messages.createdAt,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.channelId, row.channelId))
      .orderBy(desc(messages.createdAt))
      .limit(1)

    enriched.push({
      id:          row.channelId,
      name:        row.channelName,
      slug:        row.channelSlug,
      type:        row.channelType,
      departmentId: row.departmentId,
      createdBy:   row.createdBy,
      createdAt:   row.createdAt,
      memberCount: memberCountResult?.count ?? 0,
      latestMessage: latestMsg ?? null,
      unreadCount: 0,
    })
  }

  return <MessagingLayout initialChannels={enriched} currentUserId={userId} />
}
