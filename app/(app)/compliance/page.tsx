import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { getComplianceObligations } from '@/lib/actions/compliance'
import { createClient } from '@/lib/supabase/server'
import { getProfileResponsibilities } from '@/lib/actions/compliance'
import { getProfileScope, CATEGORY_LABELS } from '@/lib/compliance-utils'
import { ComplianceTable } from '@/components/compliance/ComplianceTable'
import { RAGBadge } from '@/components/compliance/RAGBadge'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Plus } from 'lucide-react'
import type { RAGStatus } from '@/lib/supabase/types'

const ACCESS_ROLES = ['responsible_person', 'safety_officer', 'ast_lead', 'trustee']

const PILL = (active: boolean) =>
  `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
    active ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'
  }`

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; category?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!ACCESS_ROLES.includes(profile.role)) redirect('/dashboard')

  const params = await searchParams

  // Determine scope
  let siteId: string | null | undefined = undefined

  if (profile.role === 'responsible_person') {
    const responsibilities = await getProfileResponsibilities(profile.id)
    const scope = getProfileScope(responsibilities)
    siteId = scope.siteIds[0] ?? null
  }

  const obligations = await getComplianceObligations(siteId)

  // Filter by UI params
  const filtered = obligations.filter(ob => {
    if (params.site && ob.site_id !== params.site) return false
    if (params.category && ob.category !== params.category) return false
    return true
  })

  // RAG summary counts (over filtered set)
  const counts = filtered.reduce(
    (acc, ob) => { acc[ob.rag] = (acc[ob.rag] ?? 0) + 1; return acc },
    {} as Record<RAGStatus, number>
  )

  // Categories present after applying only the site filter (not category),
  // ordered by canonical CATEGORY_LABELS order
  const siteFiltered = params.site
    ? obligations.filter(ob => ob.site_id === params.site)
    : obligations
  const availableCategories = Object.keys(CATEGORY_LABELS).filter(cat =>
    siteFiltered.some(ob => ob.category === cat)
  )

  // Sites for the site filter
  const supabase = await createClient()
  const { data: sites } = await supabase.from('sites').select('id, name').eq('is_active', true).order('name')

  const canManage = ['ast_lead', 'safety_officer'].includes(profile.role)
  const showSiteColumn = profile.role !== 'responsible_person'
  const showSiteFilter = showSiteColumn && (sites ?? []).length > 1
  const showCategoryFilter = availableCategories.length > 1

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Compliance Register
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track all legal and operational obligations</p>
        </div>
        {canManage && (
          <Link href="/compliance/new">
            <Button className="bg-purple-700 hover:bg-purple-800 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add obligation
            </Button>
          </Link>
        )}
      </div>

      {/* RAG summary */}
      <div className="flex flex-wrap gap-3">
        {(counts.red ?? 0) > 0 && (
          <RAGBadge status="red" label={`${counts.red} overdue`} />
        )}
        {(counts.amber ?? 0) > 0 && (
          <RAGBadge status="amber" label={`${counts.amber} due soon`} />
        )}
        {(counts.unknown ?? 0) > 0 && (
          <RAGBadge status="unknown" label={`${counts.unknown} no records`} />
        )}
        {(counts.green ?? 0) > 0 && (
          <RAGBadge status="green" label={`${counts.green} compliant`} />
        )}
        {filtered.length === 0 && (
          <span className="text-sm text-gray-400">No obligations found</span>
        )}
      </div>

      {/* Filter + Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        {/* Site filter row */}
        {showSiteFilter && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
            <span className="text-xs text-gray-500 font-medium shrink-0">Site:</span>
            <div className="flex flex-wrap gap-1">
              <Link
                href={`/compliance${params.category ? `?category=${params.category}` : ''}`}
                className={PILL(!params.site)}
              >
                All
              </Link>
              {(sites ?? []).map(s => (
                <Link
                  key={s.id}
                  href={`/compliance?site=${s.id}${params.category ? `&category=${params.category}` : ''}`}
                  className={PILL(params.site === s.id)}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Category filter row */}
        {showCategoryFilter && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
            <span className="text-xs text-gray-500 font-medium shrink-0">Category:</span>
            <div className="flex flex-wrap gap-1">
              <Link
                href={`/compliance${params.site ? `?site=${params.site}` : ''}`}
                className={PILL(!params.category)}
              >
                All
              </Link>
              {availableCategories.map(cat => (
                <Link
                  key={cat}
                  href={`/compliance?${params.site ? `site=${params.site}&` : ''}category=${cat}`}
                  className={PILL(params.category === cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <ComplianceTable
          obligations={filtered}
          showSiteColumn={showSiteColumn}
        />
      </div>
    </div>
  )
}
