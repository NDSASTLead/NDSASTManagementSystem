'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/supabase/types'
import { z } from 'zod'

const ALLOWED_INVITE_ROLES: Role[] = ['volunteer', 'responsible_person', 'safety_officer', 'ast_member', 'ast_lead', 'trustee']

// -- Invite a new user --
export async function inviteUser(formData: FormData) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ast_lead') {
    return { error: 'Not authorised.' }
  }

  const email = z.string().email().safeParse(formData.get('email'))
  if (!email.success) return { error: 'Please enter a valid email address.' }

  const roleRaw = formData.get('role') as string
  const role: Role = ALLOWED_INVITE_ROLES.includes(roleRaw as Role) ? (roleRaw as Role) : 'volunteer'

  const service = createServiceClient()

  // inviteUserByEmail creates the auth.users record and sends the invite email.
  // raw_user_meta_data is picked up by the handle_new_user trigger to set the role.
  try {
    const { error } = await service.auth.admin.inviteUserByEmail(email.data, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: { role },
    })

    if (error) {
      // Supabase returns 422 if the user already exists
      if (error.message?.toLowerCase().includes('already been registered')) {
        return { error: 'That email address is already registered.' }
      }
      return { error: error.message ?? 'Failed to send invite.' }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { error: `Invite failed: ${msg}` }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

// -- Update a user's role --
export async function updateUserRole(userId: string, role: Role) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ast_lead') {
    return { error: 'Not authorised.' }
  }
  if (!ALLOWED_INVITE_ROLES.includes(role)) {
    return { error: 'Invalid role.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

// -- Activate / deactivate a user --
export async function setUserActive(userId: string, isActive: boolean) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'ast_lead') {
    return { error: 'Not authorised.' }
  }
  // Prevent self-deactivation
  if (userId === profile.id) {
    return { error: 'You cannot deactivate your own account.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}
