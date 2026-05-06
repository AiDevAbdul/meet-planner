import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq, and, isNotNull } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  const conditions = [isNotNull(tasks.completedAt), isNotNull(tasks.startedAt)]
  if (projectId) conditions.push(eq(tasks.projectId, projectId))

  const doneTasks = await db.select({
    id:          tasks.id,
    title:       tasks.title,
    priority:    tasks.priority,
    startedAt:   tasks.startedAt,
    completedAt: tasks.completedAt,
  }).from(tasks).where(and(...conditions)).limit(200)

  if (doneTasks.length === 0) {
    return NextResponse.json({ average: 0, median: 0, distribution: [], byPriority: [] })
  }

  // Calculate cycle times in hours
  const cycleTimes = doneTasks.map(t => {
    const ms = new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()
    return { hours: Math.round(ms / 3600000), priority: t.priority }
  }).filter(t => t.hours >= 0)

  const hours = cycleTimes.map(c => c.hours).sort((a, b) => a - b)
  const avg   = Math.round(hours.reduce((s, h) => s + h, 0) / hours.length)
  const mid   = Math.floor(hours.length / 2)
  const median = hours.length % 2 === 0
    ? Math.round((hours[mid - 1] + hours[mid]) / 2)
    : hours[mid]

  // Distribution buckets (days)
  const buckets = [
    { label: '< 1 day',    min: 0,   max: 24,   count: 0 },
    { label: '1–3 days',   min: 24,  max: 72,   count: 0 },
    { label: '3–7 days',   min: 72,  max: 168,  count: 0 },
    { label: '1–2 weeks',  min: 168, max: 336,  count: 0 },
    { label: '> 2 weeks',  min: 336, max: Infinity, count: 0 },
  ]

  for (const h of hours) {
    for (const b of buckets) {
      if (h >= b.min && h < b.max) { b.count++; break }
    }
  }

  // By priority
  const priorityMap: Record<string, number[]> = {}
  for (const { hours: h, priority } of cycleTimes) {
    if (!priorityMap[priority]) priorityMap[priority] = []
    priorityMap[priority].push(h)
  }
  const byPriority = Object.entries(priorityMap).map(([priority, hs]) => ({
    priority,
    average: Math.round(hs.reduce((s, h) => s + h, 0) / hs.length),
    count:   hs.length,
  }))

  return NextResponse.json({
    average: avg,
    median,
    distribution: buckets.map(({ label, count }) => ({ label, count })),
    byPriority,
  })
}
