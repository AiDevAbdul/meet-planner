import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { outboundWebhooks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const hooks = await db
    .select({ id: outboundWebhooks.id, url: outboundWebhooks.url, events: outboundWebhooks.events, active: outboundWebhooks.active, createdAt: outboundWebhooks.createdAt })
    .from(outboundWebhooks)
    .where(eq(outboundWebhooks.projectId, id))

  return NextResponse.json(hooks)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { url, events, secret } = await req.json()

  if (!url || !events?.length) return NextResponse.json({ error: 'url and events required' }, { status: 400 })

  try { new URL(url) } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }) }

  const resolvedSecret = secret || randomBytes(20).toString('hex')

  const [hook] = await db
    .insert(outboundWebhooks)
    .values({ projectId: id, url, events, secret: resolvedSecret, active: true })
    .returning()

  return NextResponse.json({ ...hook, secret: resolvedSecret }, { status: 201 })
}
