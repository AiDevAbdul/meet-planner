import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { taskTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id))
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(template)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.name !== undefined)        updates.name        = body.name.trim()
  if (body.description !== undefined) updates.description = body.description
  if (body.priority !== undefined)    updates.priority    = body.priority
  if (body.fields !== undefined)      updates.fields      = body.fields

  const [template] = await db
    .update(taskTemplates)
    .set(updates)
    .where(eq(taskTemplates.id, id))
    .returning()

  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(template)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await db.delete(taskTemplates).where(eq(taskTemplates.id, id))
  return NextResponse.json({ success: true })
}
