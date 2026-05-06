import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, tasks, departments, userAvailability, userSkills } from '@/lib/db/schema'
import { eq, ne, and, inArray, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const [allUsers, activeTasks, allAvailability, allSkills] = await Promise.all([
    db
      .select({
        id:           users.id,
        name:         users.name,
        email:        users.email,
        avatarUrl:    users.avatarUrl,
        role:         users.role,
        departmentId: users.departmentId,
      })
      .from(users)
      .orderBy(users.name),

    db
      .select({
        id:         tasks.id,
        title:      tasks.title,
        status:     tasks.status,
        priority:   tasks.priority,
        dueDate:    tasks.dueDate,
        projectId:  tasks.projectId,
        assigneeId: tasks.assigneeId,
      })
      .from(tasks)
      .where(ne(tasks.status, 'done')),

    db
      .select({
        userId:         userAvailability.userId,
        date:           userAvailability.date,
        type:           userAvailability.type,
        hoursAvailable: userAvailability.hoursAvailable,
      })
      .from(userAvailability),

    db
      .select({
        userId: userSkills.userId,
        skill:  userSkills.skill,
      })
      .from(userSkills),
  ])

  const tasksByUser = new Map<string, typeof activeTasks>()
  for (const task of activeTasks) {
    if (!task.assigneeId) continue
    if (!tasksByUser.has(task.assigneeId)) tasksByUser.set(task.assigneeId, [])
    tasksByUser.get(task.assigneeId)!.push(task)
  }

  const availByUser = new Map<string, typeof allAvailability>()
  for (const av of allAvailability) {
    if (!availByUser.has(av.userId)) availByUser.set(av.userId, [])
    availByUser.get(av.userId)!.push(av)
  }

  const skillsByUser = new Map<string, string[]>()
  for (const s of allSkills) {
    if (!skillsByUser.has(s.userId)) skillsByUser.set(s.userId, [])
    skillsByUser.get(s.userId)!.push(s.skill)
  }

  const DAILY_CAPACITY_HOURS = 8
  const WORK_DAYS_IN_WINDOW  = 10

  const result = allUsers.map(user => {
    const userTasks       = tasksByUser.get(user.id) ?? []
    const availability    = availByUser.get(user.id) ?? []
    const skills          = skillsByUser.get(user.id) ?? []

    const overdueCount = userTasks.filter(t => t.dueDate && t.dueDate < today).length
    const taskCount    = userTasks.length

    const unavailableDays = availability.filter(a => a.type !== 'partial').length
    const partialHoursLost = availability
      .filter(a => a.type === 'partial')
      .reduce((acc, a) => acc + (DAILY_CAPACITY_HOURS - a.hoursAvailable), 0)

    const totalCapacityHours =
      (WORK_DAYS_IN_WINDOW - unavailableDays) * DAILY_CAPACITY_HOURS - partialHoursLost

    const estimatedTaskHours = taskCount * 4
    const workloadScore = totalCapacityHours > 0
      ? Math.min(100, Math.round((estimatedTaskHours / totalCapacityHours) * 100))
      : taskCount > 0 ? 100 : 0

    return {
      user,
      tasks:         userTasks,
      availability,
      skills,
      taskCount,
      overdueCount,
      workloadScore,
    }
  })

  return NextResponse.json({ data: result })
}
