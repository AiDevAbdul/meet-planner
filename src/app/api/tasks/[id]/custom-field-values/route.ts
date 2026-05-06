import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customFieldValues, customFieldDefinitions, tasks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

// GET /api/tasks/[id]/custom-field-values — list all custom field values for a task
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: taskId } = await params

  const rows = await db
    .select({
      fieldDefinitionId: customFieldValues.fieldDefinitionId,
      value:             customFieldValues.value,
      updatedAt:         customFieldValues.updatedAt,
    })
    .from(customFieldValues)
    .where(eq(customFieldValues.taskId, taskId))

  return NextResponse.json(rows)
}

// PATCH /api/tasks/[id]/custom-field-values — upsert a custom field value
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: taskId } = await params
  const { fieldDefinitionId, value } = await req.json()

  if (!fieldDefinitionId) {
    return NextResponse.json({ error: 'fieldDefinitionId is required' }, { status: 400 })
  }

  const [row] = await db
    .insert(customFieldValues)
    .values({ taskId, fieldDefinitionId, value: value ?? null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [customFieldValues.taskId, customFieldValues.fieldDefinitionId],
      set:    { value: value ?? null, updatedAt: new Date() },
    })
    .returning()

  return NextResponse.json(row)
}
