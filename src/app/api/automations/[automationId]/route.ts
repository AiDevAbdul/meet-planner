import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ automationId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { automationId } = await params
  const body = await req.json()
  const { name, triggerType, triggerConfig, actionType, actionConfig, enabled } = body

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (name !== undefined)          updates.name          = name
  if (triggerType !== undefined)   updates.triggerType   = triggerType
  if (triggerConfig !== undefined) updates.triggerConfig = triggerConfig
  if (actionType !== undefined)    updates.actionType    = actionType
  if (actionConfig !== undefined)  updates.actionConfig  = actionConfig
  if (enabled !== undefined)       updates.enabled       = enabled

  const [row] = await db
    .update(automations)
    .set(updates)
    .where(eq(automations.id, automationId))
    .returning()

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ automationId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { automationId } = await params

  await db.delete(automations).where(eq(automations.id, automationId))
  return NextResponse.json({ ok: true })
}
