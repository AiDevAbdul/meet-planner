import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// PATCH /api/me/preferences — update current user's notification preferences
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (typeof body.dailyReportEmail === 'boolean') {
    updates.dailyReportEmail = body.dailyReportEmail
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(users)
    .set(updates as any)
    .where(eq(users.id, session.user.id))
    .returning({ dailyReportEmail: users.dailyReportEmail })

  return NextResponse.json(updated)
}
