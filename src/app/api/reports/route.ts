import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { dailyReports } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

// GET /api/reports — list past daily reports, newest first
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reports = await db
    .select({
      id:              dailyReports.id,
      date:            dailyReports.date,
      contentHtml:     dailyReports.contentHtml,
      contentMarkdown: dailyReports.contentMarkdown,
      sentAt:          dailyReports.sentAt,
      recipientIds:    dailyReports.recipientIds,
      createdAt:       dailyReports.createdAt,
    })
    .from(dailyReports)
    .orderBy(desc(dailyReports.date))
    .limit(60)

  return NextResponse.json(reports)
}
