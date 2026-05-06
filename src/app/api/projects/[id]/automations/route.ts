import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { automations, projectMembers } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rows = await db
    .select()
    .from(automations)
    .where(eq(automations.projectId, id))
    .orderBy(automations.createdAt)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Only project members can create automations
  const membership = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, session.user.id)))
    .limit(1)

  if (!membership.length) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, triggerType, triggerConfig = {}, actionType, actionConfig = {}, enabled = true } = body

  if (!name || !triggerType || !actionType) {
    return NextResponse.json({ error: 'name, triggerType, and actionType are required' }, { status: 400 })
  }

  const [row] = await db.insert(automations).values({
    projectId:     id,
    name,
    triggerType,
    triggerConfig,
    actionType,
    actionConfig,
    enabled,
    createdBy: session.user.id,
  }).returning()

  return NextResponse.json(row, { status: 201 })
}
