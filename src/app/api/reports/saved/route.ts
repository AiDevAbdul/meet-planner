import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { savedReports } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reports = await db.select().from(savedReports)
    .where(eq(savedReports.userId, session.user.id))
    .orderBy(desc(savedReports.createdAt))

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const [report] = await db.insert(savedReports).values({
    userId: session.user.id,
    name:   body.name,
    config: body.config,
    pinned: body.pinned ?? false,
  }).returning()

  return NextResponse.json(report, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const [updated] = await db.update(savedReports)
    .set({ name: body.name, config: body.config, pinned: body.pinned, updatedAt: new Date() })
    .where(and(eq(savedReports.id, body.id), eq(savedReports.userId, session.user.id)))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await db.delete(savedReports)
    .where(and(eq(savedReports.id, id), eq(savedReports.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
