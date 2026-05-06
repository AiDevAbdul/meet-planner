import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq, isNotNull, and } from 'drizzle-orm'
import { addDays, addWeeks, addMonths, addYears, format } from 'date-fns'

// POST /api/cron/recurring-tasks — run daily; create next instance for recurring tasks completed today
export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const completedRecurring = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.status, 'done'), isNotNull(tasks.recurrenceRule)))

  let created = 0

  for (const task of completedRecurring) {
    if (!task.recurrenceRule || !task.dueDate) continue

    const baseDue = new Date(task.dueDate)
    let nextDue: Date

    switch (task.recurrenceRule) {
      case 'daily':    nextDue = addDays(baseDue, 1);    break
      case 'weekly':   nextDue = addWeeks(baseDue, 1);   break
      case 'biweekly': nextDue = addWeeks(baseDue, 2);   break
      case 'monthly':  nextDue = addMonths(baseDue, 1);  break
      case 'yearly':   nextDue = addYears(baseDue, 1);   break
      default: continue
    }

    await db.insert(tasks).values({
      title:          task.title,
      description:    task.description,
      priority:       task.priority,
      status:         'todo',
      assigneeId:     task.assigneeId,
      departmentId:   task.departmentId,
      projectId:      task.projectId,
      recurrenceRule: task.recurrenceRule,
      dueDate:        format(nextDue, 'yyyy-MM-dd'),
      createdBy:      task.createdBy,
    })

    // Clear recurrence from completed task so it doesn't spawn again
    await db.update(tasks).set({ recurrenceRule: null }).where(eq(tasks.id, task.id))

    created++
  }

  return NextResponse.json({ created })
}
