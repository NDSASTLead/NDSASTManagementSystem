import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { redirect } from 'next/navigation'
import { InviteUserForm } from '@/components/people/InviteUserForm'
import { UserRow } from '@/components/people/UserRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import type { Profile, ProfileResponsibility, Site } from '@/lib/supabase/types'

export default async function PeoplePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'ast_lead') redirect('/dashboard')

  const supabase = await createClient()

  const [
    { data: profiles },
    { data: sites },
    { data: responsibilities },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('sites').select('id, name, short_name').eq('is_active', true).order('name'),
    supabase.from('profile_responsibilities').select('*'),
  ])

  const people = (profiles ?? []) as Profile[]
  const allSites = (sites ?? []) as Site[]
  const allResponsibilities = (responsibilities ?? []) as ProfileResponsibility[]

  // Group responsibilities by profile_id for quick lookup
  const responsibilitiesByProfile: Record<string, ProfileResponsibility[]> = {}
  for (const r of allResponsibilities) {
    if (!responsibilitiesByProfile[r.profile_id]) responsibilitiesByProfile[r.profile_id] = []
    responsibilitiesByProfile[r.profile_id].push(r)
  }

  const active = people.filter(p => p.is_active)
  const inactive = people.filter(p => !p.is_active)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
        <p className="text-gray-500 text-sm mt-1">
          Invite team members and manage their roles. Invited users receive a sign-in link by email.
        </p>
      </div>

      {/* Invite */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invite someone</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      {/* Active members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team members
            <span className="ml-1 text-xs font-normal text-gray-500">({active.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {active.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-4">No active members yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {active.map(p => (
                <UserRow
                  key={p.id}
                  person={p}
                  currentUserId={profile.id}
                  sites={allSites}
                  responsibilities={responsibilitiesByProfile[p.id] ?? []}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive members — shown only if there are any */}
      {inactive.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-500">
              Inactive
              <span className="ml-1 text-xs font-normal">({inactive.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {inactive.map(p => (
                <UserRow
                  key={p.id}
                  person={p}
                  currentUserId={profile.id}
                  sites={allSites}
                  responsibilities={responsibilitiesByProfile[p.id] ?? []}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
