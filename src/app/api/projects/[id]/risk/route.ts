import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  projects, projectMembers, projectRiskSnapshots, tasks,
  timeEntries, projectExpenses,
} from '@/lib/db/schema'
import { and, desc, eq, lt, ne } from 'drizzle-orm'
import { analyzeProjectRisk } from '@/lib/ai/analyzeProjectRisk'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [latest] = await db
    .select()
    .from(projectRiskSnapshots)
    .where(eq(projectRiskSnapshots.projectId, id))
    .orderBy(desc(projectRiskSnapshots.createdAt))
    .limit(1)

  return NextResponse.json(latest ?? null)
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [project] = await db
    .select({
      id:        projects.id,
      name:      projects.name,
      status:    projects.status,
      startDate: projects.startDate,
      endDate:   projects.endDate,
      budget:    projects.budget,
    })
    .from(projects)
    .where(eq(projects.id, id))

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]

  const [memberRows, taskRows, spentRows, expenseRows] = await Promise.all([
    db.select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, id)),

    db.select({ status: tasks.status, dueDate: tasks.dueDate })
      .from(tasks)
      .where(eq(tasks.projectId, id)),

    db.select({ minutes: timeEntries.minutes })
      .from(timeEntries)
      .where(eq(timeEntries.projectId, id)),

    db.select({ amount: projectExpenses.amountCents })
      .from(projectExpenses)
      .where(eq(projectExpenses.projectId, id)),
  ])

  const totalTasks    = taskRows.length
  const doneTasks     = taskRows.filter(t => t.status === 'done').length
  const inProgressTasks = taskRows.filter(t => t.status === 'in_progress').length
  const overdueTasks  = taskRows.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length

  const timeSpentCents = spentRows.reduce((s, r) => s + r.minutes, 0)
  const expensesCents  = expenseRows.reduce((s, r) => s + (r.amount ?? 0), 0)

  const result = await analyzeProjectRisk({
    projectName:     project.name,
    status:          project.status,
    startDate:       project.startDate,
    endDate:         project.endDate,
    totalTasks,
    doneTasks,
    overdueTasks,
    inProgressTasks,
    budgetCents:     project.budget ? project.budget * 100 : null,
    spentCents:      timeSpentCents + expensesCents,
    memberCount:     memberRows.length,
  })

  const [snapshot] = await db
    .insert(projectRiskSnapshots)
    .values({
      projectId:   id,
      riskLevel:   result.riskLevel,
      explanation: result.explanation,
      factors:     result.factors,
    })
    .returning()

  return NextResponse.json(snapshot)
}
