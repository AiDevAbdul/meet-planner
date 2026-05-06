import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { milestones, tasks, users } from '@/lib/db/schema'
import { and, eq, inArray, ne, or } from 'drizzle-orm'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/google/gmail'

// Vercel Cron: daily at 8am — find milestones due today or tomorrow, notify assignees
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now      = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Find incomplete milestones due today or tomorrow that have an assignee via their task
  const dueMilestones = await db
    .select({
      milestone: milestones,
      taskTitle: tasks.title,
      assigneeId: tasks.assigneeId,
    })
    .from(milestones)
    .innerJoin(tasks, eq(milestones.taskId, tasks.id))
    .where(
      and(
        ne(milestones.status, 'completed'),
        or(
          eq(milestones.dueDate, todayStr),
          eq(milestones.dueDate, tomorrowStr),
        ),
      )
    )

  if (dueMilestones.length === 0) {
    return NextResponse.json({ reminded: 0 })
  }

  // Collect unique assignee IDs
  const assigneeIds = [...new Set(
    dueMilestones.map(r => r.assigneeId).filter(Boolean) as string[]
  )]

  const assignees = assigneeIds.length > 0
    ? await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(inArray(users.id, assigneeIds))
    : []

  const assigneeMap = Object.fromEntries(assignees.map(u => [u.id, u]))
  const hasGoogleConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)

  let reminded = 0

  for (const row of dueMilestones) {
    if (!row.assigneeId) continue
    const assignee = assigneeMap[row.assigneeId]
    if (!assignee) continue

    const isToday = row.milestone.dueDate === todayStr
    const label   = isToday ? 'today' : 'tomorrow'

    // In-app notification
    await createNotification(assignee.id, 'milestone_due', {
      milestoneTitle: row.milestone.title,
      taskTitle:      row.taskTitle,
      dueLabel:       label,
    })

    // Email reminder
    if (hasGoogleConfig) {
      try {
        await sendEmail({
          to:      [assignee.email],
          subject: `Milestone due ${label}: "${row.milestone.title}"`,
          html: `
            <h2>Milestone Reminder</h2>
            <p>Your milestone <strong>"${row.milestone.title}"</strong> is due <strong>${label}</strong>.</p>
            <p><strong>Task:</strong> ${row.taskTitle}</p>
          `,
        })
      } catch (err) {
        console.error('[cron] Failed to send milestone reminder email', row.milestone.id, err)
      }
    }

    reminded++
  }

  return NextResponse.json({ reminded })
}
