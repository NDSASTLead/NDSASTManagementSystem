import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { TaskWithRelations } from '@/lib/supabase/types'
import { getDisplayName } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'
import { TaskLocationFilter } from '@/components/tasks/TaskLocationFilter'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; site?: string; building?: string }>
}) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status
  const siteFilter = params.site
  const buildingFilter = params.building

  const [{ data: sites }, { data: buildings }] = await Promise.all([
    supabase.from('sites').select('id, short_name').eq('is_active', true).order('short_name'),
    siteFilter
      ? supabase.from('buildings').select('id, name').eq('site_id', siteFilter).eq('is_active', true).order('name')
      : Promise.resolve({ data: [] }),
  ])

  let query = supabase
    .from('tasks')
    .select('*, site:sites(short_name), building:buildings(name), assigned_profile:profiles!tasks_assigned_to_fkey(full_name, display_name, profile_picture_path)')
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (siteFilter) query = query.eq('site_id', siteFilter)
  if (buildingFilter) query = query.eq('building_id', buildingFilter)

  const { data: tasks } = await query
  const typedTasks = (tasks ?? []) as TaskWithRelations[]

  const today = new Date().toISOString().split('T')[0]

  const statusTabs = [
    { label: 'All active', value: undefined },
    { label: 'Open', value: 'open' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Needs review', value: 'pending_review' },
    { label: 'Complete', value: 'complete' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        {profile.role !== 'trustee' && (
          <Button asChild className="bg-purple-700 hover:bg-purple-800">
            <Link href="/tasks/new">
              <PlusCircle className="w-4 h-4 mr-2" />
              Report a problem
            </Link>
          </Button>
        )}
      </div>

      {/* Location filter */}
      <TaskLocationFilter
        sites={sites ?? []}
        buildings={buildings ?? []}
        selectedSiteId={siteFilter}
        selectedBuildingId={buildingFilter}
        statusFilter={statusFilter}
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map(tab => {
          const params = new URLSearchParams()
          if (tab.value) params.set('status', tab.value)
          if (siteFilter) params.set('site', siteFilter)
          if (buildingFilter) params.set('building', buildingFilter)
          const qs = params.toString()
          const href = qs ? `/tasks?${qs}` : '/tasks'
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-purple-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {typedTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium text-gray-500">No tasks found</p>
            <p className="text-sm mt-1">Try a different filter, or report a new problem.</p>
          </div>
        ) : (
          typedTasks.map(task => {
            const isOverdue = task.due_date && task.due_date < today && task.status !== 'complete'
            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="font-medium text-gray-900 truncate flex-1">{task.title}</p>
                    {task.public_submission && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded px-1.5 py-0.5 flex-shrink-0">
                        Public
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{task.site?.short_name}{task.building && ` · ${task.building.name}`}</span>
                    {task.assigned_profile && (
                      <span className="flex items-center gap-1.5 text-gray-400">
                          <Avatar
                            size="xs"
                            name={getDisplayName(task.assigned_profile)}
                            picturePath={task.assigned_profile.profile_picture_path}
                          />
                          {getDisplayName(task.assigned_profile)}
                        </span>
                    )}
                    {task.due_date && (
                      <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {isOverdue ? 'Overdue · ' : ''}
                        {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
