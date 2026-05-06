import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, tasks, projectMembers } from '@/lib/db/schema'
import { and, eq, inArray, ne } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, projectId, priority } = await req.json()

  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  // Fetch candidates: project members if projectId, otherwise all users
  let candidateIds: string[] = []
  if (projectId) {
    const members = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
    candidateIds = members.map(m => m.userId)
  }

  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(candidateIds.length > 0 ? inArray(users.id, candidateIds) : undefined as any)
    .limit(20)

  if (!allUsers.length) return NextResponse.json({ suggestions: [] })

  // Get current in-progress task counts per user
  const activeTasks = await db
    .select({ assigneeId: tasks.assigneeId })
    .from(tasks)
    .where(and(
      inArray(tasks.status, ['todo', 'in_progress', 'review']),
      inArray(tasks.assigneeId, allUsers.map(u => u.id)),
    ))

  const loadMap: Record<string, number> = {}
  for (const t of activeTasks) {
    if (t.assigneeId) loadMap[t.assigneeId] = (loadMap[t.assigneeId] ?? 0) + 1
  }

  const userLines = allUsers
    .map(u => `- ${u.name} (${u.role}) — ${loadMap[u.id] ?? 0} active tasks`)
    .join('\n')

  const prompt = `You are a task assignment assistant. Suggest the best 2-3 team members for this task.

Task: ${title}
${description ? `Description: ${description}` : ''}
Priority: ${priority ?? 'normal'}

Team members (name, role, current active task count):
${userLines}

Return raw JSON only:
{
  "suggestions": [
    { "userId": "...", "name": "...", "reason": "one short sentence why" }
  ]
}

Pick based on: lower workload, appropriate role. Return 1-3 suggestions ordered best first.`

  const message = await anthropic.messages.create({
    model:    'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const jsonStr = raw.startsWith('{') ? raw : raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  const result = JSON.parse(jsonStr) as { suggestions: { userId: string; name: string; reason: string }[] }

  // Validate userIds against actual user list
  const validIds = new Set(allUsers.map(u => u.id))
  const suggestions = (result.suggestions ?? []).filter(s => validIds.has(s.userId))

  return NextResponse.json({ suggestions })
}
