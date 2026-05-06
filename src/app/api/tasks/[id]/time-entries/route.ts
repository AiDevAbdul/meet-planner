import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { timeEntries, tasks, projects, projectMembers, notifications, projectExpenses } from '@/lib/db/schema'
import { eq, and, sum } from 'drizzle-orm'

// GET /api/tasks/[id]/time-entries — list entries for a task
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
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId))

  return NextResponse.json(rows)
}

// POST /api/tasks/[id]/time-entries — create a time entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: taskId } = await params
  const body = await req.json()
  const { date, minutes, note, billable } = body

  if (!date || !minutes || minutes <= 0) {
    return NextResponse.json({ error: 'date and minutes are required' }, { status: 400 })
  }

  // Get task to find projectId
  const [task] = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, taskId))

  const [entry] = await db
    .insert(timeEntries)
    .values({
      taskId,
      projectId: task?.projectId ?? null,
      userId:    session.user.id,
      date,
      minutes:   Math.round(minutes),
      note:      note ?? null,
      billable:  billable ?? false,
    })
    .returning()

  // Budget alert check if task has a project
  if (task?.projectId) {
    await checkBudgetAlert(task.projectId)
  }

  return NextResponse.json(entry, { status: 201 })
}

// Helper: check budget thresholds and send notifications
async function checkBudgetAlert(projectId: string) {
  try {
    const [project] = await db
      .select({ budget: projects.budget, ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))

    if (!project?.budget) return

    const budgetCents = project.budget * 100

    // For threshold purposes use total expenses in cents from project_expenses
    const [expensesResult] = await db
      .select({ total: sum(projectExpenses.amountCents) })
      .from(projectExpenses)
      .where(eq(projectExpenses.projectId, projectId))

    const totalSpentCents = Number(expensesResult?.total ?? 0)
    const pct = (totalSpentCents / budgetCents) * 100

    if (pct >= 100) {
      await sendBudgetNotification(projectId, project.ownerId, 'budget_alert_100', projectId)
    } else if (pct >= 80) {
      await sendBudgetNotification(projectId, project.ownerId, 'budget_alert_80', projectId)
    }
  } catch {
    // Non-blocking
  }
}

async function sendBudgetNotification(
  projectId: string,
  ownerId: string | null,
  type: 'budget_alert_80' | 'budget_alert_100',
  _ref: string,
) {
  if (!ownerId) return
  try {
    // Check if notification already exists to avoid spam
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ownerId),
          eq(notifications.type, type),
        ),
      )
      .limit(1)

    if (existing.length > 0) return

    await db.insert(notifications).values({
      userId:  ownerId,
      type,
      payload: { projectId },
      read:    false,
    })

    // Also notify project managers
    const managers = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, 'manager'),
        ),
      )

    for (const m of managers) {
      if (m.userId === ownerId) continue
      await db.insert(notifications).values({
        userId:  m.userId,
        type,
        payload: { projectId },
        read:    false,
      })
    }
  } catch {
    // Non-blocking
  }
}
