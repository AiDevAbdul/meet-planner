'use client'

import { useRef, useState } from 'react'
import { Send } from 'lucide-react'
import type { MessageRow } from './useRealtimeMessages'

type Props = {
  channelId: string
  onMessageSent: (message: MessageRow) => void
  disabled?: boolean
}

export function MessageInput({ channelId, onMessageSent, disabled }: Props) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function sendMessage() {
    const trimmed = content.trim()
    if (!trimmed || sending) return

    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to send')
        return
      }

      const message: MessageRow = await res.json()
      setContent('')
      onMessageSent(message)

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    if (error) setError(null)
  }

  return (
    <div
      className="px-4 py-3"
      style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-glass)' }}
    >
      {error && (
        <p className="text-[12px] mb-1.5" style={{ color: 'var(--color-red)' }}>
          {error}
        </p>
      )}
      <div
        className="flex items-end gap-3 px-3 py-2.5 rounded-[12px] transition-all"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Message… (Enter to send, Shift+Enter for new line)"
          disabled={disabled || sending}
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-[14px] leading-relaxed"
          style={{
            color:  'var(--text-primary)',
            maxHeight: 160,
            overflow: 'auto',
          }}
          aria-label="Message input"
        />
        <button
          onClick={sendMessage}
          disabled={!content.trim() || sending || disabled}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0 disabled:opacity-40"
          style={{
            background: content.trim() ? 'var(--color-blue)' : 'var(--border)',
            color: 'white',
          }}
          aria-label="Send message"
        >
          <Send size={15} strokeWidth={1.5} />
        </button>
      </div>
      <p className="text-[11px] mt-1.5 px-1" style={{ color: 'var(--text-tertiary)' }}>
        Shift+Enter for new line
      </p>
    </div>
  )
}
