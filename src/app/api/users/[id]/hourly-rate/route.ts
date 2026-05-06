import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// PATCH /api/users/[id]/hourly-rate — admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins can set hourly rates
  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))

  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { hourly_rate_cents } = body

  if (hourly_rate_cents === undefined || hourly_rate_cents === null) {
    return NextResponse.json({ error: 'hourly_rate_cents is required' }, { status: 400 })
  }

  const [updated] = await db
    .update(users)
    .set({ hourlyRateCents: Math.round(hourly_rate_cents) })
    .where(eq(users.id, id))
    .returning({ id: users.id, hourlyRateCents: users.hourlyRateCents })

  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(updated)
}
