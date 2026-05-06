import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { outboundWebhooks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.url     !== undefined) updates.url    = body.url
  if (body.events  !== undefined) updates.events = body.events
  if (body.active  !== undefined) updates.active = body.active
  if (body.secret  !== undefined) updates.secret = body.secret

  const [hook] = await db.update(outboundWebhooks).set(updates).where(eq(outboundWebhooks.id, id)).returning()
  if (!hook) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(hook)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(outboundWebhooks).where(eq(outboundWebhooks.id, id))
  return NextResponse.json({ ok: true })
}
