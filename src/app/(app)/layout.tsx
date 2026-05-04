import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <Sidebar />
      <Topbar />
      <main
        className="flex flex-col min-h-screen pt-[52px]"
        style={{ marginLeft: 240 }}
      >
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  )
}
