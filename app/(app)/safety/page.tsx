import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, BookOpen, Clock } from 'lucide-react'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar } from '@/components/shared/Avatar'
import type { TaskWithRelations } from '@/lib/supabase/types'
import { getDisplayName } from '@/lib/utils'

const ALLOWED_ROLES = ['safety_officer', 'ast_member', 'ast_lead', 'trustee']

function StatCard({ value, label, colour }: { value: number; label: string; colour: string }) {
  return (
    <div className={`rounded-xl border p-4 ${colour}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-0.5">{label}</p>
    </div>
  )
}

function TaskRow({ task, today }: { task: TaskWithRelations; today: string }) {
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'complete'
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="font-medium text-gray-900 truncate flex-1">{task.title}</p>
          {task.legislation_ref && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 flex-shrink-0 max-w-[180px] truncate">
              {task.legislation_ref}
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
              {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
}

function SectionHeader({ icon: Icon, title, count, colour }: {
  icon: React.ElementType
  title: string
  count: number
  colour: string
}) {
  return (
    <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-100 ${colour}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-semibold">{title}</span>
      <span className="ml-auto text-xs font-medium bg-white/70 rounded-full px-2 py-0.5 border">
        {count}
      </span>
    </div>
  )
}

export default async function SafetyPage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!ALLOWED_ROLES.includes(profile.role)) redirect('/dashboard')

  const today = new Date().toISOString().split('T')[0]

  const taskSelect = '*, site:sites(short_name), building:buildings(name), assigned_profile:profiles!tasks_assigned_to_fkey(full_name, display_name, profile_picture_path)'

  // Priority issues: critical + high, not complete or cancelled
  const [{ data: priorityRaw }, { data: legislationRaw }] = await Promise.all([
    supabase
      .from('tasks')
      .select(taskSelect)
      .in('priority', ['critical', 'high'])
      .not('status', 'in', '("complete","cancelled")')
      .order('priority', { ascending: true }) // critical < high alphabetically
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200),

    // Legislation-tagged: any task with a legislation_ref, not complete or cancelled
    supabase
      .from('tasks')
      .select(taskSelect)
      .not('legislation_ref', 'is', null)
      .not('status', 'in', '("complete","cancelled")')
      .order('legislation_ref', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(200),
  ])

  const priorityTasks = (priorityRaw ?? []) as TaskWithRelations[]
  const legislationTasks = (legislationRaw ?? []) as TaskWithRelations[]

  const criticalTasks = priorityTasks.filter(t => t.priority === 'critical')
  const highTasks = priorityTasks.filter(t => t.priority === 'high')
  const overduePriority = priorityTasks.filter(t => t.due_date && t.due_date < today)

  // Group legislation tasks by their ref value
  const grouped = legislationTasks.reduce<Record<string, TaskWithRelations[]>>((acc, task) => {
    const key = task.legislation_ref!
    if (!acc[key]) acc[key] = []
    acc[key].push(task)
    return acc
  }, {})
  const groupedEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Safety Overview</h1>
        <p className="text-sm text-gray-500 mt-1">High priority issues and legislation-referenced tasks across all sites.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={criticalTasks.length}    label="Critical"             colour="bg-red-50 border-red-200 text-red-800" />
        <StatCard value={highTasks.length}        label="High priority"        colour="bg-orange-50 border-orange-200 text-orange-800" />
        <StatCard value={overduePriority.length}  label="Overdue"              colour="bg-yellow-50 border-yellow-200 text-yellow-800" />
        <StatCard value={legislationTasks.length} label="Legislation tagged"   colour="bg-blue-50 border-blue-200 text-blue-800" />
      </div>

      {/* Section 1: Priority Issues */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Priority Issues</h2>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {priorityTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium text-gray-500">No critical or high priority open tasks</p>
            </div>
          ) : (
            <>
              {criticalTasks.length > 0 && (
                <>
                  <SectionHeader
                    icon={AlertTriangle}
                    title="Critical"
                    count={criticalTasks.length}
                    colour="bg-red-50 text-red-700"
                  />
                  {criticalTasks.map(task => (
                    <TaskRow key={task.id} task={task} today={today} />
                  ))}
                </>
              )}
              {highTasks.length > 0 && (
                <>
                  <SectionHeader
                    icon={AlertTriangle}
                    title="High Priority"
                    count={highTasks.length}
                    colour="bg-orange-50 text-orange-700"
                  />
                  {highTasks.map(task => (
                    <TaskRow key={task.id} task={task} today={today} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Section 2: Legislation Referenced */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Legislation Referenced</h2>
          <span className="text-sm text-gray-400">Tasks tagged with a legislation or audit reference</span>
        </div>

        {groupedEntries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-12 text-gray-400">
            <p className="font-medium text-gray-500">No legislation-referenced open tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedEntries.map(([ref, tasks]) => (
              <div key={ref} className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                <SectionHeader
                  icon={BookOpen}
                  title={ref}
                  count={tasks.length}
                  colour="bg-blue-50 text-blue-700"
                />
                {tasks.map(task => (
                  <TaskRow key={task.id} task={task} today={today} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
