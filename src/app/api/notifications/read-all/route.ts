import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// POST /api/notifications/read-all — mark all notifications as read for the current user
export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.userId, session.user.id),
        eq(notifications.read, false),
      )
    )

  return NextResponse.json({ success: true })
}
