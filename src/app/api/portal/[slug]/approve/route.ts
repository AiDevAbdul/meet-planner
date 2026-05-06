import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clientPortals, portalDocApprovals } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { compare } from 'bcryptjs'

// POST /api/portal/[slug]/approve — client approves or requests changes on a document
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { documentId, status, note, password } = await req.json()

  if (!documentId || !status || !['approved', 'changes_requested'].includes(status)) {
    return NextResponse.json({ error: 'documentId and valid status required' }, { status: 400 })
  }

  const [portal] = await db
    .select({ id: clientPortals.id, passwordHash: clientPortals.passwordHash })
    .from(clientPortals)
    .where(and(eq(clientPortals.slug, slug), eq(clientPortals.active, true)))
    .limit(1)

  if (!portal) return NextResponse.json({ error: 'Portal not found' }, { status: 404 })

  if (portal.passwordHash) {
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 401 })
    const valid = await compare(password, portal.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 403 })
  }

  // Upsert approval record
  const existing = await db
    .select({ id: portalDocApprovals.id })
    .from(portalDocApprovals)
    .where(and(eq(portalDocApprovals.portalId, portal.id), eq(portalDocApprovals.documentId, documentId)))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(portalDocApprovals)
      .set({ status, note: note ?? null, respondedAt: new Date() })
      .where(eq(portalDocApprovals.id, existing[0].id))
  } else {
    await db
      .insert(portalDocApprovals)
      .values({ portalId: portal.id, documentId, status, note: note ?? null, respondedAt: new Date() })
  }

  return NextResponse.json({ ok: true })
}
