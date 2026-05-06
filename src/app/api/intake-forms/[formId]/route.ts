import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { intakeForms, projectMembers } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

async function getFormAndCheckAccess(formId: string, userId: string) {
  const [form] = await db.select().from(intakeForms).where(eq(intakeForms.id, formId)).limit(1)
  if (!form) return { form: null, allowed: false }

  const membership = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, form.projectId), eq(projectMembers.userId, userId)))
    .limit(1)

  return { form, allowed: membership.length > 0, role: membership[0]?.role }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { formId } = await params
  const { form, allowed } = await getFormAndCheckAccess(formId, session.user.id)

  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(form)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { formId } = await params
  const { form, allowed, role } = await getFormAndCheckAccess(formId, session.user.id)

  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!allowed || !['owner', 'manager'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Partial<typeof form> = {}

  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.fields !== undefined) updates.fields = body.fields
  if (body.active !== undefined) updates.active = body.active

  const [updated] = await db
    .update(intakeForms)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(intakeForms.id, formId))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { formId } = await params
  const { form, allowed, role } = await getFormAndCheckAccess(formId, session.user.id)

  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!allowed || !['owner', 'manager'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(intakeForms).where(eq(intakeForms.id, formId))
  return NextResponse.json({ ok: true })
}
