'use client'

import { useState } from 'react'
import { Plus, Hash, Lock, MessageCircle, X, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChannelWithMeta } from './page'

type Props = {
  channels: ChannelWithMeta[]
  activeChannelId: string | null
  onSelectChannel: (id: string) => void
  onChannelCreated: (channel: ChannelWithMeta) => void
  currentUserId: string
}

type CreateMode = 'channel' | 'dm' | null

export function ChannelList({
  channels,
  activeChannelId,
  onSelectChannel,
  onChannelCreated,
  currentUserId,
}: Props) {
  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'public' | 'private'>('public')
  const [dmQuery, setDmQuery] = useState('')
  const [dmUsers, setDmUsers] = useState<{ id: string; name: string; email: string; avatarUrl: string | null }[]>([])
  const [selectedDmUsers, setSelectedDmUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const departments = channels.filter(c => c.type === 'public' && c.departmentId)
  const publicChannels = channels.filter(c => c.type === 'public' && !c.departmentId)
  const privateChannels = channels.filter(c => c.type === 'private')
  const directMessages = channels.filter(c => c.type === 'direct')

  async function searchUsers(query: string) {
    if (!query.trim()) { setDmUsers([]); return }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setDmUsers(data.filter((u: { id: string }) => u.id !== currentUserId))
      }
    } catch {}
  }

  async function handleCreateChannel() {
    if (!newChannelName.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName.trim(), type: newChannelType }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create channel')
        return
      }
      const channel = await res.json()
      onChannelCreated({ ...channel, memberCount: 1, latestMessage: null, unreadCount: 0 })
      setCreateMode(null)
      setNewChannelName('')
      setNewChannelType('public')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateDm() {
    if (selectedDmUsers.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dmUsers.filter(u => selectedDmUsers.includes(u.id)).map(u => u.name).join(', '),
          type: 'direct',
          memberIds: selectedDmUsers,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create DM')
        return
      }
      const channel = await res.json()
      onChannelCreated({ ...channel, memberCount: selectedDmUsers.length + 1, latestMessage: null, unreadCount: 0 })
      setCreateMode(null)
      setSelectedDmUsers([])
      setDmQuery('')
      setDmUsers([])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  function closeModal() {
    setCreateMode(null)
    setNewChannelName('')
    setNewChannelType('public')
    setDmQuery('')
    setDmUsers([])
    setSelectedDmUsers([])
    setError(null)
  }

  return (
    <>
      <aside
        style={{
          width: 280,
          minWidth: 280,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg-sidebar)',
        }}
        aria-label="Channels"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', height: 52 }}
        >
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Messaging
          </span>
          <button
            onClick={() => setCreateMode('channel')}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
            style={{ background: 'rgba(0,122,255,0.10)', color: 'var(--color-blue)' }}
            aria-label="New channel or message"
            title="New channel or DM"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Channel sections */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Departments */}
          {departments.length > 0 && (
            <ChannelSection
              label="Departments"
              channels={departments}
              activeId={activeChannelId}
              onSelect={onSelectChannel}
            />
          )}

          {/* Public Channels */}
          {publicChannels.length > 0 && (
            <ChannelSection
              label="Channels"
              channels={publicChannels}
              activeId={activeChannelId}
              onSelect={onSelectChannel}
            />
          )}

          {/* Private Channels */}
          {privateChannels.length > 0 && (
            <ChannelSection
              label="Private"
              channels={privateChannels}
              activeId={activeChannelId}
              onSelect={onSelectChannel}
            />
          )}

          {/* Direct Messages */}
          <div className="mt-1">
            <div className="flex items-center justify-between px-4 py-1">
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Direct Messages
              </span>
              <button
                onClick={() => setCreateMode('dm')}
                className="flex items-center justify-center w-5 h-5 rounded transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="New direct message"
                title="New DM"
              >
                <Plus size={13} strokeWidth={1.5} />
              </button>
            </div>
            {directMessages.length === 0 && (
              <p className="px-4 py-1.5 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                No direct messages
              </p>
            )}
            {directMessages.map(ch => (
              <ChannelItem
                key={ch.id}
                channel={ch}
                active={ch.id === activeChannelId}
                onSelect={onSelectChannel}
                icon={<MessageCircle size={14} strokeWidth={1.5} />}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Create Channel Modal */}
      {createMode === 'channel' && (
        <Modal onClose={closeModal} title="New Channel">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Channel name
              </label>
              <input
                autoFocus
                type="text"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateChannel() }}
                placeholder="e.g. design-reviews"
                className="w-full px-3 py-2 rounded-[8px] text-[14px] outline-none transition-all"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Visibility
              </label>
              <div className="flex gap-2">
                {(['public', 'private'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewChannelType(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-[13px] font-medium transition-all"
                    style={{
                      background: newChannelType === t ? 'rgba(0,122,255,0.12)' : 'var(--bg-secondary)',
                      color:      newChannelType === t ? 'var(--color-blue)' : 'var(--text-secondary)',
                      border:     `1px solid ${newChannelType === t ? 'var(--color-blue)' : 'var(--border)'}`,
                    }}
                  >
                    {t === 'public' ? <Hash size={13} strokeWidth={1.5} /> : <Lock size={13} strokeWidth={1.5} />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-[13px]" style={{ color: 'var(--color-red)' }}>{error}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-[8px] text-[14px] font-medium transition-all"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || loading}
                className="px-4 py-2 rounded-[8px] text-[14px] font-medium text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--color-blue)' }}
              >
                {loading ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create DM Modal */}
      {createMode === 'dm' && (
        <Modal onClose={closeModal} title="New Direct Message">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Search people
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-[8px]"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <Search size={14} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
                <input
                  autoFocus
                  type="text"
                  value={dmQuery}
                  onChange={e => {
                    setDmQuery(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  placeholder="Name or email…"
                  className="flex-1 text-[14px] outline-none bg-transparent"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {selectedDmUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {dmUsers
                  .filter(u => selectedDmUsers.includes(u.id))
                  .map(u => (
                    <span
                      key={u.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium"
                      style={{ background: 'rgba(0,122,255,0.12)', color: 'var(--color-blue)' }}
                    >
                      {u.name}
                      <button
                        onClick={() => setSelectedDmUsers(prev => prev.filter(id => id !== u.id))}
                        aria-label={`Remove ${u.name}`}
                      >
                        <X size={11} strokeWidth={2} />
                      </button>
                    </span>
                  ))}
              </div>
            )}

            {dmUsers.length > 0 && (
              <div
                className="rounded-[8px] overflow-hidden"
                style={{ border: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto' }}
              >
                {dmUsers.map(u => {
                  const selected = selectedDmUsers.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedDmUsers(prev =>
                          selected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                        )
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 transition-all text-left"
                      style={{
                        background: selected ? 'rgba(0,122,255,0.08)' : 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                        style={{ background: 'var(--color-indigo)' }}
                      >
                        {u.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {u.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {u.email}
                        </p>
                      </div>
                      {selected && <Check size={14} strokeWidth={2} style={{ color: 'var(--color-blue)' }} />}
                    </button>
                  )
                })}
              </div>
            )}

            {error && (
              <p className="text-[13px]" style={{ color: 'var(--color-red)' }}>{error}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-[8px] text-[14px] font-medium transition-all"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDm}
                disabled={selectedDmUsers.length === 0 || loading}
                className="px-4 py-2 rounded-[8px] text-[14px] font-medium text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--color-blue)' }}
              >
                {loading ? 'Opening…' : 'Open DM'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function ChannelSection({
  label,
  channels,
  activeId,
  onSelect,
}: {
  label: string
  channels: ChannelWithMeta[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const icon = label === 'Departments'
    ? <Hash size={14} strokeWidth={1.5} />
    : label === 'Private'
      ? <Lock size={14} strokeWidth={1.5} />
      : <Hash size={14} strokeWidth={1.5} />

  return (
    <div className="mt-1">
      <div className="px-4 py-1">
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {label}
        </span>
      </div>
      {channels.map(ch => (
        <ChannelItem
          key={ch.id}
          channel={ch}
          active={ch.id === activeId}
          onSelect={onSelect}
          icon={icon}
        />
      ))}
    </div>
  )
}

function ChannelItem({
  channel,
  active,
  onSelect,
  icon,
}: {
  channel: ChannelWithMeta
  active: boolean
  onSelect: (id: string) => void
  icon: React.ReactNode
}) {
  const hasUnread = channel.unreadCount > 0

  return (
    <button
      onClick={() => onSelect(channel.id)}
      className="w-full flex items-center gap-2.5 px-4 py-1.5 transition-all text-left"
      style={{
        background: active ? 'rgba(0,122,255,0.10)' : 'transparent',
        color:      active ? 'var(--color-blue)' : 'var(--text-secondary)',
      }}
      aria-current={active ? 'true' : undefined}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
      <span
        className={cn('flex-1 min-w-0 text-[14px] truncate', hasUnread ? 'font-semibold' : 'font-medium')}
        style={{ color: active ? 'var(--color-blue)' : hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)' }}
      >
        {channel.name}
      </span>
      {hasUnread && (
        <span
          className="flex items-center justify-center text-[11px] font-bold text-white rounded-full flex-shrink-0"
          style={{
            background: 'var(--color-blue)',
            minWidth: 18,
            height: 18,
            padding: '0 5px',
          }}
        >
          {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
        </span>
      )}
    </button>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-card w-full max-w-md mx-4 p-6"
        style={{ animation: 'var(--ease-spring)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
