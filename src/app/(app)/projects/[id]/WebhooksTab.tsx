'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronRight, Copy, Check, AlertCircle, Zap } from 'lucide-react'

const ALL_EVENTS = [
  { id: 'task.created',        label: 'Task Created' },
  { id: 'task.updated',        label: 'Task Updated' },
  { id: 'task.deleted',        label: 'Task Deleted' },
  { id: 'task.status_changed', label: 'Status Changed' },
  { id: 'task.assigned',       label: 'Task Assigned' },
]

type Webhook = {
  id:        string
  url:       string
  events:    string[]
  active:    boolean
  createdAt: string
  secret?:   string
}

type Delivery = {
  id:          string
  event:       string
  statusCode:  number | null
  success:     boolean
  deliveredAt: string
  responseBody: string | null
}

export function WebhooksTab({ projectId }: { projectId: string }) {
  const [hooks, setHooks]         = useState<Webhook[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [saving, startSave]       = useTransition()
  const [deleting, startDelete]   = useTransition()
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({})
  const [loadingDel, setLoadingDel] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)

  const [form, setForm] = useState({ url: '', events: [] as string[] })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/projects/${projectId}/webhooks`)
    if (res.ok) setHooks(await res.json())
    setLoading(false)
  }

  function toggleEvent(ev: string) {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }))
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.url || form.events.length === 0) { setError('URL and at least one event are required'); return }

    startSave(async () => {
      const res = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const b = await res.json(); setError(b.error ?? 'Failed'); return }
      const hook = await res.json()
      setNewSecret(hook.secret)
      setHooks(prev => [...prev, hook])
      setCreating(false)
      setForm({ url: '', events: [] })
    })
  }

  function deleteHook(id: string) {
    if (!confirm('Delete this webhook?')) return
    startDelete(async () => {
      await fetch(`/api/webhooks/outbound/${id}`, { method: 'DELETE' })
      setHooks(prev => prev.filter(h => h.id !== id))
      if (expanded === id) setExpanded(null)
    })
  }

  async function toggleActive(hook: Webhook) {
    const res = await fetch(`/api/webhooks/outbound/${hook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !hook.active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setHooks(prev => prev.map(h => h.id === hook.id ? updated : h))
    }
  }

  async function loadDeliveries(webhookId: string) {
    if (deliveries[webhookId]) { setExpanded(expanded === webhookId ? null : webhookId); return }
    setExpanded(webhookId)
    setLoadingDel(webhookId)
    const res = await fetch(`/api/webhooks/outbound/${webhookId}/deliveries`)
    if (res.ok) { const data = await res.json(); setDeliveries(prev => ({ ...prev, [webhookId]: data })) }
    setLoadingDel(null)
  }

  function copySecret(s: string) {
    navigator.clipboard.writeText(s)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Outbound Webhooks</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Push task events to external services (Zapier, Make, custom endpoints).
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl text-white"
            style={{ background: 'var(--color-blue)' }}
          >
            <Plus size={15} /> Add Webhook
          </button>
        )}
      </div>

      {/* New secret banner */}
      {newSecret && (
        <div className="rounded-xl p-4" style={{ background: '#34C75915', border: '1px solid #34C75940' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#34C759' }}>Webhook created — save your secret now</p>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            This is the only time you'll see it. Use it to verify <code className="font-mono">X-MeetPlanner-Signature</code> headers.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
              {newSecret}
            </code>
            <button onClick={() => copySecret(newSecret)} className="p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              {copied ? <Check size={14} style={{ color: '#34C759' }} /> : <Copy size={14} style={{ color: 'var(--text-secondary)' }} />}
            </button>
            <button onClick={() => setNewSecret(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <form
          onSubmit={handleCreate}
          className="glass-card rounded-2xl p-5 space-y-4"
          style={{ border: '1px solid var(--border-primary)' }}
        >
          <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>New Webhook</h4>

          {error && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-red)' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Endpoint URL</label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://hooks.zapier.com/…"
              required
              className="w-full px-3 py-2 text-sm rounded-xl"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--text-secondary)' }}>Events to send</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => toggleEvent(ev.id)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                  style={form.events.includes(ev.id)
                    ? { background: 'var(--color-blue)', color: '#fff' }
                    : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }
                  }
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setCreating(false); setError(null); setForm({ url: '', events: [] }) }}
              className="px-4 py-2 text-sm rounded-xl"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-xl text-white font-medium"
              style={{ background: 'var(--color-blue)', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Creating…' : 'Create Webhook'}
            </button>
          </div>
        </form>
      )}

      {/* Webhook list */}
      {hooks.length === 0 && !creating && (
        <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed var(--border-primary)' }}>
          <Zap size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No webhooks yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Connect Zapier, Make, or any HTTPS endpoint to receive task events.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {hooks.map(hook => (
          <div key={hook.id} className="glass-card rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-primary)' }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>{hook.url}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {hook.events.map(ev => (
                    <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(hook)}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={hook.active
                    ? { background: '#34C75918', color: '#34C759' }
                    : { background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }
                  }
                >
                  {hook.active ? 'Active' : 'Disabled'}
                </button>
                <button
                  onClick={() => loadDeliveries(hook.id)}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                >
                  {expanded === hook.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                <button onClick={() => deleteHook(hook.id)} style={{ color: 'var(--color-red)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Delivery log */}
            {expanded === hook.id && (
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Recent Deliveries</p>
                {loadingDel === hook.id && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <RefreshCw size={12} className="animate-spin" /> Loading…
                  </div>
                )}
                {!loadingDel && (deliveries[hook.id] ?? []).length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No deliveries yet</p>
                )}
                <div className="space-y-1.5">
                  {(deliveries[hook.id] ?? []).map(d => (
                    <div key={d.id} className="flex items-center gap-2 text-xs">
                      {d.success
                        ? <CheckCircle2 size={12} style={{ color: '#34C759' }} />
                        : <XCircle     size={12} style={{ color: 'var(--color-red)' }} />
                      }
                      <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{d.event}</span>
                      {d.statusCode && (
                        <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                          {d.statusCode}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(d.deliveredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Payload reference */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Payload format (Zapier / Make compatible)</p>
        <pre className="text-[11px] leading-relaxed font-mono overflow-x-auto" style={{ color: 'var(--text-tertiary)' }}>{`{
  "event": "task.status_changed",
  "timestamp": 1234567890,
  "payload": {
    "taskId": "uuid",
    "title": "Design homepage",
    "status": "done",
    "previousStatus": "in_progress",
    "priority": "high",
    "assigneeId": "uuid",
    "projectId": "uuid",
    "updatedAt": "2026-05-06T12:00:00Z"
  }
}`}</pre>
      </div>
    </div>
  )
}
