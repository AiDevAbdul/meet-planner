import { db } from '@/lib/db'
import { outboundWebhooks, webhookDeliveries } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { createHmac } from 'crypto'

export type WebhookEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.status_changed'
  | 'task.assigned'

export async function fireWebhooks(projectId: string, event: WebhookEvent, payload: Record<string, unknown>) {
  const hooks = await db
    .select()
    .from(outboundWebhooks)
    .where(and(
      eq(outboundWebhooks.projectId, projectId),
      eq(outboundWebhooks.active, true),
      sql`${outboundWebhooks.events} @> ${JSON.stringify([event])}::jsonb`,
    ))

  await Promise.allSettled(hooks.map(hook => deliverWebhook(hook, event, payload)))
}

async function deliverWebhook(
  hook: { id: string; url: string; secret: string | null },
  event: WebhookEvent,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify({ event, payload, timestamp: Date.now() })
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-MeetPlanner-Event': event,
  }

  if (hook.secret) {
    const sig = createHmac('sha256', hook.secret).update(body).digest('hex')
    headers['X-MeetPlanner-Signature'] = `sha256=${sig}`
  }

  let statusCode: number | null = null
  let responseBody = ''
  let success = false

  try {
    const res = await fetch(hook.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
    statusCode = res.status
    responseBody = await res.text().catch(() => '')
    success = res.ok
  } catch (err: unknown) {
    responseBody = err instanceof Error ? err.message : 'Network error'
  }

  await db.insert(webhookDeliveries).values({
    webhookId: hook.id,
    event,
    payload,
    statusCode,
    responseBody: responseBody.slice(0, 2000),
    success,
  }).catch(() => {})
}
