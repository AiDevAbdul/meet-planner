import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

type MessageInput = { id: string; content: string }

const SYSTEM_PROMPT = `You are a classifier that determines which chat messages contain an actionable work item.

A message IS actionable if it contains: a task assignment, a work request, a deliverable, a follow-up item, or a clear action someone should take (e.g. "can you send the report", "we need to fix the login bug", "prepare the slides by Friday").

A message is NOT actionable if it is: a greeting, a one-word reaction, casual chat, a question with no implied task, or purely informational with no required action (e.g. "hi", "sounds good", "I agree", "meeting at 3pm").

Input: JSON array of { "id": string, "content": string }
Output: JSON array of IDs (strings only) that are actionable. Empty array if none.
No markdown fences, no extra text. Pure JSON only.`

function parseIds(raw: string): string[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  // Try direct parse first
  try {
    return JSON.parse(cleaned) as string[]
  } catch {
    // Gemini sometimes wraps in prose — extract the JSON array substring
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0]) as string[]
    // Last resort: empty = no actionable messages
    console.error('[classify-actionable] unparseable response:', cleaned.slice(0, 200))
    return []
  }
}

async function classifyWithAnthropic(messages: MessageInput[]): Promise<string[]> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(messages) }],
  })
  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return []
  return parseIds(textBlock.text)
}

async function classifyWithGemini(messages: MessageInput[]): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0, maxOutputTokens: 4096 },
  })
  const result = await model.generateContent(JSON.stringify(messages))
  const text = result.response.text()
  if (!text) return []
  return parseIds(text)
}

// POST /api/messages/classify-actionable
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { messages?: MessageInput[] }
  const messages = body.messages ?? []

  if (!messages.length) {
    return NextResponse.json({ actionable: [] })
  }

  const actionable = await (async () => {
    if (process.env.ANTHROPIC_API_KEY) return classifyWithAnthropic(messages)
    if (process.env.GEMINI_API_KEY) return classifyWithGemini(messages)
    return []
  })().catch(err => {
    console.error('[classify-actionable] failed:', err)
    return []
  })

  return NextResponse.json({ actionable })
}
