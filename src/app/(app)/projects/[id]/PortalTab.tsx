'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Globe, Plus, Eye, Copy, Check, Trash2, ToggleLeft, ToggleRight,
  Link2, Lock, Palette, RefreshCw, Send, AlertCircle,
} from 'lucide-react'

type Portal = {
  id: string
  name: string
  slug: string
  primaryColor: string
  logoUrl: string | null
  active: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
}

type Update = {
  id: string
  content: string
  createdAt: string
  createdByName: string | null
  createdByImage: string | null
}

const PRESET_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#30B0C7', '#FF2D55']

export function PortalTab({ projectId }: { projectId: string }) {
  const [portals, setPortals]       = useState<Portal[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Portal | null>(null)
  const [updates, setUpdates]       = useState<Update[]>([])
  const [creating, setCreating]     = useState(false)
  const [saving, startSave]         = useTransition()
  const [posting, startPost]        = useTransition()
  const [copied, setCopied]         = useState(false)
  const [newUpdate, setNewUpdate]   = useState('')
  const [error, setError]           = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({ name: '', slug: '', primaryColor: '#007AFF', logoUrl: '', password: '' })
  const [editForm, setEditForm] = useState({ name: '', primaryColor: '#007AFF', logoUrl: '', password: '' })

  useEffect(() => { loadPortals() }, [])

  async function loadPortals() {
    setLoading(true)
    const res = await fetch(`/api/portals?projectId=${projectId}`)
    if (res.ok) {
      const list = await res.json()
      setPortals(list)
      if (list.length > 0 && !selected) selectPortal(list[0])
    }
    setLoading(false)
  }

  async function selectPortal(p: Portal) {
    setSelected(p)
    setEditForm({ name: p.name, primaryColor: p.primaryColor, logoUrl: p.logoUrl ?? '', password: '' })
    const res = await fetch(`/api/portals/${p.slug}/updates`)
    if (res.ok) setUpdates(await res.json())
  }

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startSave(async () => {
      const res = await fetch('/api/portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError(b.error ?? 'Failed to create portal')
        return
      }
      const portal = await res.json()
      setPortals(prev => [...prev, portal])
      selectPortal(portal)
      setCreating(false)
      setForm({ name: '', slug: '', primaryColor: '#007AFF', logoUrl: '', password: '' })
    })
  }

  function handleUpdate() {
    if (!selected) return
    startSave(async () => {
      const res = await fetch(`/api/portals/${selected.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setPortals(prev => prev.map(p => p.id === updated.id ? updated : p))
        setSelected(updated)
      }
    })
  }

  function toggleActive() {
    if (!selected) return
    startSave(async () => {
      const res = await fetch(`/api/portals/${selected.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !selected.active }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPortals(prev => prev.map(p => p.id === updated.id ? updated : p))
        setSelected(updated)
      }
    })
  }

  async function deletePortal() {
    if (!selected || !confirm('Delete this portal? Clients will lose access.')) return
    await fetch(`/api/portals/${selected.slug}`, { method: 'DELETE' })
    setPortals(prev => prev.filter(p => p.id !== selected.id))
    setSelected(null)
    setUpdates([])
  }

  function postUpdate() {
    if (!selected || !newUpdate.trim()) return
    startPost(async () => {
      const res = await fetch(`/api/portals/${selected.slug}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newUpdate.trim() }),
      })
      if (res.ok) {
        setNewUpdate('')
        const res2 = await fetch(`/api/portals/${selected.slug}/updates`)
        if (res2.ok) setUpdates(await res2.json())
      }
    })
  }

  function copyLink() {
    if (!selected) return
    navigator.clipboard.writeText(`${window.location.origin}/portal/${selected.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Client Portal
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Share a branded portal with clients — project status, milestones, docs, and updates.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl"
            style={{ background: 'var(--color-blue)', color: '#fff' }}
          >
            <Plus size={15} />
            New Portal
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <form
          onSubmit={handleCreate}
          className="glass-card rounded-2xl p-5 mb-6 space-y-4"
          style={{ border: '1px solid var(--border-primary)' }}
        >
          <h4 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Create Portal</h4>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: generateSlug(e.target.value) }))}
                placeholder="Client Portal"
                required
                className="w-full px-3 py-2 text-sm rounded-xl"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Slug (URL)</label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="my-client"
                required
                className="w-full px-3 py-2 text-sm rounded-xl font-mono"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Logo URL (optional)</label>
              <input
                value={form.logoUrl}
                onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://…"
                className="w-full px-3 py-2 text-sm rounded-xl"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Password (optional)</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave empty for public"
                className="w-full px-3 py-2 text-sm rounded-xl"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Brand Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, primaryColor: c }))}
                  className="h-7 w-7 rounded-full border-2 transition-transform"
                  style={{
                    background: c,
                    borderColor: form.primaryColor === c ? 'white' : 'transparent',
                    boxShadow: form.primaryColor === c ? `0 0 0 2px ${c}` : 'none',
                    transform: form.primaryColor === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
              <input
                type="color"
                value={form.primaryColor}
                onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                className="h-7 w-7 rounded-full cursor-pointer border-0"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setCreating(false); setError(null) }}
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
              {saving ? 'Creating…' : 'Create Portal'}
            </button>
          </div>
        </form>
      )}

      {portals.length === 0 && !creating && (
        <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed var(--border-primary)' }}>
          <Globe size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No portals yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Create a portal to share project updates with clients</p>
        </div>
      )}

      {/* Portal list + detail */}
      {portals.length > 0 && (
        <div className="space-y-5">
          {/* Portal picker */}
          {portals.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {portals.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPortal(p)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                  style={selected?.id === p.id
                    ? { background: p.primaryColor, color: '#fff' }
                    : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="space-y-5">
              {/* Portal info card */}
              <div className="glass-card rounded-2xl p-5" style={{ border: '1px solid var(--border-primary)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: selected.primaryColor }}
                      >
                        {selected.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{selected.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>/portal/{selected.slug}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                      <Eye size={12} /> {selected.viewCount} views
                    </span>
                    <button
                      onClick={toggleActive}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                      style={selected.active
                        ? { background: '#34C75918', color: '#34C759' }
                        : { background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)' }
                      }
                    >
                      {selected.active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {selected.active ? 'Live' : 'Disabled'}
                    </button>
                    <button
                      onClick={copyLink}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                      style={{ background: 'var(--color-blue)', color: '#fff' }}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'Copied' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* Edit settings */}
                <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border-primary)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Settings</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Name</label>
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-2 text-sm rounded-xl"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Logo URL</label>
                      <input
                        value={editForm.logoUrl}
                        onChange={e => setEditForm(f => ({ ...f, logoUrl: e.target.value }))}
                        placeholder="https://…"
                        className="w-full px-3 py-2 text-sm rounded-xl"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                        <Lock size={11} className="inline mr-1" />
                        Password (leave empty to remove)
                      </label>
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Set or clear password"
                        className="w-full px-3 py-2 text-sm rounded-xl"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                        <Palette size={11} className="inline mr-1" />
                        Brand Color
                      </label>
                      <div className="flex gap-1.5 flex-wrap items-center">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditForm(f => ({ ...f, primaryColor: c }))}
                            className="h-6 w-6 rounded-full border-2 transition-transform"
                            style={{
                              background: c,
                              borderColor: editForm.primaryColor === c ? 'white' : 'transparent',
                              boxShadow: editForm.primaryColor === c ? `0 0 0 2px ${c}` : 'none',
                              transform: editForm.primaryColor === c ? 'scale(1.15)' : 'scale(1)',
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={editForm.primaryColor}
                          onChange={e => setEditForm(f => ({ ...f, primaryColor: e.target.value }))}
                          className="h-6 w-6 rounded-full cursor-pointer border-0"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={deletePortal}
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--color-red)' }}
                    >
                      <Trash2 size={13} /> Delete Portal
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="text-sm px-4 py-2 rounded-xl text-white font-medium"
                      style={{ background: 'var(--color-blue)', opacity: saving ? 0.7 : 1 }}
                    >
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Updates */}
              <div className="glass-card rounded-2xl p-5" style={{ border: '1px solid var(--border-primary)' }}>
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Post Status Update
                </h4>
                <div className="flex gap-2">
                  <textarea
                    value={newUpdate}
                    onChange={e => setNewUpdate(e.target.value)}
                    placeholder="Share a project update with the client…"
                    rows={2}
                    className="flex-1 px-3 py-2 text-sm rounded-xl resize-none"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                  <button
                    onClick={postUpdate}
                    disabled={posting || !newUpdate.trim()}
                    className="flex items-center gap-1.5 text-sm px-4 rounded-xl text-white font-medium self-end py-2"
                    style={{ background: 'var(--color-blue)', opacity: (posting || !newUpdate.trim()) ? 0.5 : 1 }}
                  >
                    <Send size={14} />
                    Post
                  </button>
                </div>

                {updates.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {updates.map(u => (
                      <div key={u.id} className="text-sm pb-3 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--border-primary)' }}>
                        <p style={{ color: 'var(--text-primary)' }}>{u.content}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          {u.createdByName ?? 'You'} · {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
