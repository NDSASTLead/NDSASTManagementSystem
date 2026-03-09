import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, AlertTriangle, Clock, CheckCircle2, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { TaskWithRelations } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Fetch task counts
  const [openRes, overdueRes, doneThisMonthRes, recentRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'assigned', 'in_progress']),

    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'assigned', 'in_progress'])
      .lt('due_date', today),

    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete')
      .gte('completed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

    supabase
      .from('tasks')
      .select('*, site:sites(short_name), building:buildings(name), assigned_profile:profiles!tasks_assigned_to_fkey(full_name)')
      .in('status', ['open', 'assigned', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(8),
  ])

  const openCount = openRes.count ?? 0
  const overdueCount = overdueRes.count ?? 0
  const doneCount = doneThisMonthRes.count ?? 0
  const recentTasks = (recentRes.data ?? []) as TaskWithRelations[]

  const greeting = profile.display_name || profile.full_name.split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hi, {greeting}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {profile.role !== 'trustee' && (
          <Button asChild className="bg-purple-700 hover:bg-purple-800">
            <Link href="/tasks/new">
              <PlusCircle className="w-4 h-4 mr-2" />
              Report a problem
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
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

      {/* Task list */}
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
    </div>
  )
}
