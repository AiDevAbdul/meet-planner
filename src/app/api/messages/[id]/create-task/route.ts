import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { messages, channelMembers, tasks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

type ExtractedTask = {
  title: string
  priority: 'critical' | 'high' | 'normal' | 'low'
  description: string | null
}

const SYSTEM_PROMPT = `You are an assistant that converts a chat message into a task.
Extract the action item from the message and return ONLY a JSON object with this schema:
{
  "title": "string — concise task title (max 100 chars, imperative form e.g. 'Fix login bug')",
  "priority": "critical | high | normal | low — infer from urgency language",
  "description": "string | null — brief additional context if needed, else null"
}
No markdown fences, no extra text. Pure JSON only.`

function parseJson(raw: string): ExtractedTask {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(cleaned) as ExtractedTask
}

async function extractWithAnthropic(content: string): Promise<ExtractedTask> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Convert this message to a task:\n\n${content}` }],
  })
  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('No response from Claude')
  return parseJson(textBlock.text)
}

async function extractWithGemini(content: string): Promise<ExtractedTask> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0, maxOutputTokens: 512 },
  })
  const result = await model.generateContent(`Convert this message to a task:\n\n${content}`)
  const text = result.response.text()
  if (!text) throw new Error('No response from Gemini')
  return parseJson(text)
}

async function extractTaskFromMessage(content: string): Promise<ExtractedTask> {
  if (process.env.ANTHROPIC_API_KEY) return extractWithAnthropic(content)
  if (process.env.GEMINI_API_KEY) return extractWithGemini(content)
  throw new Error('No AI provider configured: set ANTHROPIC_API_KEY or GEMINI_API_KEY')
}

// POST /api/messages/[id]/create-task
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: messageId } = await params
  const userId = session.user.id

  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1)

  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  const [membership] = await db
    .select()
    .from(channelMembers)
    .where(and(eq(channelMembers.channelId, message.channelId), eq(channelMembers.userId, userId)))
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const extracted = await extractTaskFromMessage(message.content).catch((err: unknown) => {
    console.error('[create-task] AI extraction failed:', err)
    return null
  })

  if (!extracted) {
    return NextResponse.json({ error: 'AI extraction failed' }, { status: 500 })
  }

  const [task] = await db
    .insert(tasks)
    .values({
      title:       extracted.title,
      description: extracted.description ?? null,
      priority:    extracted.priority,
      status:      'triage',
      createdBy:   userId,
      position:    0,
    })
    .returning()

  await db
    .update(messages)
    .set({ flagged: true })
    .where(eq(messages.id, messageId))

  return NextResponse.json(task, { status: 201 })
}
