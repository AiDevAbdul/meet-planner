import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type ExtractedTask = {
  title: string
  assignee_name: string | null
  priority: 'critical' | 'high' | 'normal' | 'low'
  due_date: string | null
  description: string | null
}

export type ExtractedMeeting = {
  title: string
  summary: string
  date: string | null
  decisions: string[]
  attendees: { name: string; email: string }[]
  tasks: ExtractedTask[]
}

function buildSystemPrompt(rosterText: string): string {
  return `You are an AI assistant that extracts structured data from meeting notes and transcripts.

## Team Roster
The following people are on the team. When matching assignee names from the notes, use their exact name as listed here so downstream code can look them up:
${rosterText}

## Output Format
Respond ONLY with a valid JSON object matching this exact schema:
{
  "title": "string — concise meeting title (max 80 chars)",
  "summary": "string — 2-4 sentence executive summary of what was discussed and decided",
  "date": "string | null — ISO 8601 date (YYYY-MM-DD) extracted from the notes, or null if not found",
  "decisions": ["array of strings — key decisions made, each as a short declarative sentence"],
  "attendees": [{"name": "string", "email": "string — use roster email if name matches, else leave empty string"}],
  "tasks": [
    {
      "title": "string — short action item title (max 100 chars)",
      "assignee_name": "string | null — exact name from team roster if matched, else null",
      "priority": "critical | high | normal | low — infer from context and urgency language",
      "due_date": "string | null — ISO 8601 date if mentioned, else null",
      "description": "string | null — additional context or acceptance criteria for the task"
    }
  ]
}

## Rules
- Extract ALL action items, assignments, and follow-ups as tasks
- Match assignees to the team roster by first name, last name, or common nickname
- If a task has no clear assignee, set assignee_name to null
- Priority inference: "ASAP", "urgent", "critical", "blocker" = critical; "important", "soon", "priority" = high; "when you can", "low priority", "nice to have" = low; default = normal
- Do not invent information — only extract what is in the notes
- Output must be valid JSON with no markdown fences, no comments, no extra text`
}

function parseJsonResponse(raw: string): ExtractedMeeting {
  const jsonStr = raw.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return JSON.parse(jsonStr)
}

async function extractWithAnthropic(
  systemPrompt: string,
  userContent: string
): Promise<ExtractedMeeting> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  return parseJsonResponse(textBlock.text)
}

async function extractWithGemini(
  systemPrompt: string,
  userContent: string
): Promise<ExtractedMeeting> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
    },
  })

  const result = await model.generateContent(userContent)
  const text = result.response.text()
  if (!text) throw new Error('No text response from Gemini')

  return parseJsonResponse(text)
}

export async function extractMeeting(
  rawContent: string,
  teamRoster: { name: string; email: string; role: string }[]
): Promise<ExtractedMeeting> {
  const rosterText = teamRoster
    .map(m => `- ${m.name} <${m.email}> (${m.role})`)
    .join('\n')

  const systemPrompt = buildSystemPrompt(rosterText)
  const userContent = `Please extract structured data from these meeting notes:\n\n${rawContent}`

  if (process.env.ANTHROPIC_API_KEY) {
    return extractWithAnthropic(systemPrompt, userContent)
  }

  if (process.env.GEMINI_API_KEY) {
    return extractWithGemini(systemPrompt, userContent)
  }

  throw new Error('No AI provider configured: set ANTHROPIC_API_KEY or GEMINI_API_KEY')
}
