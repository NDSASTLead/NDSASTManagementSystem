import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { Toaster } from '@/components/ui/sonner'
import { getDisplayName } from '@/lib/utils'
import { ProfilePromptBanner } from '@/components/shared/ProfilePromptBanner'
import type { Profile } from '@/lib/supabase/types'

// Show the profile prompt banner on every fresh login, but only while the
// profile is incomplete (no display name or no profile picture set).
// Once both are set the banner never shows again.
// Dismissed per-session: closes until they log in again.
function shouldShowProfilePrompt(profile: Profile, lastSignInAt: string | undefined): boolean {
  const isIncomplete = !profile.display_name || !profile.profile_picture_path
  if (!isIncomplete) return false
  if (!profile.profile_prompt_dismissed_at) return true
  if (!lastSignInAt) return true
  return new Date(lastSignInAt) > new Date(profile.profile_prompt_dismissed_at)
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const displayName = getDisplayName(profile)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={profile.role} displayName={displayName} picturePath={profile.profile_picture_path} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — sticky, pathname-aware */}
        <MobileHeader displayName={displayName} picturePath={profile.profile_picture_path} />

        {shouldShowProfilePrompt(profile, user.last_sign_in_at) && <ProfilePromptBanner />}

        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      <MobileNav role={profile.role} />
      <Toaster richColors position="top-right" />
    </div>
  )
}
