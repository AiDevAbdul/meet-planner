import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, projectExpenses, timeEntries } from '@/lib/db/schema'
import { eq, sum, count } from 'drizzle-orm'

// GET /api/projects/[id]/budget
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: projectId } = await params

  const [project] = await db
    .select({ budget: projects.budget })
    .from(projects)
    .where(eq(projects.id, projectId))

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [expResult] = await db
    .select({
      total:         sum(projectExpenses.amountCents),
      expensesCount: count(projectExpenses.id),
    })
    .from(projectExpenses)
    .where(eq(projectExpenses.projectId, projectId))

  const [timeResult] = await db
    .select({ total: sum(timeEntries.minutes) })
    .from(timeEntries)
    .where(eq(timeEntries.projectId, projectId))

  return NextResponse.json({
    budget:        project.budget ?? null,
    spentCents:    Number(expResult?.total ?? 0),
    timeMinutes:   Number(timeResult?.total ?? 0),
    expensesCount: Number(expResult?.expensesCount ?? 0),
  })
}
