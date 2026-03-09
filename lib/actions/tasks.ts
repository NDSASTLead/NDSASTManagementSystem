'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import type { Priority, TaskStatus } from '@/lib/supabase/types'

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

  const update: Record<string, unknown> = { status }

  if (status === 'complete') {
    update.completed_at = new Date().toISOString()
    update.completed_by = user.id
    if (completionNotes) update.completion_notes = completionNotes
  }

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

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// Assign Task  (ast_lead only, comment required)
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

  const isAstLead = profile.role === 'ast_lead'
  const isAssigned = task.assigned_to === user.id
  const canEdit = isAstLead || (profile.role !== 'trustee' && isAssigned)

  if (!canEdit) return { error: 'Not authorised to edit this task' }

  const parsed = UpdateTaskSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Non-ast_lead can only update title + description
  const update: Partial<UpdateTaskInput> = isAstLead
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
