'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { z } from 'zod'

function isAdmin(role: string) {
  return role === 'ast_lead' || role === 'trustee'
}

// ── Add a building ──────────────────────────────────────────────────────────
export async function addBuilding(formData: FormData) {
  const profile = await getCurrentProfile()
  if (!profile || !isAdmin(profile.role)) return { error: 'Not authorised.' }

  const name = z.string().min(1).max(100).safeParse(formData.get('name'))
  if (!name.success) return { error: 'Please enter a valid name.' }

  const siteId = formData.get('site_id') as string
  if (!siteId) return { error: 'Site is required.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('buildings')
    .insert({ site_id: siteId, name: name.data })

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

// ── Rename a building ───────────────────────────────────────────────────────
export async function renameBuilding(id: string, name: string) {
  const profile = await getCurrentProfile()
  if (!profile || !isAdmin(profile.role)) return { error: 'Not authorised.' }

  const parsed = z.string().min(1).max(100).safeParse(name)
  if (!parsed.success) return { error: 'Please enter a valid name.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('buildings')
    .update({ name: parsed.data })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

// ── Toggle active / inactive ────────────────────────────────────────────────
export async function toggleBuildingActive(id: string, isActive: boolean) {
  const profile = await getCurrentProfile()
  if (!profile || !isAdmin(profile.role)) return { error: 'Not authorised.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('buildings')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
