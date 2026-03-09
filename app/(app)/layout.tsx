import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Avatar } from '@/components/shared/Avatar'
import { Toaster } from '@/components/ui/sonner'
import { getDisplayName } from '@/lib/utils'

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
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-200">
          <div className="w-7 h-7 bg-purple-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <p className="font-semibold text-gray-900 flex-1">NDS Maintenance</p>
          <Link
            href="/help"
            className="w-8 h-8 text-gray-400 flex items-center justify-center flex-shrink-0"
            aria-label="How it works"
          >
            <HelpCircle className="w-5 h-5" />
          </Link>
          <Link href="/account" className="flex-shrink-0">
            <Avatar name={displayName} picturePath={profile.profile_picture_path} size="sm" />
          </Link>
        </div>

        <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      <MobileNav role={profile.role} />
      <Toaster richColors position="top-right" />
    </div>
  )
}
