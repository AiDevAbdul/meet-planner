import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sprints, tasks } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id))
  if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sprintTasks = await db.select({
    title:  tasks.title,
    status: tasks.status,
  }).from(tasks).where(eq(tasks.sprintId, id))

  const done      = sprintTasks.filter(t => t.status === 'done').length
  const notDone   = sprintTasks.filter(t => t.status !== 'done').length
  const total     = sprintTasks.length
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0

  let retroSummary = body.retroSummary as string | undefined

  if (!retroSummary) {
    try {
      const msg = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Generate a concise sprint retrospective summary (3–5 sentences) for:
Sprint: "${sprint.name}"
Goal: ${sprint.goal ?? 'None'}
Completed: ${done}/${total} tasks (${pct}%)
Not completed: ${notDone} tasks

Focus on: what was achieved, what carried over, lessons learned. Be direct and factual.`,
        }],
      })
      retroSummary = (msg.content[0] as { type: string; text: string }).text
    } catch {
      retroSummary = `Sprint completed with ${done}/${total} tasks (${pct}%) done. ${notDone} task(s) carried over.`
    }
  }

  // Move incomplete tasks out of this sprint (carry forward)
  await db.update(tasks)
    .set({ sprintId: null })
    .where(and(eq(tasks.sprintId, id), ne(tasks.status, 'done')))

  const [updated] = await db.update(sprints)
    .set({ status: 'completed', retroSummary, updatedAt: new Date() })
    .where(eq(sprints.id, id))
    .returning()

  return NextResponse.json({ sprint: updated, retroSummary })
}
