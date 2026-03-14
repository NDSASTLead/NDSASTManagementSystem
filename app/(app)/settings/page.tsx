import { redirect } from 'next/navigation'
import { Settings, Building2, CalendarClock, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { SiteQRCard } from '@/components/settings/SiteQRCard'
import { BuildingsManager } from '@/components/settings/BuildingsManager'
import { MaintenanceTemplatesManager } from '@/components/settings/MaintenanceTemplatesManager'
import type { Site, Building, MaintenanceTemplate } from '@/lib/supabase/types'

export default async function SettingsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')

  const isAdmin = ['ast_lead', 'trustee', 'safety_officer'].includes(profile.role)
  const isTemplateAdmin = ['ast_lead', 'safety_officer'].includes(profile.role)

  // Fetch sites based on role — admin roles see all; others see their assigned sites
  let sites: Site[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('sites')
      .select('*')
      .eq('is_active', true)
      .order('name')
    sites = (data ?? []).sort((a, b) => a.slug === 'general' ? 1 : b.slug === 'general' ? -1 : 0)
  } else {
    const { data } = await supabase
      .from('profile_sites')
      .select('site:sites(*)')
      .eq('profile_id', profile.id)
    sites = (data ?? [])
      .map((row) => row.site as unknown as Site)
      .filter((s): s is Site => s !== null && s.is_active)
      .sort((a, b) => a.slug === 'general' ? 1 : b.slug === 'general' ? -1 : 0)
  }

  // Fetch buildings for admin users
  let sitesWithBuildings: (Site & { buildings: Building[] })[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('buildings')
      .select('*')
      .in('site_id', sites.map(s => s.id))
      .order('name')
    const buildingsBySite = (data ?? []).reduce<Record<string, Building[]>>((acc, b) => {
      if (!acc[b.site_id]) acc[b.site_id] = []
      acc[b.site_id].push(b)
      return acc
    }, {})
    sitesWithBuildings = sites.map(s => ({ ...s, buildings: buildingsBySite[s.id] ?? [] }))
  }

  // Fetch maintenance templates for template admins
  let sitesWithTemplates: (Site & { buildings: Building[]; templates: MaintenanceTemplate[] })[] = []
  if (isTemplateAdmin) {
    const { data: templatesData } = await supabase
      .from('maintenance_templates')
      .select('*')
      .in('site_id', sites.map(s => s.id))
      .order('title')
    const templatesBySite = (templatesData ?? []).reduce<Record<string, MaintenanceTemplate[]>>((acc, t) => {
      if (!acc[t.site_id]) acc[t.site_id] = []
      acc[t.site_id].push(t)
      return acc
    }, {})
    sitesWithTemplates = sitesWithBuildings.map(s => ({
      ...s,
      templates: templatesBySite[s.id] ?? [],
    }))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-10 pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-purple-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">App links, QR codes, and site configuration</p>
        </div>
      </div>

      {/* Public Report Links */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Public report links</h2>
        <p className="text-sm text-gray-500 mb-4">
          Anyone can submit a maintenance issue using these links — no login needed.
          Display the QR code at each building so volunteers and visitors can report problems easily.
        </p>

        {sites.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
            No sites assigned to your account yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
            <SiteQRCard
              siteName="All sites — general report link"
              appUrl={appUrl}
            />
            {sites.map(site => (
              <SiteQRCard
                key={site.id}
                siteName={site.name}
                siteSlug={site.slug}
                appUrl={appUrl}
              />
            ))}
          </div>
        )}
      </section>

      {/* Buildings & Areas — admin only */}
      {isAdmin && (
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Buildings &amp; areas</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Add, rename, or deactivate buildings and areas. Deactivated entries are hidden from new tasks but kept for historical records.
          </p>
          <BuildingsManager sites={sitesWithBuildings} />
        </section>
      )}

      {/* Maintenance Templates — safety_officer + ast_lead */}
      {isTemplateAdmin && (
        <section>
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Maintenance templates</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Define recurring maintenance schedules. Tasks are auto-generated ahead of their due date so the right person has time to act.
          </p>
          <MaintenanceTemplatesManager sites={sitesWithTemplates} />
        </section>
      )}

      {/* Notification settings — all users */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-900">Notification settings</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Choose which emails you receive from the system.
        </p>
        <a
          href="/settings/notifications"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 hover:bg-purple-50 transition-colors group"
        >
          <span className="text-sm font-medium text-gray-900">Manage notifications</span>
          <Bell className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
        </a>
      </section>

    </div>
  )
}
