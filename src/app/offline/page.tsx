'use client'

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F2F2F7',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,149,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="1.5">
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
        </svg>
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#000' }}>You&apos;re offline</h1>
      <p style={{ fontSize: 14, color: 'rgba(60,60,67,0.6)', maxWidth: 280 }}>
        Check your connection and try again. Cached pages are still available.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          borderRadius: 10,
          background: '#007AFF',
          color: 'white',
          fontSize: 15,
          fontWeight: 500,
          border: 'none',
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        Try again
      </button>
    </div>
  )
}
