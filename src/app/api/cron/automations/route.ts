import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  automations, tasks, projects, projectMembers,
  notifications, milestones,
} from '@/lib/db/schema'
import { and, eq, gte, ne, inArray, sql } from 'drizzle-orm'

type TaskStatus   = 'triage' | 'todo' | 'in_progress' | 'review' | 'done'
type TaskPriority = 'critical' | 'high' | 'normal' | 'low'

// Vercel Cron: every hour — evaluate time-based automation triggers
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now   = new Date()
  const fired: string[] = []

  // Fetch all enabled automations
  const allAutomations = await db
    .select()
    .from(automations)
    .where(eq(automations.enabled, true))

  if (!allAutomations.length) return NextResponse.json({ fired: 0 })

  // Gather unique project IDs
  const projectIds = [...new Set(allAutomations.map(a => a.projectId))]

  // Pre-fetch project members (for broadcast notifications)
  const memberRows = await db
    .select({ projectId: projectMembers.projectId, userId: projectMembers.userId })
    .from(projectMembers)
    .where(inArray(projectMembers.projectId, projectIds))

  const membersByProject: Record<string, string[]> = {}
  for (const m of memberRows) {
    if (!membersByProject[m.projectId]) membersByProject[m.projectId] = []
    membersByProject[m.projectId].push(m.userId)
  }

  // Pre-fetch project tasks (status, dueDate, assigneeId)
  const taskRows = await db
    .select({
      id:         tasks.id,
      title:      tasks.title,
      status:     tasks.status,
      priority:   tasks.priority,
      dueDate:    tasks.dueDate,
      assigneeId: tasks.assigneeId,
      projectId:  tasks.projectId,
      updatedAt:  tasks.updatedAt,
    })
    .from(tasks)
    .where(and(inArray(tasks.projectId, projectIds), ne(tasks.status, 'done')))

  const tasksByProject: Record<string, typeof taskRows> = {}
  for (const t of taskRows) {
    if (!t.projectId) continue
    if (!tasksByProject[t.projectId]) tasksByProject[t.projectId] = []
    tasksByProject[t.projectId].push(t)
  }

  // Helper: insert notification
  async function notify(userId: string, automationName: string, message: string) {
    await db.insert(notifications).values({
      userId,
      type: 'automation_triggered',
      payload: { automationName, message },
    })
  }

  // Helper: bump runCount + lastRunAt
  async function markRun(automationId: string) {
    await db
      .update(automations)
      .set({ lastRunAt: now, runCount: sql`${automations.runCount} + 1` })
      .where(eq(automations.id, automationId))
  }

  for (const auto of allAutomations) {
    const cfg = (auto.triggerConfig ?? {}) as Record<string, unknown>
    const act = (auto.actionConfig ?? {}) as Record<string, unknown>
    const members = membersByProject[auto.projectId] ?? []
    const projTasks = tasksByProject[auto.projectId] ?? []

    try {
      // ── task_overdue ─────────────────────────────────────────────────────
      if (auto.triggerType === 'task_overdue') {
        const overdue = projTasks.filter(t =>
          t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
        )
        for (const t of overdue) {
          if (!t.assigneeId) continue
          if (auto.actionType === 'send_notification') {
            await notify(
              t.assigneeId,
              auto.name,
              act.message as string ?? `Task "${t.title}" is overdue.`,
            )
          } else if (auto.actionType === 'change_task_status' && act.status) {
            await db.update(tasks).set({ status: act.status as TaskStatus, updatedAt: now }).where(eq(tasks.id, t.id))
          } else if (auto.actionType === 'change_task_priority' && act.priority) {
            await db.update(tasks).set({ priority: act.priority as TaskPriority, updatedAt: now }).where(eq(tasks.id, t.id))
          }
          fired.push(auto.id)
        }
        if (overdue.length) await markRun(auto.id)
        continue
      }

      // ── due_date_approaching ─────────────────────────────────────────────
      if (auto.triggerType === 'due_date_approaching') {
        const daysAhead = Number(cfg.days ?? 2)
        const targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + daysAhead)
        const targetStr = targetDate.toISOString().split('T')[0]

        const approaching = projTasks.filter(t => t.dueDate === targetStr)
        for (const t of approaching) {
          if (!t.assigneeId) continue
          if (auto.actionType === 'send_notification') {
            await notify(
              t.assigneeId,
              auto.name,
              act.message as string ?? `Task "${t.title}" is due in ${daysAhead} day(s).`,
            )
          }
          fired.push(auto.id)
        }
        if (approaching.length) await markRun(auto.id)
        continue
      }

      // ── task_status_changed (check tasks updated in the last hour) ────────
      if (auto.triggerType === 'task_status_changed') {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        const toStatus   = cfg.to as string | undefined

        const changed = projTasks.filter(t =>
          t.updatedAt >= oneHourAgo &&
          (!toStatus || t.status === toStatus)
        )

        for (const t of changed) {
          const targets = auto.actionType === 'send_notification'
            ? (t.assigneeId ? [t.assigneeId] : members)
            : []

          for (const uid of targets) {
            await notify(uid, auto.name, act.message as string ?? `Task "${t.title}" status changed to ${t.status}.`)
          }

          if (auto.actionType === 'change_task_priority' && act.priority) {
            await db.update(tasks).set({ priority: act.priority as TaskPriority, updatedAt: now }).where(eq(tasks.id, t.id))
          }
          fired.push(auto.id)
        }
        if (changed.length) await markRun(auto.id)
        continue
      }

      // ── task_priority_changed ─────────────────────────────────────────────
      if (auto.triggerType === 'task_priority_changed') {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        const toPriority = cfg.to as string | undefined

        const changed = projTasks.filter(t =>
          t.updatedAt >= oneHourAgo &&
          (!toPriority || t.priority === toPriority)
        )

        for (const t of changed) {
          for (const uid of members) {
            await notify(uid, auto.name, act.message as string ?? `Task "${t.title}" priority is now ${t.priority}.`)
          }
          fired.push(auto.id)
        }
        if (changed.length) await markRun(auto.id)
        continue
      }

      // ── milestone_completed ───────────────────────────────────────────────
      if (auto.triggerType === 'milestone_completed') {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        const taskIds    = projTasks.map(t => t.id)
        if (!taskIds.length) continue

        const completedMilestones = await db
          .select({ id: milestones.id, title: milestones.title })
          .from(milestones)
          .where(
            and(
              inArray(milestones.taskId, taskIds),
              eq(milestones.status, 'completed'),
              gte(milestones.completedAt!, oneHourAgo),
            )
          )

        for (const ms of completedMilestones) {
          for (const uid of members) {
            await notify(uid, auto.name, act.message as string ?? `Milestone "${ms.title}" was completed.`)
          }
          fired.push(auto.id)
        }
        if (completedMilestones.length) await markRun(auto.id)
        continue
      }

      // ── project_status_changed ────────────────────────────────────────────
      if (auto.triggerType === 'project_status_changed') {
        const toStatus = cfg.to as string | undefined
        const proj = await db
          .select({ status: projects.status, updatedAt: projects.updatedAt })
          .from(projects)
          .where(eq(projects.id, auto.projectId))
          .limit(1)

        if (!proj.length) continue
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        const recent     = proj[0].updatedAt >= oneHourAgo
        const match      = !toStatus || proj[0].status === toStatus

        if (recent && match) {
          for (const uid of members) {
            await notify(uid, auto.name, act.message as string ?? `Project status changed to ${proj[0].status}.`)
          }
          fired.push(auto.id)
          await markRun(auto.id)
        }
        continue
      }

    } catch {
      // individual automation failure should not abort the rest
    }
  }

  return NextResponse.json({ fired: fired.length, automationIds: [...new Set(fired)] })
}
