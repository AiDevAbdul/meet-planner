import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customFieldDefinitions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// PATCH /api/custom-fields/[id] — update a field definition
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

  if (body.name !== undefined)     updates.name    = body.name.trim()
  if (body.options !== undefined)  updates.options = body.options
  if (body.position !== undefined) updates.position = body.position

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const [field] = await db
    .update(customFieldDefinitions)
    .set(updates)
    .where(eq(customFieldDefinitions.id, id))
    .returning()

  if (!field) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(field)
}

// DELETE /api/custom-fields/[id] — delete a field definition
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, id))
  return NextResponse.json({ success: true })
}
