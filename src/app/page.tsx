'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Mail, Lock, Loader2, Sparkles } from 'lucide-react'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Check configuration on mount
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (
      !url ||
      !key ||
      url.includes('placeholder') ||
      key.includes('placeholder-anon')
    ) {
      setIsConfigured(false)
    }
  }, [])

  // Clear errors when toggling modes
  useEffect(() => {
    setError(null)
    setMessage(null)
  }, [isSignUp])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!isConfigured) {
      setError('Database Connection Required: Please open .env.local in the project root and replace the placeholders with your actual Supabase URL and Anon Key, then restart the Next.js dev server.')
      setLoading(false)
      return
    }

    if (!email || !password) {
      setError('Please fill in all fields.')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        if (data?.user && data.session === null) {
          setMessage('Check your email to confirm your account and sign in.')
        } else {
          router.push('/chat')
          router.refresh()
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/chat')
        router.refresh()
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('Network Error (Failed to fetch): Could not connect to Supabase. Please verify your internet connection and check if your Supabase URL and Anon Key in .env.local are correct.')
      } else {
        setError(err.message || 'An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!isConfigured) {
      setError('Database Connection Required: Please configure .env.local first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('Network Error (Failed to fetch): Could not connect to Supabase for Google OAuth.')
      } else {
        setError(err.message || 'OAuth error.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-tr from-background via-background to-accent/10 relative overflow-hidden">
      {/* Background soft blurs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 mb-4">
            <img src="/logo.png?v=2" alt="Saathi Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
            Saathi
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
            Your gentle, empathetic AI companion. A calm space to reflect, share, and be heard.
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-card border border-border shadow-xl rounded-2xl p-6 sm:p-8 backdrop-blur-xl bg-opacity-80">
          <h2 className="text-xl font-semibold text-card-foreground text-center mb-6">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>

          {!isConfigured && (
            <div className="p-3.5 mb-5 text-xs rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium leading-relaxed animate-fade-in">
              <strong className="block mb-1 font-semibold text-amber-700 dark:text-amber-300">⚠️ Setup Required:</strong>
              It looks like you are using placeholders for Supabase. Open the <code className="bg-background/80 px-1 py-0.5 rounded border border-border">.env.local</code> file in your project and replace them with your actual Supabase project keys to authenticate.
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="p-3.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-medium animate-fade-in leading-relaxed">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3.5 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in leading-relaxed">
                {message}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 active:scale-98 transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                'Sign Up'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-medium text-sm transition-all active:scale-98 disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-medium hover:underline focus:outline-none"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>

        {/* Soft Footer Info */}
        <div className="text-center mt-8 text-xs text-muted-foreground/60 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-primary/60" />
          <span>Your conversations are encrypted and secure.</span>
        </div>
      </div>
    </div>
  )
}
