import { redirect } from 'next/navigation'
import { CalendarClock } from 'lucide-react'
import { MaintenanceTemplatesManager } from '@/components/settings/MaintenanceTemplatesManager'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import type { AssetCategory, Building, MaintenanceTemplate, Site } from '@/lib/supabase/types'

export default async function SchedulesPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'ast_lead') redirect('/dashboard')

  const supabase = await createClient()
  const [sitesResult, buildingsResult, templatesResult, categoriesResult] = await Promise.all([
    supabase.from('sites').select('*').eq('is_active', true).order('name'),
    supabase.from('buildings').select('*').eq('is_active', true).order('name'),
    supabase.from('maintenance_templates').select('*').order('title'),
    supabase.from('asset_categories').select('*').order('name'),
  ])

  const sites = (sitesResult.data ?? []) as Site[]
  const buildings = (buildingsResult.data ?? []) as Building[]
  const templates = (templatesResult.data ?? []) as MaintenanceTemplate[]
  const categories = (categoriesResult.data ?? []) as AssetCategory[]
  const sitesWithTemplates = sites.map(site => ({
    ...site,
    buildings: buildings.filter(building => building.site_id === site.id),
    templates: templates.filter(template => template.site_id === site.id),
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start gap-3">
        <div className="rounded-lg bg-purple-100 p-2.5 text-purple-700">
          <CalendarClock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage recurring maintenance templates. Active templates generate tasks ahead of their due dates.
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Editing a schedule changes future generated tasks. Tasks that have already been created remain in the task list.
      </div>

      <MaintenanceTemplatesManager sites={sitesWithTemplates} categories={categories} />
    </div>
  )
}
