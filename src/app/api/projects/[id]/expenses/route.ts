import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projectExpenses, projects, projectMembers, notifications } from '@/lib/db/schema'
import { eq, sum } from 'drizzle-orm'

// GET /api/projects/[id]/expenses
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params

  const rows = await db
    .select()
    .from(projectExpenses)
    .where(eq(projectExpenses.projectId, projectId))

  return NextResponse.json(rows)
}

// POST /api/projects/[id]/expenses
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
  const { description, amount_cents, date } = body

  if (!description?.trim() || amount_cents === undefined) {
    return NextResponse.json({ error: 'description and amount_cents are required' }, { status: 400 })
  }

  const [expense] = await db
    .insert(projectExpenses)
    .values({
      projectId,
      description: description.trim(),
      amountCents: Math.round(amount_cents),
      date:        date ?? null,
      createdBy:   session.user.id,
    })
    .returning()

  // Budget alert check
  await checkBudgetAlert(projectId)

  return NextResponse.json(expense, { status: 201 })
}

async function checkBudgetAlert(projectId: string) {
  try {
    const [project] = await db
      .select({ budget: projects.budget, ownerId: projects.ownerId })
      .from(projects)
      .where(eq(projects.id, projectId))

    if (!project?.budget) return

    const budgetCents = project.budget * 100

    const [result] = await db
      .select({ total: sum(projectExpenses.amountCents) })
      .from(projectExpenses)
      .where(eq(projectExpenses.projectId, projectId))

    const totalSpentCents = Number(result?.total ?? 0)
    const pct = (totalSpentCents / budgetCents) * 100

    let alertType: 'budget_alert_80' | 'budget_alert_100' | null = null
    if (pct >= 100) alertType = 'budget_alert_100'
    else if (pct >= 80) alertType = 'budget_alert_80'

    if (!alertType || !project.ownerId) return

    // Send to owner
    const existingOwner = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.userId, project.ownerId))
      .limit(1)

    if (existingOwner.length === 0) {
      await db.insert(notifications).values({
        userId:  project.ownerId,
        type:    alertType,
        payload: { projectId },
        read:    false,
      })
    }

    // Send to managers
    const managers = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))

    for (const m of managers) {
      if (m.userId === project.ownerId) continue
      await db.insert(notifications).values({
        userId:  m.userId,
        type:    alertType,
        payload: { projectId },
        read:    false,
      })
    }
  } catch {
    // Non-blocking
  }
}
