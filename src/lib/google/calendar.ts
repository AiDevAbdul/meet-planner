import { google } from 'googleapis'

function getAuth() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return oauth2
}

export async function createCalendarEvent({
  title,
  description,
  startTime,
  durationMinutes,
  location,
  attendeeEmails,
}: {
  title: string
  description?: string
  startTime: Date
  durationMinutes: number
  location?: string
  attendeeEmails: string[]
}): Promise<string> {
  const auth = getAuth()
  const calendar = google.calendar({ version: 'v3', auth })

  const endTime = new Date(startTime.getTime() + durationMinutes * 60_000)

  const res = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary:     title,
      description: description ?? '',
      location:    location ?? '',
      start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
      end:   { dateTime: endTime.toISOString(),   timeZone: 'UTC' },
      attendees: attendeeEmails.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email',  minutes: 30 },
          { method: 'popup',  minutes: 10 },
        ],
      },
    },
  })

  return res.data.id ?? ''
}
