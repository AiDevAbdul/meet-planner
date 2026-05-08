import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, meetings, users } from '@/lib/db/schema'
import { desc, eq, ne } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await req.json()
  if (!question?.trim()) return NextResponse.json({ error: 'Question is required' }, { status: 400 })

  // Pull lightweight context from DB
  const [allTasks, recentMeetings, teamMembers] = await Promise.all([
    db
      .select({
        id: tasks.id, title: tasks.title, status: tasks.status,
        priority: tasks.priority, dueDate: tasks.dueDate,
        assigneeId: tasks.assigneeId,
      })
      .from(tasks)
      .where(ne(tasks.status, 'done'))
      .limit(50),

    db
      .select({ id: meetings.id, title: meetings.title, summary: meetings.summary, date: meetings.date })
      .from(meetings)
      .orderBy(desc(meetings.createdAt))
      .limit(10),

    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .limit(30),
  ])

  // Build assignee name map
  const userMap = Object.fromEntries(teamMembers.map(u => [u.id, u.name]))

  const context = `
## Active Tasks (${allTasks.length})
${allTasks.map(t =>
  `- [${t.status}] ${t.title} — ${t.priority} priority${t.dueDate ? `, due ${t.dueDate}` : ''}${t.assigneeId ? `, assigned to ${userMap[t.assigneeId] ?? 'unknown'}` : ', unassigned'}`
).join('\n')}

## Recent Meetings (${recentMeetings.length})
${recentMeetings.map(m =>
  `- ${m.title}${m.date ? ` (${m.date})` : ''}${m.summary ? `: ${m.summary}` : ''}`
).join('\n')}

## Team Members (${teamMembers.length})
${teamMembers.map(u => `- ${u.name} (${u.role})`).join('\n')}
`

  const systemPrompt = `You are a helpful assistant for MeetPlanner, an internal meeting and project management tool. Answer questions about tasks, meetings, and team members using the provided context. Be concise (2-4 sentences max). If you cannot answer from the context, say so briefly.`
  const userMessage = `Context:\n${context}\n\nQuestion: ${question.trim()}`

  if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    })
    const text = response.content.find(b => b.type === 'text')
    return NextResponse.json({ answer: text?.type === 'text' ? text.text : 'No answer available.' })
  }

  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: systemPrompt })
    const result = await model.generateContent(userMessage)
    return NextResponse.json({ answer: result.response.text() })
  }

  return NextResponse.json({ error: 'No AI provider configured' }, { status: 503 })
}
