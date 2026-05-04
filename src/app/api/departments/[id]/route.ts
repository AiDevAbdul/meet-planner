import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { departments, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

async function requireAdmin(userId: string): Promise<boolean> {
  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return currentUser?.role === 'admin'
}

// PATCH /api/departments/[id] — update department (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await requireAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.name  !== undefined) updates.name  = body.name.trim()
  if (body.slug  !== undefined) updates.slug  = body.slug.trim().toLowerCase().replace(/\s+/g, '-')
  if (body.color !== undefined) updates.color = body.color

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const [updated] = await db
    .update(departments)
    .set(updates as any)
    .where(eq(departments.id, id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}

// DELETE /api/departments/[id] — delete department (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await requireAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const [deleted] = await db
    .delete(departments)
    .where(eq(departments.id, id))
    .returning({ id: departments.id })

  if (!deleted) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
