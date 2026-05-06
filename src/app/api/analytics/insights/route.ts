import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chartType, data } = await req.json()

  const prompts: Record<string, string> = {
    burndown: `Analyze this sprint burndown chart data and write 3–5 sentences of insight. Data: ${JSON.stringify(data)}. Comment on pace, whether the team is on track, and any concerning trends.`,
    velocity: `Analyze this sprint velocity data and write 3–5 sentences of insight. Data: ${JSON.stringify(data)}. Comment on trends, consistency, and improvement or decline over time.`,
    cycleTime: `Analyze this cycle time distribution data and write 3–5 sentences of insight. Data: ${JSON.stringify(data)}. Comment on average completion time, outliers, and what this means for planning.`,
    statusBreakdown: `Analyze this task status breakdown and write 3–5 sentences of insight. Data: ${JSON.stringify(data)}. Comment on pipeline health, bottlenecks, and what needs attention.`,
    workload: `Analyze this team workload data and write 3–5 sentences of insight. Data: ${JSON.stringify(data)}. Comment on balance, who is overloaded, and recommendations for rebalancing.`,
    priority: `Analyze this task priority breakdown and write 3–5 sentences of insight. Data: ${JSON.stringify(data)}. Comment on whether the team is focused on the right priorities.`,
  }

  const prompt = prompts[chartType] ?? `Write 3–5 sentences of analytical insight about this data: ${JSON.stringify(data)}`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    })
    const text = (msg.content[0] as { type: string; text: string }).text
    return NextResponse.json({ insight: text })
  } catch {
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
