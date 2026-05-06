import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TimesheetsClient } from './TimesheetsClient'

export const metadata = { title: 'Timesheets — MeetPlanner' }

export default async function TimesheetsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return <TimesheetsClient />
}
