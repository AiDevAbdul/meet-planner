'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import {
  Eye, EyeOff, AlertCircle, CheckCircle2,
  Calendar, MessageSquare, LayoutDashboard, Users, ArrowRight,
} from 'lucide-react'

type Mode = 'signin' | 'signup'

const features = [
  {
    icon: Calendar,
    label: 'Meeting Intelligence',
    desc: 'AI extracts structured tasks from any meeting note or transcript automatically.',
  },
  {
    icon: LayoutDashboard,
    label: 'Kanban Boards',
    desc: 'Visualize project progress with drag-and-drop boards across every team.',
  },
  {
    icon: Users,
    label: 'Team Workload',
    desc: 'Assign work, track capacity, and see who needs help — in real time.',
  },
  {
    icon: MessageSquare,
    label: 'Department Channels',
    desc: 'Contextual messaging organized by department, right inside your workflow.',
  },
]

export default function LoginPage() {
  const [mode,       setMode]       = useState<Mode>('signin')
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [googleLoad, setGoogleLoad] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState<string | null>(null)

  function reset() { setError(null); setSuccess(null) }

  function switchMode(m: Mode) {
    setMode(m); setName(''); setEmail(''); setPassword(''); reset()
  }

  async function handleGoogleSignIn() {
    setGoogleLoad(true); reset()
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); reset()

    if (mode === 'signup') {
      if (!name.trim())          { setError('Full name is required'); return }
      if (password.length < 8)   { setError('Password must be at least 8 characters'); return }

      setLoading(true)
      try {
        const res  = await fetch('/api/auth/register', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name, email, password }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Registration failed'); return }

        const result = await signIn('credentials', { email, password, redirect: false })
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

    setLoading(true)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
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
    <>
      <style>{`
        @keyframes orbDrift1 {
          0%   { transform: translate(0,    0)    scale(1);    }
          50%  { transform: translate(48px, 32px) scale(1.12); }
          100% { transform: translate(0,    0)    scale(1);    }
        }
        @keyframes orbDrift2 {
          0%   { transform: translate(0,     0)     scale(1);    }
          50%  { transform: translate(-36px, -52px) scale(1.08); }
          100% { transform: translate(0,     0)     scale(1);    }
        }
        @keyframes orbDrift3 {
          0%   { transform: translate(0,    0)     scale(1);    }
          50%  { transform: translate(28px, -36px) scale(1.15); }
          100% { transform: translate(0,    0)     scale(1);    }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
        .login-input {
          background:    var(--bg-secondary, #F2F2F7);
          border:        1px solid var(--border-strong, rgba(0,0,0,0.15));
          border-radius: 10px;
          padding:       11px 14px;
          font-size:     15px;
          color:         var(--text-primary, #000);
          font-family:   inherit;
          width:         100%;
          outline:       none;
          transition:    border-color 150ms ease, box-shadow 150ms ease;
        }
        .login-input:focus {
          border-color: var(--color-blue, #007AFF);
          box-shadow:   0 0 0 3px rgba(0,122,255,0.15);
        }
        .login-input::placeholder { color: var(--text-tertiary, rgba(60,60,67,0.3)); }
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms cubic-bezier(0.25,0.46,0.45,0.94);
          background: var(--bg-primary, #fff);
          color: var(--text-primary, #000);
          border: 1px solid var(--border-strong, rgba(0,0,0,0.15));
          box-shadow: 0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
        }
        .google-btn:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }
        .google-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          border: none;
          cursor: pointer;
          transition: all 150ms cubic-bezier(0.25,0.46,0.45,0.94);
          background: var(--color-blue, #007AFF);
          box-shadow: 0 2px 10px rgba(0,122,255,0.28);
        }
        .submit-btn:hover:not(:disabled) {
          filter: brightness(1.08);
          box-shadow: 0 4px 18px rgba(0,122,255,0.38);
          transform: translateY(-1px);
        }
        .submit-btn:active:not(:disabled) { transform: scale(0.97); }
        .submit-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
        .tab-btn {
          flex: 1;
          padding: 7px 12px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 7px;
          border: none;
          cursor: pointer;
          transition: all 150ms ease;
        }
      `}</style>

      <div
        className="min-h-screen flex"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}
      >
        {/* ── LEFT PANEL — Brand ── */}
        <div className="hidden lg:flex lg:w-[52%] xl:w-[54%] relative overflow-hidden flex-col justify-between p-12">
          {/* Deep dark bg */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #050508 0%, #0b0d14 60%, #0a0812 100%)' }} />

          {/* Animated gradient orbs */}
          <div style={{
            position: 'absolute', width: 700, height: 700,
            background: 'radial-gradient(circle, rgba(0,122,255,0.28) 0%, transparent 68%)',
            top: -160, left: -160,
            animation: 'orbDrift1 14s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: 560, height: 560,
            background: 'radial-gradient(circle, rgba(88,86,214,0.22) 0%, transparent 68%)',
            bottom: -80, right: -120,
            animation: 'orbDrift2 18s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: 420, height: 420,
            background: 'radial-gradient(circle, rgba(175,82,222,0.16) 0%, transparent 68%)',
            top: '42%', left: '38%',
            animation: 'orbDrift3 22s ease-in-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Subtle grid */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '44px 44px',
          }} />

          {/* Vignette */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
          }} />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3" style={{ animation: 'fadeSlideUp 0.5s ease-out both' }}>
            <div style={{
              width: 40, height: 40, flexShrink: 0,
              background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 28px rgba(0,122,255,0.45)',
            }}>
              <LayoutDashboard size={20} color="#fff" strokeWidth={1.5} />
            </div>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>
              MeetPlanner
            </span>
          </div>

          {/* Hero copy + features */}
          <div className="relative z-10 flex flex-col gap-10 max-w-[460px]" style={{ animation: 'fadeSlideUp 0.5s 0.1s ease-out both', opacity: 0 }}>
            <div>
              <h1 style={{
                fontSize: 'clamp(2rem, 3.2vw, 3rem)',
                fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em',
                color: '#fff', marginBottom: 16,
              }}>
                Meetings become<br />
                <span style={{
                  background: 'linear-gradient(135deg, #4DA3FF 0%, #7B79FF 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  action items.
                </span>
              </h1>
              <p style={{
                color: 'rgba(235,235,245,0.55)',
                fontSize: 16, lineHeight: 1.65, fontWeight: 400,
              }}>
                AI-powered meeting intelligence for teams that move fast.
                Turn any transcript into structured tasks in seconds.
              </p>
            </div>

            {/* Feature list */}
            <div className="flex flex-col gap-5">
              {features.map(({ icon: Icon, label, desc }, i) => (
                <div
                  key={label}
                  className="flex items-start gap-4"
                  style={{ animation: `fadeSlideUp 0.4s ${0.2 + i * 0.07}s ease-out both`, opacity: 0 }}
                >
                  <div style={{
                    width: 36, height: 36, flexShrink: 0,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={17} color="rgba(235,235,245,0.65)" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: 600, marginBottom: 3 }}>
                      {label}
                    </div>
                    <div style={{ color: 'rgba(235,235,245,0.42)', fontSize: 13, lineHeight: 1.55 }}>
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10" style={{ animation: 'fadeSlideUp 0.4s 0.55s ease-out both', opacity: 0 }}>
            <p style={{ color: 'rgba(235,235,245,0.22)', fontSize: 12, letterSpacing: '0.01em' }}>
              Ducker Creative &mdash; Internal Platform &mdash; {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL — Auth ── */}
        <div
          className="flex-1 flex items-center justify-center p-6 lg:p-10 relative"
          style={{ background: 'var(--bg-secondary, #F2F2F7)', minHeight: '100dvh' }}
        >
          {/* Mobile logo */}
          <div className="absolute top-6 left-6 flex items-center gap-2.5 lg:hidden">
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #007AFF, #5856D6)',
              borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LayoutDashboard size={15} color="#fff" strokeWidth={1.5} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #000)' }}>MeetPlanner</span>
          </div>

          <div className="w-full max-w-[400px]" style={{ animation: 'fadeSlideUp 0.45s 0.05s ease-out both', opacity: 0 }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{
                fontSize: 28, fontWeight: 700, letterSpacing: '-0.022em',
                color: 'var(--text-primary, #000)', marginBottom: 6,
              }}>
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary, rgba(60,60,67,0.6))', lineHeight: 1.5 }}>
                {mode === 'signin'
                  ? 'Sign in to your MeetPlanner workspace'
                  : 'Join your team on MeetPlanner'}
              </p>
            </div>

            {/* Google — primary CTA */}
            <button
              className="google-btn"
              onClick={handleGoogleSignIn}
              disabled={googleLoad}
              aria-label="Continue with Google"
              style={{ opacity: googleLoad ? 0.65 : 1, cursor: googleLoad ? 'not-allowed' : 'pointer' }}
            >
              <GoogleIcon />
              <span style={{ flex: 1, textAlign: 'left' }}>
                {googleLoad ? 'Redirecting…' : 'Continue with Google'}
              </span>
              {!googleLoad && (
                <ArrowRight size={15} strokeWidth={2} style={{ color: 'var(--text-tertiary, rgba(60,60,67,0.3))', flexShrink: 0 }} />
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3" style={{ margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border, rgba(0,0,0,0.08))' }} />
              <span style={{ fontSize: 12, color: 'var(--text-tertiary, rgba(60,60,67,0.3))', fontWeight: 500, whiteSpace: 'nowrap' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border, rgba(0,0,0,0.08))' }} />
            </div>

            {/* Form card */}
            <div style={{
              background:   'var(--bg-primary, #fff)',
              border:       '1px solid var(--border, rgba(0,0,0,0.08))',
              borderRadius: 18,
              padding:      '22px 22px 20px',
              boxShadow:    '0 2px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
            }}>
              {/* Tab toggle */}
              <div
                className="flex"
                style={{
                  background: 'var(--bg-secondary, #F2F2F7)',
                  border: '1px solid var(--border, rgba(0,0,0,0.08))',
                  borderRadius: 10,
                  padding: 4,
                  marginBottom: 20,
                }}
              >
                {(['signin', 'signup'] as Mode[]).map(m => (
                  <button
                    key={m}
                    className="tab-btn"
                    onClick={() => switchMode(m)}
                    aria-pressed={mode === m}
                    style={{
                      background: mode === m ? 'var(--bg-primary, #fff)' : 'transparent',
                      color:      mode === m ? 'var(--text-primary, #000)' : 'var(--text-secondary, rgba(60,60,67,0.6))',
                      boxShadow:  mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {m === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              {/* Alerts */}
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2"
                  style={{
                    padding: '10px 12px', borderRadius: 9, marginBottom: 16,
                    background: 'rgba(255,59,48,0.08)',
                    color: 'var(--color-red, #FF3B30)',
                    border: '1px solid rgba(255,59,48,0.18)',
                    fontSize: 13,
                  }}
                >
                  <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}
              {success && (
                <div
                  role="status"
                  className="flex items-center gap-2"
                  style={{
                    padding: '10px 12px', borderRadius: 9, marginBottom: 16,
                    background: 'rgba(52,199,89,0.08)',
                    color: 'var(--color-green, #34C759)',
                    border: '1px solid rgba(52,199,89,0.18)',
                    fontSize: 13,
                  }}
                >
                  <CheckCircle2 size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                  {success}
                </div>
              )}

              {/* Form fields */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {mode === 'signup' && (
                  <Field label="Full Name" htmlFor="inp-name">
                    <input
                      id="inp-name"
                      className="login-input"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoComplete="name"
                      aria-required="true"
                    />
                  </Field>
                )}

                <Field label="Email" htmlFor="inp-email">
                  <input
                    id="inp-email"
                    className="login-input"
                    type="email"
                    placeholder="you@duckercreative.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-required="true"
                  />
                </Field>

                <Field label="Password" htmlFor="inp-password">
                  <div className="relative">
                    <input
                      id="inp-password"
                      className="login-input"
                      type={showPw ? 'text' : 'password'}
                      placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      aria-required="true"
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      tabIndex={-1}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-tertiary, rgba(60,60,67,0.3))',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      {showPw
                        ? <EyeOff size={15} strokeWidth={1.5} />
                        : <Eye    size={15} strokeWidth={1.5} />}
                    </button>
                  </div>
                </Field>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                  style={{ marginTop: 4 }}
                >
                  {loading
                    ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                    : (mode === 'signup' ? 'Create Account'    : 'Sign In')}
                </button>
              </form>
            </div>

            {/* Footer note */}
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-tertiary, rgba(60,60,67,0.3))' }}>
              @duckercreative.com accounts only
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: 'var(--text-tertiary, rgba(60,60,67,0.3))',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
