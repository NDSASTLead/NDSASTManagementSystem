'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { compressImage } from '@/lib/utils'

// ---------------------------------------------------------------------------
// updateProfile — update own display name
// ---------------------------------------------------------------------------
export async function updateProfile(data: { displayName: string }) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }

  const displayName = data.displayName.trim() || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq('id', profile.id)

  if (error) return { error: error.message }

  revalidatePath('/account')
  revalidatePath('/admin/users')
  revalidatePath('/tasks', 'layout')
  return { success: true }
}

// ---------------------------------------------------------------------------
// uploadProfilePicture — compress, upload, and link to profile
// ---------------------------------------------------------------------------
export async function uploadProfilePicture(formData: FormData) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPEG, PNG and WebP images are allowed' }
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'Image must be under 2 MB' }
  }

  // Compress client-side compression already happened; re-validate size after any server pass
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Delete existing picture if one is set
  if (profile.profile_picture_path) {
    await serviceClient.storage
      .from('profile-pictures')
      .remove([profile.profile_picture_path])
  }

  // Generate unique path: {userId}/{uuid}.jpg
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const uuid = crypto.randomUUID()
  const storagePath = `${profile.id}/${uuid}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await serviceClient.storage
    .from('profile-pictures')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) return { error: uploadError.message }

  // Update profile with new path
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ profile_picture_path: storagePath, updated_at: new Date().toISOString() })
    .eq('id', profile.id)

  if (dbError) {
    // Roll back storage upload
    await serviceClient.storage.from('profile-pictures').remove([storagePath])
    return { error: dbError.message }
  }

  revalidatePath('/account')
  revalidatePath('/admin/users')
  revalidatePath('/tasks', 'layout')
  return { success: true, path: storagePath }
}

// ---------------------------------------------------------------------------
// removeProfilePicture — delete from storage and clear from profile
// ---------------------------------------------------------------------------
export async function removeProfilePicture() {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!profile.profile_picture_path) return { success: true }

  const serviceClient = createServiceClient()

  await serviceClient.storage
    .from('profile-pictures')
    .remove([profile.profile_picture_path])

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ profile_picture_path: null, updated_at: new Date().toISOString() })
    .eq('id', profile.id)

  if (error) return { error: error.message }

  revalidatePath('/account')
  revalidatePath('/admin/users')
  revalidatePath('/tasks', 'layout')
  return { success: true }
}
