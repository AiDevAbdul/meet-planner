import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { goals, users, notifications } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const activeGoals = await db
    .select({ id: goals.id, title: goals.title, ownerId: goals.ownerId })
    .from(goals)
    .where(eq(goals.status, 'active'))

  if (activeGoals.length === 0) return NextResponse.json({ sent: 0 })

  const ownerIds = [...new Set(activeGoals.map(g => g.ownerId).filter(Boolean))] as string[]

  const notifRows = ownerIds.map(uid => ({
    userId:  uid,
    type:    'goal_checkin_due' as const,
    payload: {
      message: 'Monthly OKR check-in: review your goals and update progress.',
      goalCount: String(activeGoals.filter(g => g.ownerId === uid).length),
    },
    read: false,
  }))

  if (notifRows.length > 0) {
    await db.insert(notifications).values(notifRows)
  }

  return NextResponse.json({ sent: notifRows.length })
}
