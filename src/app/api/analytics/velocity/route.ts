import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, sprints } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const allSprints = await db.select().from(sprints)
    .where(eq(sprints.projectId, projectId))
    .orderBy(desc(sprints.createdAt))
    .limit(10)

  const velocity = await Promise.all(
    allSprints.map(async (sprint) => {
      const total = await db.select().from(tasks).where(eq(tasks.sprintId, sprint.id))
      const done  = total.filter(t => t.status === 'done').length
      return {
        sprintName:  sprint.name,
        startDate:   sprint.startDate,
        endDate:     sprint.endDate,
        status:      sprint.status,
        totalTasks:  total.length,
        completedTasks: done,
        completionRate: total.length > 0 ? Math.round((done / total.length) * 100) : 0,
      }
    })
  )

  return NextResponse.json({ sprints: velocity.reverse() })
}
