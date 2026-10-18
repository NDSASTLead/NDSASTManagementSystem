import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import { getComplianceObligations } from '@/lib/actions/compliance'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { createClient } from '@/lib/supabase/server'
import { RAGBadge } from '@/components/compliance/RAGBadge'
import { CATEGORY_LABELS, formatDueLabel } from '@/lib/compliance-utils'
import type { ComplianceObligationWithStatus, Priority, RAGStatus, Site } from '@/lib/supabase/types'

const REPORT_ROLES = ['ast_member', 'ast_lead', 'trustee']
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

const RAG_STYLES: Record<RAGStatus, { card: string; label: string }> = {
  red: { card: 'border-red-200 bg-red-50', label: 'Red · action needed' },
  amber: { card: 'border-amber-200 bg-amber-50', label: 'Amber · due soon' },
  green: { card: 'border-green-200 bg-green-50', label: 'Green · current' },
  unknown: { card: 'border-gray-200 bg-gray-50', label: 'No status yet' },
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'No record'
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

function siteStatus(obligations: ComplianceObligationWithStatus[]): RAGStatus {
  if (obligations.some(ob => ob.rag === 'red')) return 'red'
  if (obligations.some(ob => ob.rag === 'amber')) return 'amber'
  if (obligations.some(ob => ob.rag === 'unknown')) return 'unknown'
  return obligations.length ? 'green' : 'unknown'
}

function StatCard({ icon: Icon, label, value, tone }: {
  icon: React.ElementType
  label: string
  value: number
  tone: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <Icon className="h-5 w-5 opacity-70" />
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}

export default async function ReportsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!REPORT_ROLES.includes(profile.role)) redirect('/dashboard')

  const supabase = await createClient()
  const today = new Date()
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString()
  const quarterStartMonth = Math.floor(today.getUTCMonth() / 3) * 3
  const quarterStart = new Date(Date.UTC(today.getUTCFullYear(), quarterStartMonth, 1)).toISOString()
  const [{ data: siteRows }, obligations, priorityCounts, monthCount, quarterCount] = await Promise.all([
    supabase.from('sites').select('id, name, short_name').eq('is_active', true).order('name'),
    getComplianceObligations(),
    Promise.all(PRIORITIES.map(async priority => {
      const { count, error } = await supabase.from('tasks')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '("complete","cancelled")')
        .eq('priority', priority)
      if (error) throw new Error(error.message)
      return [priority, count ?? 0] as const
    })),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('status', 'complete').gte('completed_at', monthStart),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('status', 'complete').gte('completed_at', quarterStart),
  ])

  const sites = (siteRows ?? []) as Pick<Site, 'id' | 'name' | 'short_name'>[]
  const bySite = new Map<string, ComplianceObligationWithStatus[]>()
  for (const obligation of obligations) {
    const group = bySite.get(obligation.site_id) ?? []
    group.push(obligation)
    bySite.set(obligation.site_id, group)
  }

  const priorityTotals = Object.fromEntries(priorityCounts) as Record<Priority, number>
  const siteSummaries = sites.map(site => {
    const siteObligations = bySite.get(site.id) ?? []
    const status = siteStatus(siteObligations)
    return {
      ...site,
      obligations: siteObligations,
      status,
      red: siteObligations.filter(ob => ob.rag === 'red').length,
      amber: siteObligations.filter(ob => ob.rag === 'amber').length,
      green: siteObligations.filter(ob => ob.rag === 'green').length,
    }
  })

  const orderedObligations = [...obligations].sort((a, b) => {
    const order: Record<RAGStatus, number> = { red: 0, amber: 1, unknown: 2, green: 3 }
    return order[a.rag] - order[b.rag]
      || (a.next_due_at ?? '9999').localeCompare(b.next_due_at ?? '9999')
      || a.name.localeCompare(b.name)
  })

  return (
    <div className="space-y-8">
      <header className="flex items-start gap-3">
        <div className="rounded-lg bg-purple-100 p-2.5 text-purple-700">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trustee reports</h1>
          <p className="mt-1 text-sm text-gray-500">Property health, compliance status, and maintenance activity across active sites.</p>
        </div>
      </header>

      <section aria-labelledby="site-health-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-700" />
          <h2 id="site-health-heading" className="text-lg font-semibold text-gray-900">Site health</h2>
        </div>
        {siteSummaries.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No active sites found.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {siteSummaries.map(site => (
              <Link key={site.id} href={`/compliance?site=${site.id}`} className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${RAG_STYLES[site.status].card}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{site.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">{site.obligations.length} active compliance {site.obligations.length === 1 ? 'item' : 'items'}</p>
                  </div>
                  <RAGBadge status={site.status} label={RAG_STYLES[site.status].label} />
                </div>
                <div className="mt-5 flex gap-4 text-sm">
                  <span className="text-red-700">{site.red} red</span>
                  <span className="text-amber-700">{site.amber} amber</span>
                  <span className="text-green-700">{site.green} green</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="activity-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-purple-700" />
          <h2 id="activity-heading" className="text-lg font-semibold text-gray-900">Open tasks by priority</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={AlertTriangle} label="Critical" value={priorityTotals.critical} tone="border-red-200 bg-red-50 text-red-900" />
          <StatCard icon={AlertTriangle} label="High" value={priorityTotals.high} tone="border-orange-200 bg-orange-50 text-orange-900" />
          <StatCard icon={AlertTriangle} label="Medium" value={priorityTotals.medium} tone="border-amber-200 bg-amber-50 text-amber-900" />
          <StatCard icon={AlertTriangle} label="Low" value={priorityTotals.low} tone="border-gray-200 bg-gray-50 text-gray-800" />
        </div>
        <div className="flex justify-end">
          <Link href="/tasks" className="text-sm font-medium text-purple-700 hover:text-purple-900">View tasks →</Link>
        </div>
      </section>

      <section aria-labelledby="completed-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-purple-700" />
          <h2 id="completed-heading" className="text-lg font-semibold text-gray-900">Completed work</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard icon={Clock3} label="Completed this month" value={monthCount.count ?? 0} tone="border-blue-200 bg-blue-50 text-blue-900" />
          <StatCard icon={CheckCircle2} label="Completed this quarter" value={quarterCount.count ?? 0} tone="border-green-200 bg-green-50 text-green-900" />
        </div>
        {(monthCount.error || quarterCount.error) && (
          <p className="text-sm text-red-700">Could not load completion totals. Please refresh or contact an administrator.</p>
        )}
      </section>

      <section aria-labelledby="compliance-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-700" />
            <h2 id="compliance-heading" className="text-lg font-semibold text-gray-900">Compliance summary</h2>
          </div>
          <Link href="/compliance" className="text-sm font-medium text-purple-700 hover:text-purple-900">Full register →</Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {orderedObligations.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No active compliance obligations are recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Obligation</th>
                    <th className="px-4 py-3 font-medium">Site</th>
                    <th className="px-4 py-3 font-medium">Legislation / reference</th>
                    <th className="px-4 py-3 font-medium">Last completed</th>
                    <th className="px-4 py-3 font-medium">Next due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderedObligations.map(obligation => (
                    <tr key={obligation.id} className="align-top hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/compliance/${obligation.id}`} className="font-medium text-gray-900 hover:text-purple-700">{obligation.name}</Link>
                        <p className="mt-0.5 text-xs text-gray-500">{CATEGORY_LABELS[obligation.category] ?? obligation.category}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{obligation.site?.short_name ?? obligation.site?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{obligation.legislation_ref || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(obligation.latest_record?.completed_at)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {obligation.next_due_at ? <><span>{formatDate(obligation.next_due_at)}</span><span className="mt-0.5 block text-xs">{formatDueLabel(new Date(obligation.next_due_at))}</span></> : 'Not scheduled'}
                      </td>
                      <td className="px-4 py-3"><RAGBadge status={obligation.rag} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
