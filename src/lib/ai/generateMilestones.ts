import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface MilestoneSuggestion {
  title: string
}

const SYSTEM_PROMPT = `You are a project planning expert. Given a task title and description, suggest 3–5 concrete, actionable milestones (sub-goals) that would help track progress toward completing the task.

Rules:
- Each milestone should be a clear, measurable step
- Order them chronologically (earliest first)
- Keep titles concise (under 60 characters each)
- Be specific to the task, not generic
- Output ONLY valid JSON: an array of objects with a "title" field
- Example: [{"title":"Research existing solutions"},{"title":"Draft initial design"}]`

async function generateWithAnthropic(
  taskTitle: string,
  taskDescription: string | null,
): Promise<MilestoneSuggestion[]> {
  const client = new Anthropic()
  const content = taskDescription
    ? `Task: ${taskTitle}\nDescription: ${taskDescription}`
    : `Task: ${taskTitle}`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 512,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content }],
  })
  const block = response.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('No text from Claude')
  return JSON.parse(block.text.trim()) as MilestoneSuggestion[]
}

async function generateWithGemini(
  taskTitle: string,
  taskDescription: string | null,
): Promise<MilestoneSuggestion[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model:             'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig:  { maxOutputTokens: 512, responseMimeType: 'application/json' },
  })
  const content = taskDescription
    ? `Task: ${taskTitle}\nDescription: ${taskDescription}`
    : `Task: ${taskTitle}`
  const result = await model.generateContent(content)
  const text = result.response.text()
  if (!text) throw new Error('No text from Gemini')
  return JSON.parse(text.trim()) as MilestoneSuggestion[]
}

export async function generateMilestones(
  taskTitle: string,
  taskDescription: string | null,
): Promise<MilestoneSuggestion[]> {
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAnthropic(taskTitle, taskDescription)
  }
  if (process.env.GEMINI_API_KEY) {
    return generateWithGemini(taskTitle, taskDescription)
  }
  throw new Error('No AI provider configured: set ANTHROPIC_API_KEY or GEMINI_API_KEY')
}
