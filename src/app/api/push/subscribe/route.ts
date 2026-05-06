import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { endpoint, keys } = body

  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  // Upsert — replace if same endpoint
  await db
    .insert(pushSubscriptions)
    .values({
      userId:     session.user.id,
      endpoint,
      keysAuth:   keys.auth,
      keysP256dh: keys.p256dh,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId:     session.user.id,
        keysAuth:   keys.auth,
        keysP256dh: keys.p256dh,
      },
    })

  return NextResponse.json({ ok: true })
}
