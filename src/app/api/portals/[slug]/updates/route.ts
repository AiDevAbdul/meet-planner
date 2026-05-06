import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { clientPortals, portalUpdates, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const [portal] = await db.select({ id: clientPortals.id }).from(clientPortals).where(eq(clientPortals.slug, slug)).limit(1)
  if (!portal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates = await db
    .select({
      id:               portalUpdates.id,
      content:          portalUpdates.content,
      createdAt:        portalUpdates.createdAt,
      createdByName:    users.name,
      createdByImage:   users.image,
    })
    .from(portalUpdates)
    .leftJoin(users, eq(portalUpdates.createdBy, users.id))
    .where(eq(portalUpdates.portalId, portal.id))
    .orderBy(desc(portalUpdates.createdAt))

  return NextResponse.json(updates)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const [portal] = await db.select({ id: clientPortals.id }).from(clientPortals).where(eq(clientPortals.slug, slug)).limit(1)
  if (!portal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [update] = await db
    .insert(portalUpdates)
    .values({ portalId: portal.id, content: content.trim(), createdBy: session.user.id })
    .returning()

  return NextResponse.json(update, { status: 201 })
}
