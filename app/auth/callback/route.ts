import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/dashboard'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // ── Path A: PKCE code exchange (magic-link, invite, recovery via PKCE) ──
  const code = searchParams.get('code')
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) {
      // Check the JWT amr claim to detect recovery or invite flows
      let flowType: string | null = null
      try {
        const payload = JSON.parse(
          Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString()
        )
        if (Array.isArray(payload.amr)) {
          if (payload.amr.some((m: { method: string }) => m.method === 'recovery')) flowType = 'recovery'
          else if (payload.amr.some((m: { method: string }) => m.method === 'invite')) flowType = 'invite'
        }
      } catch { /* fall through */ }

      if (flowType === 'recovery' || flowType === 'invite') {
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // ── Path B: token_hash OTP verification (Supabase email invite / recovery / magic-link) ──
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      // Invite and recovery both require the user to set a password before continuing
      if (type === 'recovery' || type === 'invite') {
        return NextResponse.redirect(`${origin}/auth/update-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
