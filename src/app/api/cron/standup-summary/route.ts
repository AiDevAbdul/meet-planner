import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  projects, projectMembers, tasks, channels, messages, users,
} from '@/lib/db/schema'
import { and, eq, gte, inArray, ne } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// Vercel Cron: daily at 09:30 UTC — compile task activity into standup summary + post to project channel
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const standupProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.standupEnabled, true), inArray(projects.status, ['active', 'planning'])))

  if (!standupProjects.length) return NextResponse.json({ posted: 0 })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const today = todayStart.toISOString().split('T')[0]

  let posted = 0

  for (const project of standupProjects) {
    try {
      const [memberRows, recentTasks, todayDue] = await Promise.all([
        db.select({ userId: projectMembers.userId, role: projectMembers.role })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, project.id)),

        db.select({
          title:        tasks.title,
          status:       tasks.status,
          assigneeName: users.name,
          updatedAt:    tasks.updatedAt,
        })
          .from(tasks)
          .leftJoin(users, eq(tasks.assigneeId, users.id))
          .where(and(
            eq(tasks.projectId, project.id),
            gte(tasks.updatedAt, yesterdayStart),
          ))
          .limit(20),

        db.select({ title: tasks.title, assigneeName: users.name })
          .from(tasks)
          .leftJoin(users, eq(tasks.assigneeId, users.id))
          .where(and(
            eq(tasks.projectId, project.id),
            eq(tasks.dueDate, today),
            ne(tasks.status, 'done'),
          ))
          .limit(10),
      ])

      const taskLines = recentTasks
        .map(t => `- ${t.assigneeName ?? 'Unassigned'}: "${t.title}" → ${t.status}`)
        .join('\n')

      const dueLines = todayDue
        .map(t => `- ${t.assigneeName ?? 'Unassigned'}: "${t.title}"`)
        .join('\n')

      const prompt = `Generate a brief daily standup summary for the project team.

Project: ${project.name}
Team size: ${memberRows.length}

Task activity since yesterday:
${taskLines || '(no task updates)'}

Tasks due today:
${dueLines || '(none due today)'}

Write a concise 4-6 line standup digest in this format:
- Start with "**Standup — [project name]**"
- Yesterday's progress: key completions
- Today's focus: what's due / in progress
- Any risks or blockers based on the data
Keep it factual and under 150 words.`

      const message = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      })

      const summary = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

      // Find or create a channel named after the project
      const slug = `project-${project.id.slice(0, 8)}`
      let [channel] = await db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.slug, slug))

      if (!channel) {
        // Look for a system user or use the first member as the bot sender
        const [firstMember] = memberRows
        if (!firstMember) continue

        const [created] = await db.insert(channels).values({
          name:      `${project.name}`,
          slug,
          type:      'public',
          createdBy: firstMember.userId,
        }).returning({ id: channels.id })
        channel = created

        // Add all project members
        for (const m of memberRows) {
          await db.insert(messages).values({
            channelId: channel.id,
            userId:    m.userId,
            content:   '',
          }).onConflictDoNothing()
        }
      }

      // Post summary as first owner/manager in the channel
      const bot = memberRows.find(m => m.role === 'owner' || m.role === 'manager') ?? memberRows[0]
      if (!bot || !summary) continue

      await db.insert(messages).values({
        channelId: channel.id,
        userId:    bot.userId,
        content:   summary,
      })

      posted++
    } catch (err) {
      console.error(`Standup summary failed for project ${project.id}:`, err)
    }
  }

  return NextResponse.json({ posted })
}
