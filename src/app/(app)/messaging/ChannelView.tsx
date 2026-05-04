'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  Search, Users, Smile, Reply, Bookmark, Copy, Trash2,
  Loader2, AlertCircle, ListTodo, Check,
} from 'lucide-react'
import { Avatar } from '@/components/layout/Sidebar'
import { MessageInput } from './MessageInput'
import { useRealtimeMessages, type MessageRow } from './useRealtimeMessages'
import type { ChannelWithMeta } from './page'

type Props = {
  channel: ChannelWithMeta
  currentUserId: string
}

// Returns "May 4, 2026" style from a Date or string
function dayLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function timeLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function isSameDay(a: Date | string, b: Date | string): boolean {
  const da = typeof a === 'string' ? new Date(a) : a
  const db = typeof b === 'string' ? new Date(b) : b
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth()    === db.getMonth()    &&
    da.getDate()     === db.getDate()
  )
}

export function ChannelView({ channel, currentUserId }: Props) {
  const {
    messages,
    loading,
    hasMore,
    error,
    loadMore,
    appendMessage,
    updateMessage,
  } = useRealtimeMessages(channel.id)

  // Track which messages are currently being converted to tasks
  const [creatingTask, setCreatingTask] = useState<Set<string>>(new Set())
  // Track which messages just had a task created (for success flash)
  const [taskCreated, setTaskCreated] = useState<Set<string>>(new Set())

  const scrollAreaRef    = useRef<HTMLDivElement>(null)
  const bottomRef        = useRef<HTMLDivElement>(null)
  const loadMoreRef      = useRef<HTMLDivElement>(null)
  const isAtBottomRef    = useRef(true)
  const prevScrollHeight = useRef(0)

  // Scroll to bottom on first load
  useEffect(() => {
    if (!loading && messages.length > 0 && isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [loading, channel.id])

  // Auto-scroll to bottom for new messages (only if already at bottom)
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  // Preserve scroll position when loading older messages
  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el || !loading) return
    prevScrollHeight.current = el.scrollHeight
  }, [loading])

  useEffect(() => {
    const el = scrollAreaRef.current
    if (!el || loading) return
    const newScrollHeight = el.scrollHeight
    const delta = newScrollHeight - prevScrollHeight.current
    if (delta > 0 && prevScrollHeight.current > 0) {
      el.scrollTop = el.scrollTop + delta
    }
    prevScrollHeight.current = 0
  }, [messages, loading])

  // Track whether user is at the bottom
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const threshold = 80
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  // Infinite scroll sentinel for loading older messages
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { root: scrollAreaRef.current, threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  async function handleFlag(messageId: string) {
    try {
      const res = await fetch(`/api/messages/${messageId}/flag`, { method: 'PATCH' })
      if (res.ok) {
        updateMessage(messageId, { flagged: true })
      }
    } catch {}
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content)
    } catch {}
  }

  async function handleDelete(messageId: string) {
    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' })
      if (res.ok) {
        // Optimistically remove from local state
        // The realtime subscription will fire DELETE event too
      }
    } catch {}
  }

  async function handleCreateTask(messageId: string) {
    if (creatingTask.has(messageId)) return
    setCreatingTask(prev => new Set(prev).add(messageId))
    try {
      const res = await fetch(`/api/messages/${messageId}/create-task`, { method: 'POST' })
      if (res.ok) {
        updateMessage(messageId, { flagged: true })
        setTaskCreated(prev => new Set(prev).add(messageId))
        setTimeout(() => {
          setTaskCreated(prev => { const next = new Set(prev); next.delete(messageId); return next })
        }, 2500)
      }
    } catch {}
    setCreatingTask(prev => { const next = new Set(prev); next.delete(messageId); return next })
  }

  // Group messages: consecutive from same user within 5 minutes → grouped
  type GroupedMessage = MessageRow & { isGrouped: boolean }

  const grouped: GroupedMessage[] = messages.map((msg, i) => {
    const prev = messages[i - 1]
    const isGrouped =
      !!prev &&
      prev.userId === msg.userId &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000 &&
      isSameDay(msg.createdAt, prev.createdAt)
    return { ...msg, isGrouped }
  })

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{
          height: 52,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            #{channel.name}
          </h1>
        </div>
        <div className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
          <Users size={14} strokeWidth={1.5} />
          <span className="text-[13px]">{channel.memberCount}</span>
        </div>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-[8px] transition-all"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Search messages"
          title="Search messages"
        >
          <Search size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Message list */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ minHeight: 0 }}
      >
        {/* Load more sentinel */}
        <div ref={loadMoreRef} style={{ height: 1 }} />

        {/* Loading indicator for older messages */}
        {loading && (
          <div className="flex justify-center py-3">
            <Loader2 size={18} strokeWidth={1.5} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-[10px] mb-3"
            style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--color-red)' }}
          >
            <AlertCircle size={15} strokeWidth={1.5} />
            <span className="text-[13px]">{error}</span>
          </div>
        )}

        {/* No messages */}
        {!loading && messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
              No messages yet
            </p>
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              Be the first to say something in #{channel.name}
            </p>
          </div>
        )}

        {/* Grouped messages with date separators */}
        {grouped.map((msg, i) => {
          const prev = grouped[i - 1]
          const showDateSeparator = !prev || !isSameDay(msg.createdAt, prev.createdAt)
          const isOwn = msg.userId === currentUserId

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <DateSeparator label={dayLabel(msg.createdAt)} />
              )}
              <MessageBubble
                message={msg}
                isOwn={isOwn}
                isGrouped={msg.isGrouped}
                onFlag={() => handleFlag(msg.id)}
                onCopy={() => handleCopy(msg.content)}
                onDelete={() => handleDelete(msg.id)}
                onCreateTask={() => handleCreateTask(msg.id)}
                isCreatingTask={creatingTask.has(msg.id)}
                taskJustCreated={taskCreated.has(msg.id)}
              />
            </div>
          )
        })}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Message input */}
      <div className="flex-shrink-0">
        <MessageInput
          channelId={channel.id}
          onMessageSent={appendMessage}
        />
      </div>
    </div>
  )
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      <span
        className="text-[11px] font-semibold px-2"
        style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

