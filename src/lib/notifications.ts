import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'

/**
 * Create a notification for a user.
 *
 * @param userId  The UUID of the recipient.
 * @param type    One of the notif_type enum values.
 * @param payload Key-value map used to render the notification message.
 */
export async function createNotification(
  userId: string,
  type: string,
  payload: Record<string, string>,
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type:    type as any,
    payload,
    read:    false,
  })
}
