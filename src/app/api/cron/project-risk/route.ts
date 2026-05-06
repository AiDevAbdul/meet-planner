import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  projects, projectMembers, projectRiskSnapshots, tasks,
  timeEntries, projectExpenses, users, notifications,
} from '@/lib/db/schema'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { analyzeProjectRisk } from '@/lib/ai/analyzeProjectRisk'

// Vercel Cron: daily at 00:00 UTC — analyze risk for all active/planning projects
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  const activeProjects = await db
    .select({
      id:        projects.id,
      name:      projects.name,
      status:    projects.status,
      startDate: projects.startDate,
      endDate:   projects.endDate,
      budget:    projects.budget,
      ownerId:   projects.ownerId,
    })
    .from(projects)
    .where(inArray(projects.status, ['planning', 'active', 'on_hold']))

  if (!activeProjects.length) return NextResponse.json({ processed: 0 })

  const results: { projectId: string; riskLevel: string }[] = []

  for (const project of activeProjects) {
    try {
      const [memberRows, taskRows, spentRows, expenseRows] = await Promise.all([
        db.select({ userId: projectMembers.userId })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, project.id)),

        db.select({ status: tasks.status, dueDate: tasks.dueDate })
          .from(tasks)
          .where(eq(tasks.projectId, project.id)),

        db.select({ minutes: timeEntries.minutes })
          .from(timeEntries)
          .where(eq(timeEntries.projectId, project.id)),

        db.select({ amount: projectExpenses.amountCents })
          .from(projectExpenses)
          .where(eq(projectExpenses.projectId, project.id)),
      ])

      const totalTasks      = taskRows.length
      const doneTasks       = taskRows.filter(t => t.status === 'done').length
      const inProgressTasks = taskRows.filter(t => t.status === 'in_progress').length
      const overdueTasks    = taskRows.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length

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

      await db.insert(projectRiskSnapshots).values({
        projectId:   project.id,
        riskLevel:   result.riskLevel,
        explanation: result.explanation,
        factors:     result.factors,
      })

      if ((result.riskLevel === 'high' || result.riskLevel === 'critical') && project.ownerId) {
        await db.insert(notifications).values({
          userId:  project.ownerId,
          type:    'risk_detected',
          payload: {
            projectId:   project.id,
            projectName: project.name,
            riskLevel:   result.riskLevel,
            explanation: result.explanation.slice(0, 200),
          },
          read: false,
        })
      }

      results.push({ projectId: project.id, riskLevel: result.riskLevel })
    } catch (err) {
      console.error(`Risk analysis failed for project ${project.id}:`, err)
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
