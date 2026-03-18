import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, AlertTriangle, Clock, CheckCircle2, ClipboardList, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RAGBadge, RAGDot } from '@/components/compliance/RAGBadge'
import { getComplianceObligations, getProfileResponsibilities } from '@/lib/actions/compliance'
import { getProfileScope } from '@/lib/compliance-utils'
import { CATEGORY_LABELS } from '@/lib/compliance-utils'
import type { TaskWithRelations, ComplianceObligationWithStatus } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const isComplianceUser = ['safety_officer', 'ast_lead', 'trustee', 'responsible_person'].includes(profile.role)
  const isTrustee = profile.role === 'trustee'
  const isAdminRole = ['ast_lead', 'safety_officer'].includes(profile.role)
  const isVolunteer = profile.role === 'volunteer'

  // ── Compliance obligations (for compliance-aware roles) ──────────────────
  let obligations: ComplianceObligationWithStatus[] = []
  if (isComplianceUser) {
    const all = await getComplianceObligations()
    if (profile.role === 'responsible_person') {
      const responsibilities = await getProfileResponsibilities(profile.id)
      const scope = getProfileScope(responsibilities)
      if (scope.siteIds.length > 0) {
        obligations = all.filter(o => {
          if (!scope.siteIds.includes(o.site_id)) return false
          if (scope.categories !== null && !scope.categories.includes(o.category)) return false
          return true
        })
      }
    } else {
      obligations = all
    }
  }

  const ragRed    = obligations.filter(o => o.rag === 'red').length
  const ragAmber  = obligations.filter(o => o.rag === 'amber').length
  const ragGreen  = obligations.filter(o => o.rag === 'green').length

  // Category breakdown (trustee)
  const categoryRag: Record<string, { red: number; amber: number; green: number }> = {}
  for (const o of obligations) {
    if (!categoryRag[o.category]) categoryRag[o.category] = { red: 0, amber: 0, green: 0 }
    if (o.rag === 'red')        categoryRag[o.category].red++
    else if (o.rag === 'amber') categoryRag[o.category].amber++
    else if (o.rag === 'green') categoryRag[o.category].green++
  }

  const overdueObligations = obligations.filter(o => o.rag === 'red').slice(0, 6)
  const amberObligations   = obligations.filter(o => o.rag === 'amber').slice(0, 6)

  // ── Task counts ──────────────────────────────────────────────────────────
  const taskSelect = 'id'
  const detailSelect = '*, site:sites(short_name), building:buildings(name), assigned_profile:profiles!tasks_assigned_to_fkey(full_name)'
  const activeStatuses = ['open', 'assigned', 'in_progress'] as const

  let openQuery     = supabase.from('tasks').select(taskSelect, { count: 'exact', head: true }).in('status', activeStatuses)
  let overdueQuery  = supabase.from('tasks').select(taskSelect, { count: 'exact', head: true }).in('status', activeStatuses).lt('due_date', today)
  let doneQuery     = supabase.from('tasks').select(taskSelect, { count: 'exact', head: true }).eq('status', 'complete').gte('completed_at', monthStart)
  let listQuery     = supabase.from('tasks').select(detailSelect).in('status', activeStatuses).order('due_date', { ascending: true, nullsFirst: false }).limit(8)

  // Volunteers only see their assigned tasks
  if (isVolunteer) {
    openQuery    = openQuery.eq('assigned_to', profile.id)
    overdueQuery = overdueQuery.eq('assigned_to', profile.id)
    doneQuery    = doneQuery.eq('assigned_to', profile.id)
    listQuery    = listQuery.eq('assigned_to', profile.id)
  }

  // My tasks: tasks assigned to the current user (for non-volunteer, non-trustee roles)
  const myTasksQuery = (!isVolunteer && !isTrustee)
    ? supabase.from('tasks').select(detailSelect).in('status', activeStatuses).eq('assigned_to', profile.id).order('due_date', { ascending: true, nullsFirst: false }).limit(8)
    : null

  const [openRes, overdueRes, doneRes, listRes, myTasksRes] = await Promise.all([
    openQuery,
    overdueQuery,
    doneQuery,
    isTrustee ? Promise.resolve({ data: [] }) : listQuery,
    myTasksQuery ?? Promise.resolve({ data: [] }),
  ])

  const openCount     = openRes.count ?? 0
  const overdueCount  = overdueRes.count ?? 0
  const doneCount     = doneRes.count ?? 0
  const recentTasks   = (listRes.data ?? []) as TaskWithRelations[]
  const myTasks       = (myTasksRes.data ?? []) as TaskWithRelations[]

  const greeting = profile.display_name || profile.full_name.split(' ')[0]

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hi, {greeting}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {!isTrustee && (
          <Button asChild className="bg-purple-700 hover:bg-purple-800">
            <Link href="/tasks/new">
              <PlusCircle className="w-4 h-4 mr-2" />
              Report a problem
            </Link>
          </Button>
        )}
      </div>

      {/* ── Compliance widget (compliance-aware roles) ── */}
      {isComplianceUser && obligations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              Compliance overview
            </CardTitle>
            {!isTrustee && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/compliance" className="text-purple-700">View register</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* RAG strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className={
                'rounded-lg p-3 text-center ' +
                (ragRed > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50')
              }>
                <p className={`text-2xl font-bold ${ragRed > 0 ? 'text-red-700' : 'text-gray-400'}`}>{ragRed}</p>
                <p className={`text-xs mt-0.5 ${ragRed > 0 ? 'text-red-600' : 'text-gray-400'}`}>Overdue / at risk</p>
              </div>
              <div className={
                'rounded-lg p-3 text-center ' +
                (ragAmber > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50')
              }>
                <p className={`text-2xl font-bold ${ragAmber > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{ragAmber}</p>
                <p className={`text-xs mt-0.5 ${ragAmber > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Due soon</p>
              </div>
              <div className={
                'rounded-lg p-3 text-center ' +
                (ragGreen > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50')
              }>
                <p className={`text-2xl font-bold ${ragGreen > 0 ? 'text-green-700' : 'text-gray-400'}`}>{ragGreen}</p>
                <p className={`text-xs mt-0.5 ${ragGreen > 0 ? 'text-green-600' : 'text-gray-400'}`}>Compliant</p>
              </div>
            </div>

            {/* Safety Officer / AST Lead: overdue + amber lists */}
            {isAdminRole && (
              <div className="space-y-3">
                {overdueObligations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">Overdue / at risk</p>
                    <div className="space-y-0.5">
                      {overdueObligations.map(o => (
                        <Link
                          key={o.id}
                          href={`/compliance/${o.id}`}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <RAGDot status={o.rag} />
                            <span className="text-sm text-gray-800 truncate group-hover:text-purple-700">{o.name}</span>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {o.next_due_at
                              ? new Date(o.next_due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                              : 'No record'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {amberObligations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1.5">Due soon</p>
                    <div className="space-y-0.5">
                      {amberObligations.map(o => (
                        <Link
                          key={o.id}
                          href={`/compliance/${o.id}`}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <RAGDot status={o.rag} />
                            <span className="text-sm text-gray-800 truncate group-hover:text-purple-700">{o.name}</span>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {o.next_due_at
                              ? new Date(o.next_due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                              : ''}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {overdueObligations.length === 0 && amberObligations.length === 0 && (
                  <p className="text-sm text-green-700 text-center py-1">
                    All obligations are currently compliant ✓
                  </p>
                )}
              </div>
            )}

            {/* Trustee: category breakdown */}
            {isTrustee && Object.keys(categoryRag).length > 0 && (
              <div className="space-y-1.5 border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">By category</p>
                {Object.entries(categoryRag).sort((a, b) => b[1].red - a[1].red).map(([cat, counts]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{CATEGORY_LABELS[cat] ?? cat}</span>
                    <div className="flex items-center gap-3">
                      {counts.red > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                          <RAGDot status="red" />
                          {counts.red}
                        </span>
                      )}
                      {counts.amber > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                          <RAGDot status="amber" />
                          {counts.amber}
                        </span>
                      )}
                      {counts.green > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                          <RAGDot status="green" />
                          {counts.green}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Responsible Person: needs-attention list */}
            {profile.role === 'responsible_person' && (overdueObligations.length > 0 || amberObligations.length > 0) && (
              <div className="space-y-0.5 border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Needs attention</p>
                {[...overdueObligations, ...amberObligations].map(o => (
                  <Link
                    key={o.id}
                    href={`/compliance/${o.id}`}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RAGDot status={o.rag} />
                      <span className="text-sm text-gray-800 truncate group-hover:text-purple-700">{o.name}</span>
                    </div>
                    <span className="text-xs text-purple-600 font-medium group-hover:underline flex-shrink-0 ml-2">
                      Record →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Task stats ── */}
      {isTrustee ? (
        /* Trustee: compact read-only task counts */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Task overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-900">{openCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Open</p>
              </div>
              <div className={`rounded-lg p-3 ${overdueCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>{overdueCount}</p>
                <p className={`text-xs mt-0.5 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Overdue</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{doneCount}</p>
                <p className="text-xs text-green-600 mt-0.5">Done this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* All other roles: stat cards grid */
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Open tasks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{openCount}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={overdueCount > 0 ? 'border-red-200 bg-red-50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm ${overdueCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Overdue</p>
                  <p className={`text-3xl font-bold mt-1 ${overdueCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                    {overdueCount}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${overdueCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <AlertTriangle className={`w-5 h-5 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">Done this month</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{doneCount}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── My tasks (non-volunteer, non-trustee) ── */}
      {!isVolunteer && !isTrustee && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">My tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks?assigned_to=me" className="text-purple-700">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {myTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No tasks assigned to you.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {myTasks.map(task => {
                  const isOverdue = task.due_date && task.due_date < today
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">
                            {task.site?.short_name}
                            {task.building && ` · ${task.building.name}`}
                          </span>
                          {task.due_date && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                              <Clock className="w-3 h-3" />
                              {isOverdue ? 'Overdue · ' : ''}
                              {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Active task list (non-trustee) ── */}
      {!isTrustee && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Active tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks" className="text-purple-700">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">All caught up!</p>
                <p className="text-sm mt-1">No active tasks at the moment.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTasks.map(task => {
                  const isOverdue = task.due_date && task.due_date < today
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">
                            {task.site?.short_name}
                            {task.building && ` · ${task.building.name}`}
                          </span>
                          {task.due_date && (
                            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                              <Clock className="w-3 h-3" />
                              {isOverdue ? 'Overdue · ' : ''}
                              {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
