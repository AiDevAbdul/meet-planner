import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, startDate, endDate } = await req.json()

  const prompt = `You are a project planning assistant. Given the project details below, suggest an initial project plan.

Project name: ${name}
Description: ${description ?? 'Not provided'}
Start date: ${startDate ?? 'Not specified'}
End date: ${endDate ?? 'Not specified'}

Return a JSON object with this exact shape (no markdown, raw JSON only):
{
  "suggestedTasks": [
    { "title": "string", "description": "string", "priority": "critical|high|normal|low", "daysFromStart": number }
  ],
  "suggestedMilestones": ["string"],
  "risks": ["string"],
  "summary": "string"
}

Suggest 5-8 realistic initial tasks. Keep titles concise (under 60 chars). Risks should be 2-3 items.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const plan = JSON.parse(raw)
    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
  }
}
