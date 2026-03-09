'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

/**
 * Listens for Supabase auth state changes on every page and redirects to the
 * update-password page whenever a recovery session is detected.
 *
 * Handles three recovery scenarios:
 *  1. PKCE code exchange — detected server-side in /auth/callback; this is a fallback
 *  2. Explicit PASSWORD_RECOVERY event — hash-based implicit flow (e.g. Supabase dashboard emails)
 *  3. INITIAL_SESSION / SIGNED_IN with recovery amr claim — when the PASSWORD_RECOVERY
 *     event fires before this listener is registered (timing issue on slow hydration)
 *
 * Mounted in the root layout so it is active on every page, including /login.
 */
export function AuthStateListener() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    function isRecoverySession(session: Session | null): boolean {
      if (!session) return false
      try {
        // Decode the JWT payload (middle segment) without a library
        const payload = JSON.parse(atob(session.access_token.split('.')[1]))
        return Array.isArray(payload.amr) &&
          payload.amr.some((m: { method: string }) => m.method === 'recovery')
      } catch {
        return false
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Already on the update-password page — do nothing (avoid redirect loops)
      if (pathname === '/auth/update-password') return

      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/update-password')
        return
      }

      // Handle case where PASSWORD_RECOVERY was missed because it fired before
      // this listener was registered (common with hash-based implicit flow).
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && isRecoverySession(session)) {
        router.push('/auth/update-password')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, pathname])

  return null
}
