import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { accounts, sessions, users, verificationTokens } from '@/lib/db/schema'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? 'duckercreative.com'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable:              users,
    accountsTable:           accounts,
    sessionsTable:           sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) return false
      return true
    },
    async session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  pages: {
    signIn:   '/login',
    error:    '/login',
  },
})
