import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { redirect } from 'next/navigation'
import { TaskCreateForm } from '@/components/tasks/TaskCreateForm'

export default async function NewTaskPage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  // Use service client for site/profile lookups to avoid cookie-based auth
  // context issues that can silently return empty results in server components.
  const service = createServiceClient()

  // Get sites this user can see
  let sitesQuery = service.from('sites').select('id, name, short_name').eq('is_active', true).order('name')

  if (['volunteer', 'responsible_person'].includes(profile.role)) {
    const { data: ps } = await service
      .from('profile_sites')
      .select('site_id')
      .eq('profile_id', profile.id)
    const siteIds = (ps ?? []).map(r => r.site_id)
    if (siteIds.length) {
      sitesQuery = sitesQuery.in('id', siteIds)
    } else {
      // No site assignments — show no sites rather than all sites
      sitesQuery = sitesQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
    }
  }

  const [{ data: sites }, { data: categories }] = await Promise.all([
    sitesQuery,
    service.from('asset_categories').select('id, name').order('name'),
  ])

  // Get buildings for first site
  const firstSiteId = sites?.[0]?.id
  const { data: buildings } = firstSiteId
    ? await service.from('buildings').select('id, site_id, name').eq('site_id', firstSiteId).eq('is_active', true)
    : { data: [] }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report a problem</h1>
        <p className="text-gray-500 mt-1">Tell us what needs fixing and we&apos;ll get it sorted.</p>
      </div>

      <TaskCreateForm
        sites={sites ?? []}
        initialBuildings={buildings ?? []}
        categories={categories ?? []}
      />
    </div>
  )
}
