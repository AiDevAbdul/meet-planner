import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET /api/notifications — list notifications for current user, newest first, limit 50
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  // Shape each notification into a human-readable message
  const shaped = rows.map(n => ({
    id:        n.id,
    type:      n.type,
    payload:   n.payload,
    read:      n.read,
    createdAt: n.createdAt,
    message:   buildMessage(n.type, n.payload ?? {}),
  }))

  return NextResponse.json({ notifications: shaped })
}

function buildMessage(type: string, payload: Record<string, string>): string {
  switch (type) {
    case 'task_assigned':
      return `You were assigned "${payload.taskTitle ?? 'a task'}"${payload.assignerName ? ` by ${payload.assignerName}` : ''}.`
    case 'task_due':
      return `Task "${payload.taskTitle ?? 'Untitled'}" is due today.`
    case 'task_overdue':
      return `Task "${payload.taskTitle ?? 'Untitled'}" is overdue.`
    case 'mention':
      return `${payload.mentionerName ?? 'Someone'} mentioned you in #${payload.channelName ?? 'a channel'}.`
    case 'idea_flagged':
      return `A message was flagged in #${payload.channelName ?? 'a channel'}.`
    case 'idea_approved':
      return `Your idea in #${payload.channelName ?? 'a channel'} was approved.`
    case 'meeting_processed':
      return `Meeting "${payload.meetingTitle ?? 'Untitled'}" has been processed.`
    default:
      return payload.message ?? 'You have a new notification.'
  }
}
