import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { getSignedUrls } from '@/lib/actions/attachments'
import { redirect, notFound } from 'next/navigation'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PhotoGallery } from '@/components/shared/PhotoGallery'
import { PhotoUpload } from '@/components/shared/PhotoUpload'
import { TaskActions } from '@/components/tasks/TaskActions'
import { TaskComments } from '@/components/tasks/TaskComments'
import { TaskEditButton } from '@/components/tasks/TaskEditButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Calendar, User, Tag } from 'lucide-react'
import type { TaskWithRelations, TaskCommentWithAuthor, TaskAttachment } from '@/lib/supabase/types'
import { getDisplayName } from '@/lib/utils'

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const { data: task } = await supabase
    .from('tasks')
    .select(`
      *,
      site:sites(id, name, short_name),
      building:buildings(id, name),
      category:asset_categories(id, name),
      assigned_profile:profiles!tasks_assigned_to_fkey(id, full_name, display_name, profile_picture_path, email),
      created_profile:profiles!tasks_created_by_fkey(id, full_name, display_name)
    `)
    .eq('id', id)
    .single()

  if (!task) notFound()

  const { data: comments } = await supabase
    .from('task_comments')
    .select('*, author:profiles(id, full_name, display_name, profile_picture_path)')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  // Fetch attachments and generate signed URLs server-side (60 min expiry)
  const { data: rawAttachments } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  const attachments: TaskAttachment[] = rawAttachments ?? []
  const signedUrls = await getSignedUrls(attachments.map(a => a.storage_path))
  const attachmentsWithUrls = attachments.map(a => ({
    ...a,
    signed_url: signedUrls[a.storage_path],
  }))

  const typedTask = task as TaskWithRelations
  const typedComments = (comments ?? []) as TaskCommentWithAuthor[]

  // Get all profiles for assignment (ast_lead only)
  let assignableProfiles: { id: string; full_name: string; display_name: string | null }[] = []
  if (profile.role === 'ast_lead') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, display_name')
      .eq('is_active', true)
      .in('role', ['volunteer', 'owner', 'ast_lead'])
      .order('full_name')
    assignableProfiles = data ?? []
  }

  // Fetch buildings (for the task's site) and all categories for the edit form
  const [{ data: buildings }, { data: categories }] = await Promise.all([
    supabase
      .from('buildings')
      .select('id, site_id, name')
      .eq('site_id', typedTask.site_id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('asset_categories')
      .select('id, name')
      .order('name'),
  ])

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = typedTask.due_date && typedTask.due_date < today && typedTask.status !== 'complete'
  const canUpload = profile.role !== 'trustee'
  const canDelete = profile.role === 'ast_lead'
  const canEdit = profile.role === 'ast_lead' ||
    (profile.role !== 'trustee' && typedTask.assigned_to === profile.id)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back link */}
      <a href="/tasks" className="text-sm text-purple-700 hover:underline">← Back to tasks</a>

      {/* Header */}
      <div>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{typedTask.title}</h1>
          {typedTask.public_submission && (
            <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded px-2 py-1">
              Public submission
            </span>
          )}
          {canEdit && (
            <TaskEditButton
              task={typedTask}
              currentProfile={profile}
              buildings={buildings ?? []}
              categories={categories ?? []}
            />
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge status={typedTask.status} />
          <PriorityBadge priority={typedTask.priority} />
          {typedTask.is_compliance && (
            <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded px-2 py-1">
              Compliance
            </span>
          )}
        </div>
      </div>

      {/* Photos — prominent, above description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Photos {attachmentsWithUrls.length > 0 && (
              <span className="ml-1 text-xs font-normal text-gray-500">
                ({attachmentsWithUrls.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoGallery
            attachments={attachmentsWithUrls}
            canDelete={canDelete}
            taskId={id}
          />
          {canUpload && (
            <div className={attachmentsWithUrls.length > 0 ? 'pt-3 border-t border-gray-100' : ''}>
              <PhotoUpload
                taskId={id}
                isPublic={false}
                existingCount={attachments.length}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>
              {typedTask.site?.name}
              {typedTask.building && ` · ${typedTask.building.name}`}
            </span>
          </div>

          {typedTask.location_detail && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{typedTask.location_detail}</span>
            </div>
          )}

          {typedTask.due_date && (
            <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>
                Due: {new Date(typedTask.due_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {isOverdue && ' (overdue)'}
              </span>
            </div>
          )}

          {typedTask.assigned_profile && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>Assigned to: {getDisplayName(typedTask.assigned_profile)}</span>
            </div>
          )}

          {typedTask.category && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{typedTask.category.name}</span>
            </div>
          )}

          {typedTask.description && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{typedTask.description}</p>
            </div>
          )}

          {typedTask.submitter_name && (
            <div className="text-sm text-gray-500">
              Reported by: {typedTask.submitter_name}
            </div>
          )}

          {typedTask.completion_notes && (
            <div className="pt-2 border-t border-gray-100 bg-green-50 rounded-lg px-3 py-2">
              <p className="text-xs text-green-700 font-medium mb-1">Completion notes</p>
              <p className="text-sm text-gray-700">{typedTask.completion_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <TaskActions
        task={typedTask}
        currentProfile={profile}
        assignableProfiles={assignableProfiles}
      />

      {/* Comments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskComments
            taskId={typedTask.id}
            comments={typedComments}
            currentProfile={profile}
          />
        </CardContent>
      </Card>
    </div>
  )
}
