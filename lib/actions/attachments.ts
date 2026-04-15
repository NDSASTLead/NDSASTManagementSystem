'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const BUCKET = 'task-photos'
const MAX_FILE_SIZE = 5 * 1024 * 1024   // 5 MB
const MAX_PHOTOS_PER_TASK = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

// ============================================================
// Upload photo — authenticated users
// ============================================================
export async function uploadTaskPhoto(taskId: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Only JPEG, PNG, WebP and HEIC images are allowed' }
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File is too large. Maximum size is 5 MB.' }
  }

  // Enforce max photos per task
  const { count } = await supabase
    .from('task_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId)

  if ((count ?? 0) >= MAX_PHOTOS_PER_TASK) {
    return { error: `Maximum ${MAX_PHOTOS_PER_TASK} photos per task` }
  }

  // Upload to storage: task-photos/{taskId}/{uuid}.jpg
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${taskId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('uploadTaskPhoto storage error:', uploadError)
    return { error: 'Upload failed. Please try again.' }
  }

  // Record in task_attachments
  const { error: dbError } = await supabase.from('task_attachments').insert({
    task_id: taskId,
    storage_path: storagePath,
    original_filename: file.name,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: user.id,
  })

  if (dbError) {
    // Clean up orphaned storage object
    await supabase.storage.from(BUCKET).remove([storagePath])
    console.error('uploadTaskPhoto db error:', dbError)
    return { error: 'Failed to save photo record.' }
  }

  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}

// ============================================================
// Upload photo — anonymous (public form)
// Uses service role client to bypass storage RLS
// ============================================================
export async function uploadPublicPhoto(taskId: string, formData: FormData) {
  const supabase = createServiceClient()

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Only JPEG, PNG, WebP and HEIC images are allowed' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File is too large. Maximum size is 5 MB.' }
  }

  const { count } = await supabase
    .from('task_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId)

  if ((count ?? 0) >= MAX_PHOTOS_PER_TASK) {
    return { error: `Maximum ${MAX_PHOTOS_PER_TASK} photos per task` }
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${taskId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('uploadPublicPhoto storage error:', uploadError)
    return { error: 'Upload failed. Please try again.' }
  }

  const { error: dbError } = await supabase.from('task_attachments').insert({
    task_id: taskId,
    storage_path: storagePath,
    original_filename: file.name,
    file_size: file.size,
    mime_type: file.type,
    uploaded_by: null,   // anonymous
  })

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath])
    console.error('uploadPublicPhoto db error:', dbError)
    return { error: 'Failed to save photo record.' }
  }

  return { success: true }
}

// ============================================================
// Delete photo — ast_lead, safety_officer, ast_member
// ============================================================
export async function deleteTaskPhoto(attachmentId: string, storagePath: string, taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const canDelete = ['ast_lead', 'safety_officer', 'ast_member'].includes(profile?.role ?? '')
  if (!canDelete) {
    return { error: 'Only Safety Officers and AST staff can delete photos' }
  }

  // Delete from storage first
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath])

  if (storageError) {
    console.error('deleteTaskPhoto storage error:', storageError)
    // Continue to delete DB record even if storage delete fails
  }

  const { error: dbError } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId)

  if (dbError) {
    console.error('deleteTaskPhoto db error:', dbError)
    return { error: 'Failed to delete photo.' }
  }

  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}

// ============================================================
// Get signed URLs for a list of attachments (server-side)
// ============================================================
export async function getSignedUrls(storagePaths: string[]): Promise<Record<string, string>> {
  if (storagePaths.length === 0) return {}

  const supabase = await createClient()
  const result: Record<string, string> = {}

  // Supabase createSignedUrls accepts up to 10 at a time
  const chunks: string[][] = []
  for (let i = 0; i < storagePaths.length; i += 10) {
    chunks.push(storagePaths.slice(i, i + 10))
  }

  for (const chunk of chunks) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(chunk, 3600) // 60 min expiry

    data?.forEach(item => {
      if (item.signedUrl && item.path) result[item.path] = item.signedUrl
    })
  }

  return result
}
