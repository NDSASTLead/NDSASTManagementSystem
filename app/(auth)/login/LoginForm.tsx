'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

type Mode = 'magic-link' | 'password'

export default function LoginForm({ passwordReset = false }: { passwordReset?: boolean }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(passwordReset ? 'password' : 'magic-link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentReset, setSentReset] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message ?? 'Invalid email or password.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false,
        },
      })
      if (error) {
        setError(error.message ?? 'Something went wrong. Please check your email address and try again.')
      } else {
        setSent(true)
      }
    }

    setLoading(false)
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPassword('')
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email address above first, then click Forgot password.')
      return
    }
    setError(null)
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })
    setLoading(false)
    setSentReset(true)
  }

  if (sentReset) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
        <p className="text-gray-600 text-sm">
          We&apos;ve sent a password reset link to <strong>{email}</strong>.
          Click it to choose a new password.
        </p>
        <p className="text-gray-400 text-xs mt-4">Check your spam folder if you don&apos;t see it.</p>
        <Button variant="ghost" className="mt-4 text-sm" onClick={() => setSentReset(false)}>
          Back to sign in
        </Button>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h3>
        <p className="text-gray-600 text-sm">
          We&apos;ve sent a sign-in link to <strong>{email}</strong>.
          Click the link in the email to sign in.
        </p>
        <p className="text-gray-400 text-xs mt-4">
          Check your spam folder if you don&apos;t see it within a few minutes.
        </p>
        <Button
          variant="ghost"
          className="mt-4 text-sm"
          onClick={() => { setSent(false); setEmail('') }}
        >
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {passwordReset && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <svg className="w-4 h-4 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-800">
            Password updated — sign in with your new password below.
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="email" className="text-base font-medium">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
          className="mt-1 h-12 text-base"
        />
      </div>

      {mode === 'password' && (
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-base font-medium">
              Password
            </Label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-xs text-purple-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            required
            autoComplete="current-password"
            className="mt-1 h-12 text-base"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading || !email || (mode === 'password' && !password)}
        className="w-full h-12 text-base bg-purple-700 hover:bg-purple-800"
      >
        {loading
          ? (mode === 'password' ? 'Signing in...' : 'Sending...')
          : (mode === 'password' ? 'Sign in' : 'Send sign-in link')}
      </Button>

      <p className="text-center text-sm text-gray-500">
        {mode === 'magic-link' ? (
          <>
            Have a password?{' '}
            <button
              type="button"
              onClick={() => switchMode('password')}
              className="text-purple-700 hover:underline font-medium"
            >
              Sign in with password
            </button>
          </>
        ) : (
          <>
            Prefer a link?{' '}
            <button
              type="button"
              onClick={() => switchMode('magic-link')}
              className="text-purple-700 hover:underline font-medium"
            >
              Send magic link instead
            </button>
          </>
        )}
      </p>
    </form>
  )
}
