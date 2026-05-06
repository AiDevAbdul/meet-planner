import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `You are an expert meeting secretary. Generate well-structured, professional meeting minutes from a transcript or notes. Format the output as clean Markdown that reads well as plain text when rendered.

Use this structure (include only sections that have content):

# Meeting Minutes: [Meeting Title]
**Date:** [date if known]
**Attendees:** [comma-separated list]

## Overview
[2-3 sentence summary of the meeting purpose and outcomes]

## Agenda Items Discussed
- [topic 1]
- [topic 2]

## Key Decisions
- [decision 1]
- [decision 2]

## Action Items
| Task | Owner | Deadline |
|------|-------|----------|
| [task] | [owner] | [date or TBD] |

## Next Steps
- [next step 1]
- [next step 2]

Rules:
- Be concise and professional
- Use plain Markdown (no HTML)
- If information is not in the transcript, omit that section
- Output ONLY the Markdown, no preamble or commentary`

async function generateWithAnthropic(transcript: string, meetingTitle: string): Promise<string> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2000,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: `Meeting title: ${meetingTitle}\n\nTranscript:\n${transcript}` }],
  })
  const block = response.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('No text from Claude')
  return block.text.trim()
}

async function generateWithGemini(transcript: string, meetingTitle: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model:             'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig:  { maxOutputTokens: 2000 },
  })
  const result = await model.generateContent(
    `Meeting title: ${meetingTitle}\n\nTranscript:\n${transcript}`,
  )
  const text = result.response.text()
  if (!text) throw new Error('No text from Gemini')
  return text.trim()
}

export async function generateMinutes(transcript: string, meetingTitle: string): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    return generateWithAnthropic(transcript, meetingTitle)
  }
  if (process.env.GEMINI_API_KEY) {
    return generateWithGemini(transcript, meetingTitle)
  }
  throw new Error('No AI provider configured: set ANTHROPIC_API_KEY or GEMINI_API_KEY')
}
