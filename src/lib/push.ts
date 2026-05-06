import webpush from 'web-push'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL ?? 'admin@duckercreative.com'),
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
)

type PushPayload = {
  title:    string
  body:     string
  data?:    { url?: string }
  tag?:     string
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.keysAuth, p256dh: sub.keysP256dh } },
        JSON.stringify(payload),
      ).catch(async (err) => {
        // Remove expired/invalid subscriptions (410 Gone)
        if (err?.statusCode === 410) {
          await db.delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, sub.endpoint))
            .catch(() => {})
        }
      })
    )
  )
}
