import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Redirect user to GitHub OAuth consent screen
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'GitHub integration not configured' }, { status: 503 })

  const state = Buffer.from(session.user.id).toString('base64url')
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', 'repo,read:user')
  url.searchParams.set('state', state)
  url.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/github/callback`)

  return NextResponse.redirect(url.toString())
}
