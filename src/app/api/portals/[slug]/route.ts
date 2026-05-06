import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { clientPortals } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const [portal] = await db
    .select()
    .from(clientPortals)
    .where(eq(clientPortals.slug, slug))
    .limit(1)

  if (!portal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { passwordHash: _, ...safe } = portal
  return NextResponse.json(safe)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const body = await req.json()
  const { name, primaryColor, logoUrl, active, password } = body

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (name         !== undefined) updates.name         = name
  if (primaryColor !== undefined) updates.primaryColor = primaryColor
  if (logoUrl      !== undefined) updates.logoUrl      = logoUrl
  if (active       !== undefined) updates.active       = active

  if (password !== undefined) {
    if (password === null || password === '') {
      updates.passwordHash = null
    } else {
      const { hash } = await import('bcryptjs')
      updates.passwordHash = await hash(password, 10)
    }
  }

  const [updated] = await db
    .update(clientPortals)
    .set(updates)
    .where(eq(clientPortals.slug, slug))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { passwordHash: _, ...safe } = updated
  return NextResponse.json(safe)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  await db.delete(clientPortals).where(eq(clientPortals.slug, slug))
  return NextResponse.json({ ok: true })
}
