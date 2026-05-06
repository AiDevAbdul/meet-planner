import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { PWAInit } from '@/components/pwa/PWAInit'

export const metadata: Metadata = {
  title: 'MeetPlanner',
  description: 'Meeting notes → structured tasks for Ducker Creative',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MeetPlanner',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#007AFF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <PWAInit />
      </body>
    </html>
  )
}
