import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MapPin, ChevronRight } from 'lucide-react'

export default async function ReportHubPage() {
  const supabase = await createClient()

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, short_name, slug, description')
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
            Select the site where you spotted the problem.
          </p>
        </div>

        <div className="space-y-3">
          {(sites ?? []).map(site => (
            <Link
              key={site.id}
              href={'/report/' + site.slug}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 hover:border-purple-300 hover:shadow-md transition-all group"
            >
              <div className="flex-shrink-0 w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <MapPin className="w-4 h-4 text-purple-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{site.name}</p>
                {site.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{site.description}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-purple-600 transition-colors" />
            </Link>
          ))}

          {(sites ?? []).length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No sites are currently active. Please contact the maintenance team directly.
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Northampton District Scouts &middot; Asset Support Team
        </p>
      </div>
    </div>
  )
}