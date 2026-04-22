'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import type { Priority, TaskStatus } from '@/lib/supabase/types'
import { notifyTaskAssigned, notifyPublicSubmission } from '@/lib/notifications/email'
import { scheduleNextComplianceTask } from '@/lib/actions/compliance'

// ============================================================
// Schemas
// ============================================================

// Zod v4 uses RFC 9562 strict UUID validation (version 1-8 required).
// The seed data uses version-0 UUIDs so we validate shape only (8-4-4-4-12 hex).
const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID'
)

// Coerces empty strings and null to undefined so optional UUID fields pass validation
const optionalUuid = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  uuidSchema.optional()
)

// Coerces empty strings and null to undefined for optional text fields
const optionalText = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().optional()
)

const CreateTaskSchema = z.object({
  site_id: uuidSchema,
  building_id: optionalUuid,
  title: z.string().min(3, 'Please describe the problem (at least 3 characters)'),
  description: optionalText,
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category_id: optionalUuid,
  due_date: optionalText,
})

const PublicSubmissionSchema = z.object({
  site_id: uuidSchema,
  building_id: optionalUuid,
  title: z.string().min(3, 'Please describe the problem'),
  location_detail: optionalText,
  submitter_name: optionalText,
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
})

// ============================================================
// Create Task (authenticated)
// ============================================================
export async function createTask(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const raw = {
    site_id: formData.get('site_id'),
    building_id: formData.get('building_id'),
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority') || 'medium',
    category_id: formData.get('category_id'),
    due_date: formData.get('due_date'),
  }

  const parsed = CreateTaskSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('tasks').insert({
    ...parsed.data,
    task_type: 'reactive',
    created_by: user.id,
    status: 'open',
  })

  if (error) {
    console.error('createTask error:', error)
    return { error: 'Failed to create task. Please try again.' }
  }

  revalidatePath('/tasks')
  redirect('/tasks')
}

