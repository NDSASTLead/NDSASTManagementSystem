import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PublicReportForm } from '@/components/public/PublicReportForm'

export default async function PublicReportPage({ params }: { params: Promise<{ 'site-slug': string }> }) {
  const { 'site-slug': slug } = await params
  const supabase = await createClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, name, short_name')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!site) notFound()

  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('site_id', site.id)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-700 rounded-full mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Spot a problem?</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Report it to the {site.short_name} maintenance team.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <PublicReportForm
            siteId={site.id}
            siteName={site.name}
            buildings={buildings ?? []}
          />
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Northampton District Scouts · Asset Support Team
        </p>
      </div>
    </div>
  )
}
