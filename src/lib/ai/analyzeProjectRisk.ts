import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type ProjectRiskInput = {
  projectName: string
  status: string
  startDate: string | null
  endDate: string | null
  totalTasks: number
  doneTasks: number
  overdueTasks: number
  inProgressTasks: number
  budgetCents: number | null
  spentCents: number
  memberCount: number
}

export type ProjectRiskResult = {
  riskLevel: RiskLevel
  explanation: string
  factors: string[]
}

export async function analyzeProjectRisk(input: ProjectRiskInput): Promise<ProjectRiskResult> {
  const daysLeft = input.endDate
    ? Math.ceil((new Date(input.endDate).getTime() - Date.now()) / 86_400_000)
    : null

  const pct = input.totalTasks > 0
    ? Math.round((input.doneTasks / input.totalTasks) * 100)
    : 0

  const budgetPct = input.budgetCents && input.budgetCents > 0
    ? Math.round((input.spentCents / input.budgetCents) * 100)
    : null

  const prompt = `You are a project risk analyst. Assess the health of this project and return a JSON risk report.

Project: ${input.projectName}
Status: ${input.status}
Timeline: ${input.startDate ?? 'no start'} → ${input.endDate ?? 'no end date'}${daysLeft !== null ? ` (${daysLeft} days remaining)` : ''}
Progress: ${pct}% complete (${input.doneTasks}/${input.totalTasks} tasks done)
Overdue tasks: ${input.overdueTasks}
In-progress tasks: ${input.inProgressTasks}
Team size: ${input.memberCount} member(s)
${budgetPct !== null ? `Budget: ${budgetPct}% spent` : 'Budget: not set'}

Return raw JSON only (no markdown):
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "explanation": "2-3 sentence plain-English summary of the project health and main risk drivers",
  "factors": ["factor 1", "factor 2", "factor 3"]
}

Guidelines:
- low: on track, minimal blockers
- medium: some overdue tasks or timeline pressure
- high: many overdue tasks, behind schedule, or near budget limit
- critical: severely overdue, budget exceeded, or stalled

Be concise and factual.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const jsonStr = raw.startsWith('{') ? raw : raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  const result = JSON.parse(jsonStr) as ProjectRiskResult
  return result
}
