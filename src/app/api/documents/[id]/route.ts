import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documents, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [doc] = await db
    .select({
      id:          documents.id,
      projectId:   documents.projectId,
      title:       documents.title,
      contentJson: documents.contentJson,
      status:      documents.status,
      createdBy:   documents.createdBy,
      updatedBy:   documents.updatedBy,
      updatedAt:   documents.updatedAt,
      createdAt:   documents.createdAt,
      creatorName: users.name,
    })
    .from(documents)
    .leftJoin(users, eq(documents.createdBy, users.id))
    .where(eq(documents.id, id))

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: doc })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: session.user.id }

  if ('title' in body && typeof body.title === 'string') updates.title = body.title.trim()
  if ('contentJson' in body) updates.contentJson = body.contentJson
  if ('status' in body && ['draft', 'review', 'approved'].includes(body.status)) updates.status = body.status

  const [updated] = await db
    .update(documents)
    .set(updates as any)
    .where(eq(documents.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [doc] = await db.select({ createdBy: documents.createdBy }).from(documents).where(eq(documents.id, id))
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.delete(documents).where(eq(documents.id, id))
  return NextResponse.json({ ok: true })
}
