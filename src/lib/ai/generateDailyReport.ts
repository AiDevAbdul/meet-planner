import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface DailyReportData {
  date:                string
  totalCompleted:      number
  totalInProgress:     number
  totalOverdue:        number
  milestonesCompleted: number
  completedToday: {
    taskTitle:      string
    assigneeName:   string
    departmentName: string | null
  }[]
  overdueItems: {
    taskTitle:      string
    assigneeName:   string
    dueDate:        string
    departmentName: string | null
  }[]
  perPerson: {
    name:       string
    completed:  number
    inProgress: number
    overdue:    number
  }[]
  perDepartment: {
    name:       string
    completed:  number
    inProgress: number
    overdue:    number
  }[]
}

const SYSTEM_PROMPT = `You are a project management assistant that generates concise, professional daily progress reports.
Generate a report in TWO formats: clean HTML (for email) and Markdown (for in-app display).

HTML requirements:
- Use inline styles for email compatibility (colors: completed=#34C759, overdue=#FF3B30, in-progress=#007AFF)
- Keep it scannable: use headers, bullet lists, and a summary table
- Max ~500 words total

Markdown requirements:
- Use standard Markdown: ## headers, - bullets, **bold**
- Same structure as HTML, max ~400 words

Output ONLY valid JSON: { "html": "...", "markdown": "..." }`

function buildUserMessage(data: DailyReportData): string {
  return JSON.stringify({
    date:           data.date,
    summary: {
      completedToday:      data.totalCompleted,
      inProgressTasks:     data.totalInProgress,
      overdueTasks:        data.totalOverdue,
      milestonesCompleted: data.milestonesCompleted,
    },
    completedToday: data.completedToday.slice(0, 20),
    overdue:        data.overdueItems.slice(0, 15),
    perPerson:      data.perPerson.slice(0, 20),
    perDepartment:  data.perDepartment,
  })
}

async function generateWithAnthropic(data: DailyReportData): Promise<{ html: string; markdown: string }> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2048,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: buildUserMessage(data) }],
  })
  const block = response.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('No text from Claude')
  return JSON.parse(block.text.trim())
}

async function generateWithGemini(data: DailyReportData): Promise<{ html: string; markdown: string }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model:             'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig:  { maxOutputTokens: 2048, responseMimeType: 'application/json' },
  })
  const result = await model.generateContent(buildUserMessage(data))
  const text = result.response.text()
  if (!text) throw new Error('No text from Gemini')
  return JSON.parse(text.trim())
}

export async function generateDailyReport(data: DailyReportData): Promise<{ html: string; markdown: string }> {
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAnthropic(data)
  }
  if (process.env.GEMINI_API_KEY) {
    return generateWithGemini(data)
  }
  throw new Error('No AI provider configured')
}
