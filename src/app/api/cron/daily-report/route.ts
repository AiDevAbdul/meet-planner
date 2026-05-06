import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks, users, departments, milestones, dailyReports } from '@/lib/db/schema'
import { and, eq, gte, inArray, isNotNull, lt, ne } from 'drizzle-orm'
import { generateDailyReport, type DailyReportData } from '@/lib/ai/generateDailyReport'
import { sendEmail } from '@/lib/google/gmail'

// Vercel Cron: daily at 17:00 UTC — aggregate task data, generate AI report, email managers
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now        = new Date()
  const todayStr   = now.toISOString().split('T')[0]
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`)

  // ── Fetch all relevant task data ──────────────────────────────────────────

  const [allActiveTasks, completedTodayRows, overdueRows, milestonesCompletedRows] =
    await Promise.all([
      // All non-done tasks for in-progress count
      db
        .select({ status: tasks.status, assigneeId: tasks.assigneeId, departmentId: tasks.departmentId })
        .from(tasks)
        .where(ne(tasks.status, 'done')),

      // Tasks completed today
      db
        .select({
          taskTitle:    tasks.title,
          assigneeId:  tasks.assigneeId,
          departmentId: tasks.departmentId,
        })
        .from(tasks)
        .where(and(eq(tasks.status, 'done'), gte(tasks.updatedAt, todayStart))),

      // Overdue tasks
      db
        .select({
          taskTitle:    tasks.title,
          assigneeId:  tasks.assigneeId,
          departmentId: tasks.departmentId,
          dueDate:      tasks.dueDate,
        })
        .from(tasks)
        .where(and(ne(tasks.status, 'done'), isNotNull(tasks.dueDate), lt(tasks.dueDate, todayStr))),

      // Milestones completed today
      db
        .select({
          milestoneTitle: milestones.title,
          taskId:         milestones.taskId,
          taskTitle:      tasks.title,
          assigneeId:     tasks.assigneeId,
        })
        .from(milestones)
        .innerJoin(tasks, eq(milestones.taskId, tasks.id))
        .where(and(eq(milestones.status, 'completed'), gte(milestones.updatedAt, todayStart))),
    ])

  // ── Fetch user + department lookups ───────────────────────────────────────

  const allUserIds = [
    ...new Set([
      ...completedTodayRows.map(r => r.assigneeId),
      ...overdueRows.map(r => r.assigneeId),
      ...milestonesCompletedRows.map(r => r.assigneeId),
      ...allActiveTasks.map(r => r.assigneeId),
    ].filter(Boolean) as string[]),
  ]

  const [allUsers, allDepts] = await Promise.all([
    allUserIds.length > 0
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, allUserIds))
      : Promise.resolve([]),
    db.select({ id: departments.id, name: departments.name }).from(departments),
  ])

  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]))
  const deptMap = Object.fromEntries(allDepts.map(d => [d.id, d.name]))

  // ── Build report data ─────────────────────────────────────────────────────

  const totalInProgress = allActiveTasks.filter(t => t.status === 'in_progress').length

  const completedToday = completedTodayRows.map(r => ({
    taskTitle:      r.taskTitle,
    assigneeName:   r.assigneeId ? (userMap[r.assigneeId] ?? 'Unassigned') : 'Unassigned',
    departmentName: r.departmentId ? (deptMap[r.departmentId] ?? null) : null,
  }))

  const overdueItems = overdueRows.map(r => ({
    taskTitle:      r.taskTitle,
    assigneeName:   r.assigneeId ? (userMap[r.assigneeId] ?? 'Unassigned') : 'Unassigned',
    dueDate:        r.dueDate ?? '',
    departmentName: r.departmentId ? (deptMap[r.departmentId] ?? null) : null,
  }))

  // Per-person summary
  const personMap: Record<string, { completed: number; inProgress: number; overdue: number }> = {}
  for (const r of completedTodayRows) {
    if (!r.assigneeId) continue
    personMap[r.assigneeId] ??= { completed: 0, inProgress: 0, overdue: 0 }
    personMap[r.assigneeId].completed++
  }
  for (const r of allActiveTasks) {
    if (!r.assigneeId || r.status !== 'in_progress') continue
    personMap[r.assigneeId] ??= { completed: 0, inProgress: 0, overdue: 0 }
    personMap[r.assigneeId].inProgress++
  }
  for (const r of overdueRows) {
    if (!r.assigneeId) continue
    personMap[r.assigneeId] ??= { completed: 0, inProgress: 0, overdue: 0 }
    personMap[r.assigneeId].overdue++
  }
  const perPerson = Object.entries(personMap).map(([id, stats]) => ({
    name: userMap[id] ?? 'Unknown',
    ...stats,
  })).sort((a, b) => b.completed - a.completed)

  // Per-department summary
  const deptSummaryMap: Record<string, { completed: number; inProgress: number; overdue: number }> = {}
  for (const r of completedTodayRows) {
    if (!r.departmentId) continue
    deptSummaryMap[r.departmentId] ??= { completed: 0, inProgress: 0, overdue: 0 }
    deptSummaryMap[r.departmentId].completed++
  }
  for (const r of allActiveTasks) {
    if (!r.departmentId || r.status !== 'in_progress') continue
    deptSummaryMap[r.departmentId] ??= { completed: 0, inProgress: 0, overdue: 0 }
    deptSummaryMap[r.departmentId].inProgress++
  }
  for (const r of overdueRows) {
    if (!r.departmentId) continue
    deptSummaryMap[r.departmentId] ??= { completed: 0, inProgress: 0, overdue: 0 }
    deptSummaryMap[r.departmentId].overdue++
  }
  const perDepartment = Object.entries(deptSummaryMap).map(([id, stats]) => ({
    name: deptMap[id] ?? 'Unknown',
    ...stats,
  })).sort((a, b) => b.completed - a.completed)

  const reportData: DailyReportData = {
    date:                todayStr,
    totalCompleted:      completedToday.length,
    totalInProgress,
    totalOverdue:        overdueItems.length,
    milestonesCompleted: milestonesCompletedRows.length,
    completedToday,
    overdueItems,
    perPerson,
    perDepartment,
  }

  // ── Generate report ───────────────────────────────────────────────────────

  const { html: contentHtml, markdown: contentMarkdown } = await generateDailyReport(reportData)

  // ── Get recipients ────────────────────────────────────────────────────────

  const recipients = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(and(
      inArray(users.role, ['admin', 'manager']),
      eq(users.dailyReportEmail, true),
    ))

  const recipientIds = recipients.map(r => r.id)

  // ── Save to DB ────────────────────────────────────────────────────────────

  const [savedReport] = await db
    .insert(dailyReports)
    .values({
      date:            todayStr,
      contentHtml,
      contentMarkdown,
      recipientIds,
    })
    .returning()

  // ── Send emails ───────────────────────────────────────────────────────────

  const hasGoogleConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
  let emailSent = false

  if (hasGoogleConfig && recipients.length > 0) {
    try {
      await sendEmail({
        to:      recipients.map(r => r.email),
        subject: `Daily Progress Report — ${todayStr}`,
        html:    contentHtml,
      })
      await db
        .update(dailyReports)
        .set({ sentAt: new Date() })
        .where(eq(dailyReports.id, savedReport.id))
      emailSent = true
    } catch (err) {
      console.error('[cron] Failed to send daily report email', err)
    }
  }

  return NextResponse.json({
    reportId:   savedReport.id,
    recipients: recipients.length,
    emailSent,
  })
}
