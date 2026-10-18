import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarClock, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCurrentProfile } from '@/lib/supabase/helpers'

export default async function SchedulesPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'ast_lead') redirect('/dashboard')

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-700">
          <CalendarClock className="h-7 w-7" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-purple-700">Coming soon</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Schedule overview</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-600">
          A calendar view for recurring maintenance and upcoming scheduled work is being developed.
          You can already create and manage recurring maintenance templates in Settings.
        </p>
        <Button asChild className="mt-6 bg-purple-700 hover:bg-purple-800">
          <Link href="/settings">
            <Settings2 className="mr-2 h-4 w-4" />
            Go to settings
          </Link>
        </Button>
      </div>
    </div>
  )
}
