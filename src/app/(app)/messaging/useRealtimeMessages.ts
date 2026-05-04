'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

export function useRealtimeMessages(channelId: string | null) {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Load initial messages
  useEffect(() => {
    if (!channelId) {
      setMessages([])
      setLoading(false)
      setHasMore(false)
      setNextCursor(null)
      return
    }

    setMessages([])
    setNextCursor(null)
    setHasMore(true)
    setError(null)
    loadMessages(channelId, null)
  }, [channelId])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!channelId) return

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`messages:channel_id=eq.${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: RealtimePayload) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as Record<string, unknown>
            // Build a partial MessageRow from raw Supabase payload
            // The user info won't be available from the realtime event alone,
            // so we fetch the full message from the REST API when we receive it
            fetchSingleMessage(raw.id as string)
          } else if (payload.eventType === 'UPDATE') {
            const raw = payload.new as Record<string, unknown>
            setMessages(prev =>
              prev.map(m =>
                m.id === raw.id
                  ? {
                      ...m,
                      content: (raw.content as string) ?? m.content,
                      flagged: (raw.flagged as boolean) ?? m.flagged,
                      editedAt: (raw.edited_at as string | null) ?? m.editedAt,
                    }
                  : m
              )
            )
          } else if (payload.eventType === 'DELETE') {
            const raw = payload.old as Record<string, unknown>
            setMessages(prev => prev.filter(m => m.id !== raw.id))
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [channelId])

  async function fetchSingleMessage(messageId: string) {
    if (!channelId) return
    try {
      // We use the messages endpoint but filter by the specific message
      // Since our API returns paginated results, fetch latest and find the message
      const res = await fetch(`/api/channels/${channelId}/messages`)
      if (!res.ok) return
      const data = await res.json()
      const found = data.items?.find((m: MessageRow) => m.id === messageId)
      if (found) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === found.id)
          if (exists) return prev
          // New messages go to the end (they're the newest)
          return [...prev, found]
        })
      }
    } catch {}
  }

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
        // Reverse so oldest is first (API returns newest first)
        const incoming = [...data.items].reverse()
        if (!cursor) return incoming
        // Prepend older messages
        const ids = new Set(prev.map(m => m.id))
        const deduplicated = incoming.filter(m => !ids.has(m.id))
        return [...deduplicated, ...prev]
      })
      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  function loadMore() {
    if (!channelId || loading || !hasMore || !nextCursor) return
    loadMessages(channelId, nextCursor)
  }

  function appendMessage(message: MessageRow) {
    setMessages(prev => {
      const exists = prev.find(m => m.id === message.id)
      if (exists) return prev
      return [...prev, message]
    })
  }

  function updateMessage(messageId: string, updates: Partial<MessageRow>) {
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, ...updates } : m))
    )
  }

  return {
    messages,
    loading,
    hasMore,
    error,
    loadMore,
    appendMessage,
    updateMessage,
  }
}
