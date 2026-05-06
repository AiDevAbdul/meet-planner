import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { timeEntries, tasks, projects } from '@/lib/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'

// GET /api/timesheets?week=YYYY-MM-DD (Monday start of week)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')

  // Parse or default to current Monday
  let weekStart: Date
  if (weekParam) {
    weekStart = new Date(weekParam)
  } else {
    weekStart = getMondayOfCurrentWeek()
  }

  // Ensure it's a Monday
  const dayOfWeek = weekStart.getDay()
  if (dayOfWeek !== 1) {
    // Adjust to the Monday of that week
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    weekStart = new Date(weekStart)
    weekStart.setDate(weekStart.getDate() + diff)
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const startStr = toDateString(weekStart)
  const endStr   = toDateString(weekEnd)

  // Query entries for this user in the week
  const rows = await db
    .select({
      id:          timeEntries.id,
      date:        timeEntries.date,
      minutes:     timeEntries.minutes,
      note:        timeEntries.note,
      billable:    timeEntries.billable,
      taskId:      timeEntries.taskId,
      projectId:   timeEntries.projectId,
      taskTitle:   tasks.title,
      projectName: projects.name,
    })
    .from(timeEntries)
    .leftJoin(tasks,    eq(timeEntries.taskId,    tasks.id))
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(
      and(
        eq(timeEntries.userId, session.user.id),
        gte(timeEntries.date, startStr),
        lte(timeEntries.date, endStr),
      ),
    )

  // Build per-day totals (Mon–Sun)
  const dayMap: Record<string, number> = {}
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    dayMap[toDateString(d)] = 0
  }

  for (const row of rows) {
    if (row.date && dayMap[row.date] !== undefined) {
      dayMap[row.date] += row.minutes
    }
  }

  const days = Object.entries(dayMap).map(([date, minutes]) => ({ date, minutes }))

  return NextResponse.json({
    weekStart: startStr,
    days,
    entries: rows,
  })
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

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}