type BubbleProps = {
  message: MessageRow & { isGrouped: boolean }
  isOwn: boolean
  isGrouped: boolean
  onFlag: () => void
  onCopy: () => void
  onDelete: () => void
  onCreateTask: () => void
  isCreatingTask: boolean
  taskJustCreated: boolean
}

function MessageBubble({ message, isOwn, isGrouped, onFlag, onCopy, onDelete, onCreateTask, isCreatingTask, taskJustCreated }: BubbleProps) {
  const showHeader = !isGrouped

  return (
    <div
      className="group flex gap-2.5 hover:bg-opacity-50 px-1 py-0.5 rounded-[8px] transition-all"
      style={{
        flexDirection:  isOwn ? 'row-reverse' : 'row',
        alignItems:     'flex-end',
        marginTop:      isGrouped ? 1 : 10,
      }}
    >
      {/* Avatar (only on first message of group) */}
      <div style={{ width: 32, flexShrink: 0 }}>
        {showHeader && !isOwn && (
          <Avatar name={message.userName} src={message.userAvatar ?? undefined} size={32} />
        )}
      </div>

      {/* Message content */}
      <div
        className="flex flex-col gap-0.5"
        style={{
          maxWidth: '70%',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Sender name + timestamp (first of group) */}
        {showHeader && (
          <div
            className="flex items-baseline gap-2 px-1"
            style={{ flexDirection: isOwn ? 'row-reverse' : 'row' }}
          >
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isOwn ? 'You' : message.userName}
            </span>
            <span
              className="text-[11px]"
              style={{ color: 'var(--text-tertiary)', opacity: 0, transition: 'opacity 150ms ease' }}
            >
              {timeLabel(message.createdAt)}
            </span>
          </div>
        )}

        {/* Bubble row with hover toolbar */}
        <div
          className="flex items-end gap-2"
          style={{ flexDirection: isOwn ? 'row-reverse' : 'row' }}
        >
          {/* Bubble */}
          <div
            className="relative px-3 py-2 text-[14px] leading-relaxed select-text"
            style={
              isOwn
                ? {
                    background:   'var(--color-blue)',
                    color:        'white',
                    borderRadius: '14px 14px 4px 14px',
                    boxShadow:    'var(--shadow-xs)',
                  }
                : {
                    background:         'var(--bg-glass)',
                    backdropFilter:     'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border:             '1px solid var(--border)',
                    color:              'var(--text-primary)',
                    borderRadius:       '14px 14px 14px 4px',
                    boxShadow:          'var(--shadow-xs)',
                  }
            }
          >
            {/* Flagged indicator */}
            {message.flagged && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium mb-1"
                style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--color-orange)' }}
              >
                <Bookmark size={10} strokeWidth={2} />
                Flagged idea
              </span>
            )}
            <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</p>

            {/* Hover timestamp */}
            {isGrouped && (
              <span
                className="absolute text-[10px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{
                  color: isOwn ? 'rgba(255,255,255,0.55)' : 'var(--text-tertiary)',
                  [isOwn ? 'left' : 'right']: '100%',
                  bottom: 4,
                  whiteSpace: 'nowrap',
                  marginLeft: isOwn ? 0 : 6,
                  marginRight: isOwn ? 6 : 0,
                  paddingLeft: isOwn ? 0 : 6,
                  paddingRight: isOwn ? 6 : 0,
                }}
              >
                {timeLabel(message.createdAt)}
              </span>
            )}
          </div>

          {/* Hover action toolbar */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ flexDirection: isOwn ? 'row-reverse' : 'row' }}
          >
            <ToolbarButton
              icon={<Smile size={13} strokeWidth={1.5} />}
              label="React"
              onClick={() => {}}
            />
            <ToolbarButton
              icon={<Reply size={13} strokeWidth={1.5} />}
              label="Reply"
              onClick={() => {}}
            />
            <ToolbarButton
              icon={<Bookmark size={13} strokeWidth={1.5} />}
              label={message.flagged ? 'Already flagged' : 'Flag as idea'}
              onClick={onFlag}
              active={message.flagged}
            />
            <ToolbarButton
              icon={
                isCreatingTask
                  ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
                  : taskJustCreated
                    ? <Check size={13} strokeWidth={2} />
                    : <ListTodo size={13} strokeWidth={1.5} />
              }
              label={taskJustCreated ? 'Task created!' : isCreatingTask ? 'Creating task…' : 'Create task'}
              onClick={onCreateTask}
              active={taskJustCreated}
            />
            <ToolbarButton
              icon={<Copy size={13} strokeWidth={1.5} />}
              label="Copy"
              onClick={onCopy}
            />
            {isOwn && (
              <ToolbarButton
                icon={<Trash2 size={13} strokeWidth={1.5} />}
                label="Delete"
                onClick={onDelete}
                danger
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex items-center justify-center w-6 h-6 rounded-[6px] transition-all"
      style={{
        background: active
          ? 'rgba(0,122,255,0.12)'
          : danger
            ? 'rgba(255,59,48,0.08)'
            : 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        color:  active
          ? 'var(--color-blue)'
          : danger
            ? 'var(--color-red)'
            : 'var(--text-secondary)',
      }}
    >
      {icon}
    </button>
  )
}
