'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  MessageSquare, X, Maximize2, Send, ChevronLeft,
  Hash, Lock, MessageCircle, Loader2,
} from 'lucide-react'
import { useRealtimeMessages, type MessageRow } from '@/app/(app)/messaging/useRealtimeMessages'
import { Avatar } from '@/components/layout/Sidebar'

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetChannel = {
  id: string
  name: string
  type: 'public' | 'private' | 'direct'
  memberCount: number
  latestMessage: { content: string; senderName: string; createdAt: string } | null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FloatingChat() {
  const pathname   = usePathname()
  const router     = useRouter()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? null

  const [isOpen,          setIsOpen]          = useState(false)
  const [channels,        setChannels]        = useState<WidgetChannel[]>([])
  const [activeId,        setActiveId]        = useState<string | null>(null)
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [hasNew,          setHasNew]          = useState(false)
  const [inputValue,      setInputValue]      = useState('')
  const [sending,         setSending]         = useState(false)

  const scrollRef      = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const prevCountRef   = useRef(0)

  const { messages, loading: messagesLoading, appendMessage } =
    useRealtimeMessages(activeId)

  const activeChannel = channels.find(c => c.id === activeId) ?? null

  // Fetch channel list once session is ready
  useEffect(() => {
    if (!session?.user) return
    setChannelsLoading(true)
    fetch('/api/channels')
      .then(r => (r.ok ? r.json() : []))
      .then((data: WidgetChannel[]) => {
        setChannels(data)
        if (data.length > 0) setActiveId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setChannelsLoading(false))
  }, [session?.user])

  // Badge: new messages while panel is closed
  useEffect(() => {
    if (messages.length > prevCountRef.current && !isOpen) setHasNew(true)
    prevCountRef.current = messages.length
  }, [messages.length, isOpen])

  useEffect(() => { if (isOpen) setHasNew(false) }, [isOpen])

  // Auto-scroll to bottom on new messages or channel switch
  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length, messagesLoading, activeId])

  // Focus input when panel opens with active channel
  useEffect(() => {
    if (isOpen && activeId) setTimeout(() => inputRef.current?.focus(), 150)
  }, [isOpen, activeId])

  // Don't render on the messaging page (full-screen is already there)
  if (pathname.startsWith('/messaging')) return null
  if (!session?.user) return null

  // ── Send message ────────────────────────────────────────────────────────────
  async function handleSend() {
    const trimmed = inputValue.trim()
    if (!trimmed || !activeId || sending) return
    setInputValue('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setSending(true)
    try {
      const res = await fetch(`/api/channels/${activeId}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: trimmed }),
      })
      if (res.ok) appendMessage(await res.json() as MessageRow)
    } catch {}
    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Build grouped message list ──────────────────────────────────────────────
  type Grouped = MessageRow & { isGroupStart: boolean; isGroupEnd: boolean }
  const grouped: Grouped[] = messages.map((msg, i) => {
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const sameAsPrev =
      !!prev &&
      prev.userId === msg.userId &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000
    const sameAsNext =
      !!next &&
      next.userId === msg.userId &&
      new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() < 5 * 60 * 1000
    return { ...msg, isGroupStart: !sameAsPrev, isGroupEnd: !sameAsNext }
  })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toggle button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 hidden md:flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200 ease-out hover:scale-110 active:scale-95"
        style={{
          background:  'var(--color-blue)',
          boxShadow:   '0 4px 20px rgba(0,122,255,0.45)',
        }}
        aria-label="Toggle chat"
      >
        <span
          className="transition-all duration-200"
          style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)' }}
        >
          {isOpen
            ? <X size={22} strokeWidth={2} color="white" />
            : <MessageSquare size={22} strokeWidth={1.75} color="white" />
          }
        </span>

        {/* Unread badge */}
        {!isOpen && hasNew && (
          <span
            className="absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white animate-pulse"
            style={{ background: 'var(--color-red)' }}
          />
        )}
      </button>

      {/* ── Chat panel ────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-24 right-6 z-40 hidden md:flex flex-col overflow-hidden rounded-2xl transition-all duration-300"
        style={{
          width:          360,
          height:         520,
          background:     'var(--bg-primary)',
          border:         '1px solid var(--border)',
          boxShadow:      '0 24px 64px rgba(0,0,0,0.18)',
          transformOrigin: 'bottom right',
          opacity:         isOpen ? 1 : 0,
          transform:       isOpen ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(12px)',
          pointerEvents:   isOpen ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <PanelHeader
          activeChannel={activeChannel}
          onBack={() => setActiveId(null)}
          onExpand={() => { router.push('/messaging'); setIsOpen(false) }}
          onClose={() => setIsOpen(false)}
        />

        {/* Body: channel list OR message thread */}
        {activeChannel ? (
          <>
            {/* Message area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-3 py-3"
              style={{ background: 'var(--bg-secondary)', scrollbarWidth: 'none' }}
            >
              {messagesLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 size={18} strokeWidth={1.5} className="animate-spin"
                    style={{ color: 'var(--text-tertiary)' }} />
                </div>
              )}

              {!messagesLoading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
                  <MessageCircle size={28} strokeWidth={1.25}
                    style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    No messages yet — say hi!
                  </p>
                </div>
              )}

              {grouped.map((msg, i) => {
                const prev = grouped[i - 1]
                const showDate =
                  !prev || !isSameDay(msg.createdAt, prev.createdAt)
                return (
                  <div key={msg.id}>
                    {showDate && <DateDivider date={msg.createdAt} />}
                    <WaBubble
                      message={msg}
                      isOwn={msg.userId === currentUserId}
                      isGroupStart={msg.isGroupStart}
                      isGroupEnd={msg.isGroupEnd}
                    />
                  </div>
                )
              })}
            </div>

            {/* Message input */}
            <div
              className="flex-shrink-0 flex items-end gap-2 px-3 py-2.5"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}
            >
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message…"
                rows={1}
                disabled={sending}
                className="flex-1 bg-transparent resize-none outline-none text-[13px] leading-relaxed"
                style={{ color: 'var(--text-primary)', maxHeight: 80, overflow: 'auto' }}
                aria-label="Type a message"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || sending}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all disabled:opacity-40"
                style={{ background: inputValue.trim() ? 'var(--color-blue)' : 'var(--border)' }}
                aria-label="Send message"
              >
                <Send size={14} strokeWidth={2} color="white" />
              </button>
            </div>
          </>
        ) : (
          /* Channel list */
          <ChannelListView
            channels={channels}
            loading={channelsLoading}
            onSelect={setActiveId}
          />
        )}
      </div>
    </>
  )
}

// ─── Panel header ─────────────────────────────────────────────────────────────

function PanelHeader({
  activeChannel,
  onBack,
  onExpand,
  onClose,
}: {
  activeChannel: WidgetChannel | null
  onBack: () => void
  onExpand: () => void
  onClose: () => void
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 flex-shrink-0"
      style={{ height: 52, background: 'var(--color-blue)', color: 'white' }}
    >
      {activeChannel ? (
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
          aria-label="Back to channels"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
      ) : (
        <MessageSquare size={18} strokeWidth={1.75} className="ml-1 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0 ml-1">
        {activeChannel ? (
          <>
            <p className="text-[14px] font-semibold leading-tight truncate">
              {activeChannel.type === 'direct' ? activeChannel.name : `#${activeChannel.name}`}
            </p>
            <p className="text-[11px] opacity-70 leading-tight">
              {activeChannel.memberCount} member{activeChannel.memberCount !== 1 ? 's' : ''}
            </p>
          </>
        ) : (
          <p className="text-[15px] font-semibold">Messages</p>
        )}
      </div>

      <button
        onClick={onExpand}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
        aria-label="Open full messaging"
        title="Expand to full screen"
      >
        <Maximize2 size={15} strokeWidth={2} />
      </button>

      <button
        onClick={onClose}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
        aria-label="Close chat"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  )
}

// ─── Channel list ─────────────────────────────────────────────────────────────

function ChannelListView({
  channels,
  loading,
  onSelect,
}: {
  channels: WidgetChannel[]
  loading: boolean
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} strokeWidth={1.5} className="animate-spin"
          style={{ color: 'var(--text-tertiary)' }} />
      </div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12">
        <MessageCircle size={32} strokeWidth={1} style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No channels yet</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {channels.map((ch, i) => (
        <button
          key={ch.id}
          onClick={() => onSelect(ch.id)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-secondary)] active:bg-[var(--bg-secondary)]"
          style={{
            borderBottom: i < channels.length - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <ChannelAvatar channel={ch} size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}>
              {ch.type === 'direct' ? ch.name : `#${ch.name}`}
            </p>
            {ch.latestMessage ? (
              <p className="text-[12px] truncate mt-0.5"
                style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium">{ch.latestMessage.senderName}:</span>{' '}
                {ch.latestMessage.content}
              </p>
            ) : (
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                No messages yet
              </p>
            )}
          </div>
          {ch.latestMessage && (
            <span className="text-[10px] flex-shrink-0 self-start mt-1"
              style={{ color: 'var(--text-tertiary)' }}>
              {shortTime(ch.latestMessage.createdAt)}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── WhatsApp-style message bubble ───────────────────────────────────────────

function WaBubble({
  message,
  isOwn,
  isGroupStart,
  isGroupEnd,
}: {
  message: MessageRow
  isOwn: boolean
  isGroupStart: boolean
  isGroupEnd: boolean
}) {
  // Border radii: flat corner on the "tail" side for the last bubble in a group
  const ownRadius    = isGroupEnd ? '18px 18px 6px 18px' : '18px 18px 18px 18px'
  const otherRadius  = isGroupEnd ? '18px 18px 18px 6px' : '18px 18px 18px 18px'

  return (
    <div
      className="flex items-end gap-2"
      style={{
        flexDirection: isOwn ? 'row-reverse' : 'row',
        marginTop:     isGroupStart ? 10 : 2,
        alignItems:    'flex-end',
      }}
    >
      {/* Avatar — shown only at the end of each received group */}
      <div style={{ width: 28, flexShrink: 0 }}>
        {!isOwn && isGroupEnd && (
          <Avatar
            name={message.userName}
            src={message.userAvatar ?? undefined}
            size={28}
          />
        )}
      </div>

      {/* Bubble + meta */}
      <div
        style={{
          maxWidth:   '75%',
          display:    'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          gap: 2,
        }}
      >
        {/* Sender name — only on first bubble of a received group */}
        {!isOwn && isGroupStart && (
          <span
            className="text-[11px] font-semibold px-0.5"
            style={{ color: 'var(--color-blue)' }}
          >
            {message.userName}
          </span>
        )}

        {/* Bubble */}
        <div
          className="px-3 py-2 text-[13px] leading-relaxed select-text"
          style={
            isOwn
              ? {
                  background:   'var(--color-blue)',
                  color:        'white',
                  borderRadius: ownRadius,
                }
              : {
                  background:   'var(--bg-primary)',
                  color:        'var(--text-primary)',
                  border:       '1px solid var(--border)',
                  borderRadius: otherRadius,
                  boxShadow:    'var(--shadow-xs)',
                }
          }
        >
          <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </p>
        </div>

        {/* Timestamp — only on last bubble of a group */}
        {isGroupEnd && (
          <span
            className="text-[10px] px-0.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {msgTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Channel avatar ───────────────────────────────────────────────────────────

const CHANNEL_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#AF52DE',
  '#FF2D55', '#5AC8FA', '#FF6B35', '#5856D6',
]

function ChannelAvatar({ channel, size }: { channel: WidgetChannel; size: number }) {
  const bg       = CHANNEL_COLORS[channel.name.charCodeAt(0) % CHANNEL_COLORS.length]
  const iconSize = Math.max(14, Math.floor(size * 0.40))

  return (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-full text-white"
      style={{ width: size, height: size, background: bg }}
    >
      {channel.type === 'public'  && <Hash size={iconSize} strokeWidth={2.5} color="white" />}
      {channel.type === 'private' && <Lock size={iconSize} strokeWidth={2.5} color="white" />}
      {channel.type === 'direct'  && (
        <span className="font-semibold" style={{ fontSize: size * 0.38 }}>
          {channel.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

// ─── Date divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  const d    = new Date(date)
  const now  = new Date()
  const diff = now.getDate() - d.getDate()
  const sameYear = d.getFullYear() === now.getFullYear()

  let label: string
  if (diff === 0 && d.getMonth() === now.getMonth()) {
    label = 'Today'
  } else if (diff === 1 && d.getMonth() === now.getMonth()) {
    label = 'Yesterday'
  } else {
    label = d.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
  }

  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      <span
        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{
          color:      'var(--text-tertiary)',
          background: 'var(--bg-primary)',
          border:     '1px solid var(--border)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: string, b: string) {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear()
    && da.getMonth()    === db.getMonth()
    && da.getDate()     === db.getDate()
}

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function shortTime(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000)        return 'now'
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000)    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
