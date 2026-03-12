'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { getFrequencyDays } from '@/lib/compliance-utils'
import type { MaintenanceTemplate } from '@/lib/supabase/types'

// ============================================================
// getTemplates
// ============================================================
export async function getTemplates(siteId?: string | null) {
  const supabase = await createClient()

  let query = supabase
    .from('maintenance_templates')
    .select(`
      *,
      site:sites(id, name, short_name),
      building:buildings(id, name),
      category:asset_categories(id, name, icon, colour)
    `)
    .order('title')

  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

// ============================================================
// addTemplate
// ============================================================
export async function addTemplate(data: {
  site_id: string
  title: string
  description?: string | null
  building_id?: string | null
  asset_id?: string | null
  category_id?: string | null
  priority?: string
  is_compliance?: boolean
  legislation_ref?: string | null
  frequency: string
  frequency_days?: number | null
  notice_days: number
  assign_to_role?: string | null
  compliance_obligation_id?: string | null
}) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()

  // Calculate next_generate_at: now + frequency_days - notice_days
  const freqDays = data.frequency === 'custom'
    ? (data.frequency_days ?? 365)
    : getFrequencyDays({ frequency: data.frequency as any, frequency_days: data.frequency_days ?? null } as any)

  const nextGenerateAt = new Date(
    Date.now() + (freqDays - data.notice_days) * 24 * 60 * 60 * 1000
  ).toISOString()

  const { data: template, error } = await supabase
    .from('maintenance_templates')
    .insert({
      ...data,
      next_generate_at: nextGenerateAt,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true, id: template.id }
}

// ============================================================
// updateTemplate
// ============================================================
export async function updateTemplate(
  id: string,
  data: Partial<Omit<MaintenanceTemplate, 'id' | 'created_at' | 'updated_at'>>,
) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('maintenance_templates')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

// ============================================================
// toggleTemplateActive
// ============================================================
export async function toggleTemplateActive(id: string, active: boolean) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('maintenance_templates')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

// ============================================================
// generateTasksFromTemplates — called by cron endpoint
// Finds templates where next_generate_at <= now,
// creates a task, advances next_generate_at
// ============================================================
export async function generateTasksFromTemplates(): Promise<{ generated: number }> {
  const supabase = await createClient()

  const now = new Date().toISOString()

  // Fetch overdue templates
  const { data: templates, error } = await supabase
    .from('maintenance_templates')
    .select('*')
    .eq('is_active', true)
    .lte('next_generate_at', now)

  if (error) throw new Error(error.message)
  if (!templates || templates.length === 0) return { generated: 0 }

  let generated = 0

  for (const template of templates) {
    const freqDays = template.frequency === 'custom'
      ? (template.frequency_days ?? 365)
      : getFrequencyDays(template as any)

    const dueDate = new Date(
      Date.now() + template.notice_days * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0]

    // Create the task
    const { error: taskError } = await supabase
      .from('tasks')
      .insert({
        site_id:        template.site_id,
        building_id:    template.building_id,
        asset_id:       template.asset_id,
        category_id:    template.category_id,
        title:          template.title,
        description:    template.description,
        task_type:      'scheduled',
        priority:       template.priority,
        is_compliance:  template.is_compliance,
        legislation_ref: template.legislation_ref,
        status:         'open',
        due_date:       dueDate,
        template_id:    template.id,
        public_submission: false,
      })

    if (taskError) {
      console.error('Failed to generate task from template', template.id, taskError.message)
      continue
    }

    // Advance next_generate_at by frequency_days
    const nextGenerate = new Date(
      Date.now() + freqDays * 24 * 60 * 60 * 1000
    ).toISOString()

    await supabase
      .from('maintenance_templates')
      .update({
        last_generated_at: now,
        next_generate_at:  nextGenerate,
        updated_at:        now,
      })
      .eq('id', template.id)

    generated++
  }

  return { generated }
}
