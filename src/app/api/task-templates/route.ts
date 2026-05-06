import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { taskTemplates } from '@/lib/db/schema'
import { eq, desc, or, isNull } from 'drizzle-orm'

// GET /api/task-templates?projectId=xxx — list templates (global + project-scoped)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')

  const rows = projectId
    ? await db
        .select()
        .from(taskTemplates)
        .where(or(isNull(taskTemplates.projectId), eq(taskTemplates.projectId, projectId)))
        .orderBy(desc(taskTemplates.createdAt))
    : await db
        .select()
        .from(taskTemplates)
        .where(isNull(taskTemplates.projectId))
        .orderBy(desc(taskTemplates.createdAt))

  return NextResponse.json(rows)
}

// POST /api/task-templates — create a template
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, priority, projectId, fields } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
  }

  const [template] = await db
    .insert(taskTemplates)
    .values({
      name:        name.trim(),
      description: description ?? null,
      priority:    priority ?? 'normal',
      projectId:   projectId ?? null,
      fields:      fields ?? null,
      createdBy:   session.user.id,
    })
    .returning()

  return NextResponse.json(template, { status: 201 })
}
