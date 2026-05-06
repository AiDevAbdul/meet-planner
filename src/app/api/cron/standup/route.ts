import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  projects, projectMembers, users, notifications,
} from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'

// Vercel Cron: daily at 09:00 UTC — send standup DM notifications to project members
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const standupProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.standupEnabled, true), inArray(projects.status, ['active', 'planning'])))

  if (!standupProjects.length) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const project of standupProjects) {
    const members = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id))

    for (const { userId } of members) {
      await db.insert(notifications).values({
        userId,
        type:    'standup_summary',
        payload: {
          projectId:   project.id,
          projectName: project.name,
          action:      'prompt',
          message:     `Daily standup for "${project.name}": What did you work on yesterday? What are you doing today? Any blockers?`,
        },
        read: false,
      })
      sent++
    }
  }

  return NextResponse.json({ sent })
}
