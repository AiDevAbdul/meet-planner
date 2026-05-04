'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const [mode,        setMode]        = useState<Mode>('signin')
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [googleLoad,  setGoogleLoad]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState<string | null>(null)

  function reset() {
    setError(null)
    setSuccess(null)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setName('')
    setEmail('')
    setPassword('')
    reset()
  }

  async function handleGoogleSignIn() {
    setGoogleLoad(true)
    reset()
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    reset()

    if (mode === 'signup') {
      if (!name.trim()) { setError('Full name is required'); return }
      if (password.length < 8) { setError('Password must be at least 8 characters'); return }

      setLoading(true)
      try {
        const res  = await fetch('/api/auth/register', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Registration failed'); return }

        // Auto sign-in after registration
        const result = await signIn('credentials', {
          email, password, redirect: false,
        })
        if (result?.error) {
          setSuccess('Account created! Please sign in.')
          setMode('signin')
        } else {
          window.location.href = '/dashboard'
        }
      } catch {
        setError('Something went wrong. Try again.')
      } finally {
        setLoading(false)
      }
      return
    }

    // Sign-in
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email, password, redirect: false,
      })
      if (result?.error) {
        setError('Invalid email or password')
      } else {
        window.location.href = '/dashboard'
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div
        className="glass-card w-full max-w-sm p-8 flex flex-col gap-5"
        style={{ background: 'var(--bg-primary)' }}
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center gap-2 mb-1">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ background: 'var(--color-blue)' }}
          >
            M
          </div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>
            MeetPlanner
          </h1>
        </div>

        {/* Tab toggle */}
        <div
          className="flex rounded-[10px] p-1"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-1.5 text-[13px] font-medium rounded-[7px] transition-all"
              style={{
                background: mode === m ? 'var(--bg-primary)' : 'transparent',
                color:      mode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow:  mode === m ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Error / success banners */}
        {error && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-[9px] text-[13px]"
            style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--color-red)', border: '1px solid rgba(255,59,48,0.2)' }}
          >
            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}
        {success && (
          <div
            className="px-3 py-2.5 rounded-[9px] text-[13px]"
            style={{ background: 'rgba(52,199,89,0.08)', color: 'var(--color-green)', border: '1px solid rgba(52,199,89,0.2)' }}
          >
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <Field label="Full Name">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                style={inputStyle}
                className="w-full px-3 py-2.5 rounded-[10px] text-[14px] outline-none transition-colors"
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-blue)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </Field>
          )}

          <Field label="Email">
            <input
              type="email"
              placeholder="you@duckercreative.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              className="w-full px-3 py-2.5 rounded-[10px] text-[14px] outline-none transition-colors"
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-blue)' }}
              onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                style={{ ...inputStyle, paddingRight: 40 }}
                className="w-full px-3 py-2.5 rounded-[10px] text-[14px] outline-none transition-colors"
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-blue)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[10px] text-[14px] font-semibold text-white transition-all mt-1"
            style={{
              background: loading ? 'rgba(0,122,255,0.6)' : 'var(--color-blue)',
              cursor:     loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
              : (mode === 'signup' ? 'Create Account'    : 'Sign In')
            }
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoad}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-[10px] text-[14px] font-medium transition-all"
          style={{
            background: 'var(--bg-secondary)',
            color:      'var(--text-primary)',
            border:     '1px solid var(--border-strong)',
            opacity:    googleLoad ? 0.7 : 1,
            cursor:     googleLoad ? 'not-allowed' : 'pointer',
          }}
        >
          <GoogleIcon />
          {googleLoad ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <p className="text-[11px] text-center" style={{ color: 'var(--text-tertiary)' }}>
          @duckercreative.com accounts only
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background:  'var(--bg-secondary)',
  border:      '1px solid var(--border)',
  color:       'var(--text-primary)',
  fontFamily:  'inherit',
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
