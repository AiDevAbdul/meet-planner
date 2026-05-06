import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { intakeForms, intakeSubmissions, projectMembers, tasks, notifications } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'

async function getFormAndCheckAccess(formId: string, userId: string) {
  const [form] = await db.select().from(intakeForms).where(eq(intakeForms.id, formId)).limit(1)
  if (!form) return { form: null, allowed: false, role: null }

  const membership = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, form.projectId), eq(projectMembers.userId, userId)))
    .limit(1)

  return { form, allowed: membership.length > 0, role: membership[0]?.role ?? null }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { formId } = await params
  const { form, allowed } = await getFormAndCheckAccess(formId, session.user.id)

  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const submissions = await db
    .select()
    .from(intakeSubmissions)
    .where(eq(intakeSubmissions.formId, formId))
    .orderBy(desc(intakeSubmissions.createdAt))

  return NextResponse.json(submissions)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { formId } = await params
  const { form, allowed, role } = await getFormAndCheckAccess(formId, session.user.id)

  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!allowed || !['owner', 'manager', 'member'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionId, status, triage } = await req.json()
  if (!submissionId) return NextResponse.json({ error: 'submissionId required' }, { status: 400 })

  const [submission] = await db
    .select()
    .from(intakeSubmissions)
    .where(and(eq(intakeSubmissions.id, submissionId), eq(intakeSubmissions.formId, formId)))
    .limit(1)

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  let taskId = submission.taskId

  // Triage: create a task from the submission
  if (triage && !taskId) {
    const data = submission.data as Record<string, string>
    const titleField = Object.values(data)[0] ?? 'Intake submission'
    const description = Object.entries(data)
      .map(([k, v]) => `**${k}**: ${v}`)
      .join('\n')

    const [newTask] = await db.insert(tasks).values({
      title:       String(titleField).slice(0, 200),
      description,
      status:      'triage',
      priority:    'normal',
      projectId:   form.projectId,
      createdBy:   session.user.id,
      position:    0,
    }).returning()

    taskId = newTask.id

    // Notify all project owners/managers
    const managers = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, form.projectId),
        // owners and managers only — notify them of new triage task
      ))

    if (managers.length) {
      await db.insert(notifications).values(
        managers.map(m => ({
          userId:  m.userId,
          type:    'intake_form_submitted' as const,
          payload: {
            formId:        form.id,
            formName:      form.name,
            submissionId:  submission.id,
            taskId:        newTask.id,
            submitterName:  submission.submitterName  ?? '',
            submitterEmail: submission.submitterEmail ?? '',
          } as Record<string, string>,
        }))
      )
    }
  }

  const newStatus = status ?? (triage ? 'triaged' : submission.status)

  const [updated] = await db
    .update(intakeSubmissions)
    .set({ status: newStatus, taskId, updatedAt: new Date() })
    .where(eq(intakeSubmissions.id, submissionId))
    .returning()

  return NextResponse.json(updated)
}
