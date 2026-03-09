import { redirect } from 'next/navigation'

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; token_hash?: string; type?: string; next?: string; error?: string }>
}) {
  const { code, token_hash, type, next, error } = await searchParams

  // Recovery/magic-link emails from Supabase use the Site URL (this page) as their
  // redirect_to. Forward all auth params to the callback handler so the session is
  // established correctly regardless of which Supabase email flow is in use.

  // PKCE code exchange (app-initiated flows)
  if (code) {
    const params = new URLSearchParams({ code })
    if (next) params.set('next', next)
    if (error) params.set('error', error)
    redirect(`/auth/callback?${params.toString()}`)
  }

  // OTP / token_hash verification (Supabase dashboard emails: recovery, magic-link, etc.)
  if (token_hash && type) {
    const params = new URLSearchParams({ token_hash, type })
    if (next) params.set('next', next)
    redirect(`/auth/callback?${params.toString()}`)
  }

  redirect('/dashboard')
}
