import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, sprints } from '@/lib/db/schema'
import { eq, and, lte } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sprintId  = searchParams.get('sprintId')
  const projectId = searchParams.get('projectId')

  if (!sprintId && !projectId) {
    return NextResponse.json({ error: 'sprintId or projectId required' }, { status: 400 })
  }

  let sprint: { startDate: string; endDate: string; id: string } | null = null

  if (sprintId) {
    const [s] = await db.select().from(sprints).where(eq(sprints.id, sprintId))
    if (!s) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    sprint = s
  } else {
    // Use the most recent active sprint for the project
    const rows = await db.select().from(sprints)
      .where(and(eq(sprints.projectId, projectId!), eq(sprints.status, 'active')))
    sprint = rows[0] ?? null
    if (!sprint) {
      return NextResponse.json({ points: [], totalTasks: 0 })
    }
  }

  const allTasks = await db.select({
    id:          tasks.id,
    status:      tasks.status,
    completedAt: tasks.completedAt,
    createdAt:   tasks.createdAt,
  }).from(tasks).where(eq(tasks.sprintId, sprint.id))

  const totalTasks = allTasks.length
  const start = new Date(sprint.startDate)
  const end   = new Date(sprint.endDate)

  // Generate daily ideal + actual lines
  const days: { date: string; ideal: number; actual: number }[] = []
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))

  for (let i = 0; i <= durationDays; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)

    const doneByDay = allTasks.filter(t =>
      t.completedAt && new Date(t.completedAt) <= d
    ).length

    const ideal  = Math.round(totalTasks * (1 - i / durationDays))
    const actual = totalTasks - doneByDay

    days.push({ date: dateStr, ideal, actual })
  }

  return NextResponse.json({ points: days, totalTasks, sprintName: null })
}
