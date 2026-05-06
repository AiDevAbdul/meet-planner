import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customFieldDefinitions } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

// GET /api/projects/[id]/custom-fields — list field definitions for a project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params

  const fields = await db
    .select()
    .from(customFieldDefinitions)
    .where(eq(customFieldDefinitions.projectId, projectId))
    .orderBy(asc(customFieldDefinitions.position), asc(customFieldDefinitions.createdAt))

  return NextResponse.json(fields)
}

// POST /api/projects/[id]/custom-fields — create a field definition
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params
  const body = await req.json()
  const { name, type, options } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Field name is required' }, { status: 400 })
  }
  if (!['text', 'number', 'date', 'select', 'checkbox'].includes(type)) {
    return NextResponse.json({ error: 'Invalid field type' }, { status: 400 })
  }
  if (type === 'select' && (!Array.isArray(options) || options.length === 0)) {
    return NextResponse.json({ error: 'Select fields require at least one option' }, { status: 400 })
  }

  const [field] = await db
    .insert(customFieldDefinitions)
    .values({
      projectId,
      name:    name.trim(),
      type,
      options: type === 'select' ? options : null,
    })
    .returning()

  return NextResponse.json(field, { status: 201 })
}
