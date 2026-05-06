import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { timeEntries, users, projects } from '@/lib/db/schema'
import { eq, gte, sum } from 'drizzle-orm'

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getMondayOfCurrentWeek(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// GET /api/reports/time?format=csv
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  const now = new Date()
  const weekStart  = toDateString(getMondayOfCurrentWeek())
  const monthStart = toDateString(new Date(now.getFullYear(), now.getMonth(), 1))

  // Per-user hours this week
  const weekRows = await db
    .select({
      userId: timeEntries.userId,
      name:   users.name,
      total:  sum(timeEntries.minutes),
    })
    .from(timeEntries)
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .where(gte(timeEntries.date, weekStart))
    .groupBy(timeEntries.userId, users.name)

  // Per-user hours this month
  const monthRows = await db
    .select({
      userId: timeEntries.userId,
      name:   users.name,
      total:  sum(timeEntries.minutes),
    })
    .from(timeEntries)
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .where(gte(timeEntries.date, monthStart))
    .groupBy(timeEntries.userId, users.name)

  // Per-project hours this month
  const projectRows = await db
    .select({
      projectId:   timeEntries.projectId,
      projectName: projects.name,
      total:       sum(timeEntries.minutes),
    })
    .from(timeEntries)
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(gte(timeEntries.date, monthStart))
    .groupBy(timeEntries.projectId, projects.name)

  const byPersonWeek = weekRows.map(r => ({
    userId: r.userId,
    name:   r.name ?? 'Unknown',
    hours:  Math.round((Number(r.total ?? 0) / 60) * 10) / 10,
  }))

  const byPersonMonth = monthRows.map(r => ({
    userId: r.userId,
    name:   r.name ?? 'Unknown',
    hours:  Math.round((Number(r.total ?? 0) / 60) * 10) / 10,
  }))

  const byProject = projectRows.map(r => ({
    projectId:   r.projectId,
    projectName: r.projectName ?? 'No Project',
    hours:       Math.round((Number(r.total ?? 0) / 60) * 10) / 10,
  }))

  const totalWeekHours  = byPersonWeek.reduce((s, r) => s + r.hours, 0)
  const totalMonthHours = byPersonMonth.reduce((s, r) => s + r.hours, 0)

  if (format === 'csv') {
    const lines = [
      'Type,Name/Project,Hours',
      ...byPersonWeek.map(r => `This Week,${r.name},${r.hours}`),
      ...byPersonMonth.map(r => `This Month,${r.name},${r.hours}`),
      ...byProject.map(r => `Project,${r.projectName},${r.hours}`),
    ]
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': 'attachment; filename="time-report.csv"',
      },
    })
  }

  return NextResponse.json({
    totalWeekHours,
    totalMonthHours,
    byPersonWeek,
    byPersonMonth,
    byProject,
  })
}
