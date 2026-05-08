'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type MessageRow = {
  id: string
  channelId: string
  content: string
  replyTo: string | null
  flagged: boolean
  createdAt: string
  editedAt: string | null
  userId: string
  userName: string
  userEmail: string
  userAvatar: string | null
}

const POLL_INTERVAL_MS = 3000

export function useRealtimeMessages(channelId: string | null) {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(channelId !== null)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Tracks the most recent message timestamp so the poller only fetches new ones
  const latestTimestampRef = useRef<string | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset and load initial messages whenever the channel changes
  useEffect(() => {
    if (!channelId) {
      setMessages([])
      setLoading(false)
      setHasMore(false)
      setNextCursor(null)
      latestTimestampRef.current = null
      return
    }

    setMessages([])
    setNextCursor(null)
    setHasMore(true)
    setError(null)
    setLoading(true)
    latestTimestampRef.current = null
    loadMessages(channelId, null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  // Keep latestTimestampRef in sync with the newest message in state
  useEffect(() => {
    if (messages.length > 0) {
      latestTimestampRef.current = messages[messages.length - 1].createdAt
    }
  }, [messages])

  // Polling: fetch messages newer than the latest we have
  useEffect(() => {
    if (!channelId) return

    function scheduleNext() {
      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }

    async function poll() {
      // Skip while the tab is hidden — no point hitting the server
      if (document.hidden) {
        scheduleNext()
        return
      }

      const ts = latestTimestampRef.current
      if (!ts) {
        // Initial load hasn't finished yet; try again next tick
        scheduleNext()
        return
      }

      try {
        const res = await fetch(
          `/api/channels/${channelId}/messages?after=${encodeURIComponent(ts)}`
        )
        if (!res.ok) {
          scheduleNext()
          return
        }
        const data: { items: MessageRow[] } = await res.json()
        if (data.items.length > 0) {
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id))
            const fresh = data.items.filter(m => !ids.has(m.id))
            return fresh.length > 0 ? [...prev, ...fresh] : prev
          })
        }
      } catch {
        // Network hiccup — silently retry next interval
      }

      scheduleNext()
    }

    // Resume polling immediately when the tab becomes visible again
    function onVisibilityChange() {
      if (!document.hidden) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
        poll()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    scheduleNext()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [channelId])

  async function loadMessages(cId: string, cursor: string | null) {
    setLoading(true)
    setError(null)
    try {
      const url = cursor
        ? `/api/channels/${cId}/messages?cursor=${encodeURIComponent(cursor)}`
        : `/api/channels/${cId}/messages`
      const res = await fetch(url)
      if (!res.ok) {
        setError('Failed to load messages')
        return
      }
      const data: { items: MessageRow[]; nextCursor: string | null; hasMore: boolean } =
        await res.json()

      setMessages(prev => {
        const incoming = [...data.items].reverse() // API returns newest-first; flip to oldest-first
        if (!cursor) return incoming
        const ids = new Set(prev.map(m => m.id))
        return [...incoming.filter(m => !ids.has(m.id)), ...prev]
      })
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = useCallback(() => {
    if (!channelId || loading || !hasMore || !nextCursor) return
    loadMessages(channelId, nextCursor)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, loading, hasMore, nextCursor])

  function appendMessage(message: MessageRow) {
    setMessages(prev => {
      if (prev.find(m => m.id === message.id)) return prev
      return [...prev, message]
    })
  }

  function updateMessage(messageId: string, updates: Partial<MessageRow>) {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, ...updates } : m))
    )
  }

  function removeMessage(messageId: string) {
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  return {
    messages,
    loading,
    hasMore,
    error,
    loadMore,
    appendMessage,
    updateMessage,
    removeMessage,
  }
}
