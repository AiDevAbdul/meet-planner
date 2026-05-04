'use client'

import { useState } from 'react'
import { ChannelList } from './ChannelList'
import { ChannelView } from './ChannelView'
import type { ChannelWithMeta } from './page'

type Props = {
  initialChannels: ChannelWithMeta[]
  currentUserId: string
}

export function MessagingLayout({ initialChannels, currentUserId }: Props) {
  const [channels, setChannels] = useState<ChannelWithMeta[]>(initialChannels)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    initialChannels[0]?.id ?? null
  )

  const activeChannel = channels.find(c => c.id === activeChannelId) ?? null

  function handleChannelCreated(channel: ChannelWithMeta) {
    setChannels(prev => {
      const exists = prev.find(c => c.id === channel.id)
      if (exists) return prev
      return [...prev, channel].sort((a, b) => a.name.localeCompare(b.name))
    })
    setActiveChannelId(channel.id)
  }

  return (
    <div
      className="flex rounded-[14px] overflow-hidden"
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        // Fill the viewport minus topbar (52px) and padding (24px top + 24px bottom = 48px)
        height: 'calc(100vh - 52px - 48px)',
      }}
    >
      {/* Left: channel sidebar */}
      <ChannelList
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        onChannelCreated={handleChannelCreated}
        currentUserId={currentUserId}
      />

      {/* Right: active channel view */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeChannel ? (
          <ChannelView
            channel={activeChannel}
            currentUserId={currentUserId}
          />
        ) : (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <p className="text-[15px]">Select a channel to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
