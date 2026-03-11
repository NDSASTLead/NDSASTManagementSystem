import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MapPin, ChevronRight } from 'lucide-react'

export default async function ReportHubPage() {
  const supabase = await createClient()

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-700 rounded-full mb-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Spot a problem?</h1>
          <p className="text-gray-500 mt-1 text-sm">Which site are you at?</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {(sites ?? []).map((site, i, arr) => (
            <Link
              key={site.id}
              href={'/report/' + site.slug}
              className={
                'flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors group' +
                (i < arr.length - 1 ? ' border-b border-gray-100' : '')
              }
            >
              <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-gray-900">{site.name}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-purple-500 transition-colors" />
            </Link>
          ))}

          {(sites ?? []).length === 0 && (
            <p className="text-center py-8 text-gray-500 text-sm px-4">
              No sites are currently active. Please contact the maintenance team directly.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Northampton District Scouts &middot; Asset Support Team
        </p>
      </div>
    </div>
  )
}