// ============================================================
// Public Submission (anonymous)
// ============================================================
export async function createPublicSubmission(formData: FormData) {
  // Use the service client so anonymous submissions bypass RLS,
  // which can block inserts when using new-format publishable keys.
  const supabase = createServiceClient()

  const raw = {
    site_id: formData.get('site_id'),
    building_id: formData.get('building_id'),
    title: formData.get('title'),
    location_detail: formData.get('location_detail'),
    submitter_name: formData.get('submitter_name'),
    priority: 'medium' as Priority,
  }

  const parsed = PublicSubmissionSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { data: newTask, error } = await supabase.from('tasks').insert({
    ...parsed.data,
    task_type: 'reactive',
    status: 'open',
    public_submission: true,
  }).select('id').single()

  if (error) {
    console.error('createPublicSubmission error:', error)
    return { error: 'Failed to submit report. Please try again.' }
  }

  // Notify AST leads of new public submission (best-effort, don't block response)
  try {
    const { data: astLeads } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, email')
      .in('role', ['ast_lead', 'safety_officer'])
      .eq('is_active', true)
    if (astLeads?.length) {
      notifyPublicSubmission(
        { ...parsed.data, id: newTask.id, task_type: 'reactive', status: 'open', public_submission: true,
          asset_id: null, category_id: null, is_compliance: false, legislation_ref: null,
          location_detail: parsed.data.location_detail ?? null,
          submitter_name: parsed.data.submitter_name ?? null,
          due_date: null, completed_at: null, overdue_notified_at: null,
          created_by: null, assigned_to: null, completed_by: null, reviewed_by: null,
          completion_notes: null, template_id: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any,
        astLeads as any[]
      ).catch(() => {})
    }
  } catch {}

  return { success: true, taskId: newTask.id }
}

// ============================================================
// Update Task Status  (comment required)
// ============================================================
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  comment: string,
  completionNotes?: string,
) {
  if (!comment.trim()) return { error: 'A comment is required when changing status.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const completedAt = new Date().toISOString()
  const update: Record<string, unknown> = { status }

  if (status === 'complete') {
    update.completed_at = completedAt
    update.completed_by = user.id
    if (completionNotes) update.completion_notes = completionNotes
  }

  // Fetch the task — check both direct compliance_obligation_id (new path)
  // and template → compliance_obligation (legacy path)
  const { data: task } = await supabase
    .from('tasks')
    .select('id, template_id, compliance_obligation_id, maintenance_templates(id, compliance_obligation_id)')
    .eq('id', taskId)
    .single()

  const { error: taskError } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', taskId)

  if (taskError) {
    console.error('updateTaskStatus error:', taskError)
    return { error: 'Failed to update task.' }
  }

  // Post the comment as an internal note so the audit trail is visible to the team
  await supabase.from('task_comments').insert({
    task_id: taskId,
    author_id: user.id,
    body: comment.trim(),
    is_internal: true,
  })

  // Auto-create compliance record and schedule next task when a compliance task is completed.
  // Checks the direct compliance_obligation_id on the task first (tasks created by the
  // auto-scheduler), then falls back to the legacy template → obligation path.
  if (status === 'complete' && task) {
    const template = Array.isArray(task.maintenance_templates)
      ? task.maintenance_templates[0]
      : (task.maintenance_templates as any)
    const obligationId =
      (task as any).compliance_obligation_id ?? template?.compliance_obligation_id ?? null

    if (obligationId) {
      await supabase.from('compliance_records').insert({
        obligation_id: obligationId,
        completed_at: completedAt,
        completed_by: user.id,
        task_id: taskId,
        notes: completionNotes ?? null,
      })
      // Auto-schedule the next occurrence — this updates the existing open task's
      // due date or creates a fresh one for the next period.
      await scheduleNextComplianceTask(obligationId)
      revalidatePath('/compliance')
      revalidatePath(`/compliance/${obligationId}`)
    }
  }

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// Assign Task  (ast_lead + safety_officer, comment required)
// ============================================================
export async function assignTask(
  taskId: string,
  assigneeId: string | null,
  comment: string,
) {
  if (!comment.trim()) return { error: 'A comment is required when assigning a task.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: taskError } = await supabase
    .from('tasks')
    .update({
      assigned_to: assigneeId,
      status: assigneeId ? 'assigned' : 'open',
    })
    .eq('id', taskId)

  if (taskError) {
    console.error('assignTask error:', taskError)
    return { error: 'Failed to assign task.' }
  }

  await supabase.from('task_comments').insert({
    task_id: taskId,
    author_id: user.id,
    body: comment.trim(),
    is_internal: true,
  })

  // Notify assignee by email (best-effort)
  if (assigneeId) {
    try {
      const supabaseNotify = await createClient()
      const [{ data: task }, { data: assigner }, { data: assignee }] = await Promise.all([
        supabaseNotify.from('tasks').select('*').eq('id', taskId).single(),
        supabaseNotify.from('profiles').select('id, full_name, display_name, email').eq('id', user.id).single(),
        supabaseNotify.from('profiles').select('id, full_name, display_name, email').eq('id', assigneeId).single(),
      ])
      if (task && assigner && assignee) {
        notifyTaskAssigned(task as any, assignee as any, assigner as any, comment).catch(() => {})
      }
    } catch {}
  }

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// Update Task
// ============================================================

const UpdateTaskSchema = z.object({
  title: z.string().min(3, 'Please describe the problem (at least 3 characters)'),
  description: optionalText,
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  building_id: optionalUuid,
  category_id: optionalUuid,
  due_date: optionalText,
  is_compliance: z.boolean().optional(),
  task_type: z.enum(['scheduled', 'reactive']).optional(),
})

type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch current profile for role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Not authenticated' }

  // Fetch the task to check assignment for non-ast_lead
  const { data: task } = await supabase
    .from('tasks')
    .select('id, assigned_to')
    .eq('id', taskId)
    .single()
  if (!task) return { error: 'Task not found' }

  const isAdminRole = ['ast_lead', 'safety_officer'].includes(profile.role)
  const isAssigned = task.assigned_to === user.id
  const canEdit = isAdminRole || (profile.role !== 'trustee' && isAssigned)

  if (!canEdit) return { error: 'Not authorised to edit this task' }

  const parsed = UpdateTaskSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Non-admin roles can only update title + description
  const update: Partial<UpdateTaskInput> = isAdminRole
    ? parsed.data
    : { title: parsed.data.title, description: parsed.data.description }

  const { error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', taskId)

  if (error) {
    console.error('updateTask error:', error)
    return { error: 'Failed to update task. Please try again.' }
  }

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// Add Comment
// ============================================================
export async function addComment(taskId: string, body: string, isInternal = false) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('task_comments').insert({
    task_id: taskId,
    author_id: user.id,
    body,
    is_internal: isInternal,
  })

  if (error) {
    console.error('addComment error:', error)
    return { error: 'Failed to add comment.' }
  }

  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}
