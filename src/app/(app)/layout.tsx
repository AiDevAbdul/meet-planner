import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { SidebarProvider } from '@/components/layout/SidebarContext'
import { FloatingChat } from '@/components/chat/FloatingChat'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
        <Sidebar />
        <Topbar />
        {/* Desktop: offset for fixed sidebar. Mobile: full width. */}
        <main className="flex flex-col min-h-screen pt-[52px] md:ml-60">
          <div className="flex-1 p-4 md:p-6">{children}</div>
        </main>
        <FloatingChat />
      </div>
    </SidebarProvider>
  )
}
