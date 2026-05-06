import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  await db.delete(pushSubscriptions).where(
    and(
      eq(pushSubscriptions.endpoint, endpoint),
      eq(pushSubscriptions.userId, session.user.id),
    )
  )

  return NextResponse.json({ ok: true })
}
