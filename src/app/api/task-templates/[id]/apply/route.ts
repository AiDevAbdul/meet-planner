import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { taskTemplates, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// POST /api/task-templates/[id]/apply — create a task from a template
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id))
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const body = await req.json()
  const { assigneeId, dueDate, projectId, departmentId } = body

  const [task] = await db
    .insert(tasks)
    .values({
      title:        template.name,
      description:  template.description ?? null,
      priority:     template.priority,
      status:       'triage',
      assigneeId:   assigneeId ?? null,
      dueDate:      dueDate ?? null,
      projectId:    projectId ?? template.projectId ?? null,
      departmentId: departmentId ?? null,
      createdBy:    session.user.id,
    })
    .returning()

  return NextResponse.json(task, { status: 201 })
}
