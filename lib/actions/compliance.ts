'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { calculateRAG, getNextDue } from '@/lib/compliance-utils'
import type {
  ComplianceObligation,
  ComplianceObligationWithStatus,
  ComplianceRecord,
} from '@/lib/supabase/types'

// ============================================================
// getComplianceObligations
// Fetches obligations with RAG status computed from latest record
// siteId = null means all sites (safety_officer + ast_lead)
// ============================================================
export async function getComplianceObligations(
  siteId?: string | null,
): Promise<ComplianceObligationWithStatus[]> {
  const supabase = await createClient()

  let query = supabase
    .from('compliance_obligations')
    .select(`
      *,
      site:sites(*),
      buildings:compliance_buildings(building:buildings(*)),
      owner_profile:profiles!compliance_obligations_owner_profile_id_fkey(id, full_name, display_name),
      compliance_records(*)
    `)
    .eq('is_active', true)
    .order('name')

  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row: any) => {
    const records: ComplianceRecord[] = (row.compliance_records ?? [])
      .sort((a: ComplianceRecord, b: ComplianceRecord) =>
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      )
    const latestRecord = records[0] ?? null
    const rag = calculateRAG(row as ComplianceObligation, latestRecord)
    const nextDue = getNextDue(row as ComplianceObligation, latestRecord)
    const buildings = (row.buildings ?? []).map((b: any) => b.building).filter(Boolean)

    return {
      ...row,
      buildings,
      owner_profile: row.owner_profile ?? null,
      latest_record: latestRecord,
      rag,
      next_due_at: nextDue?.toISOString() ?? null,
    } as ComplianceObligationWithStatus
  })
}

// ============================================================
// getComplianceObligation (single)
// ============================================================
export async function getComplianceObligation(id: string): Promise<ComplianceObligationWithStatus | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('compliance_obligations')
    .select(`
      *,
      site:sites(*),
      buildings:compliance_buildings(building:buildings(*)),
      owner_profile:profiles!compliance_obligations_owner_profile_id_fkey(id, full_name, display_name),
      compliance_records(*, completed_profile:profiles(id, full_name, display_name, profile_picture_path))
    `)
    .eq('id', id)
    .single()

  if (error) return null

  const records: ComplianceRecord[] = (data.compliance_records ?? [])
    .sort((a: ComplianceRecord, b: ComplianceRecord) =>
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    )
  const latestRecord = records[0] ?? null
  const rag = calculateRAG(data as ComplianceObligation, latestRecord)
  const nextDue = getNextDue(data as ComplianceObligation, latestRecord)
  const buildings = (data.buildings ?? []).map((b: any) => b.building).filter(Boolean)

  return {
    ...data,
    buildings,
    latest_record: latestRecord,
    compliance_records: records,
    rag,
    next_due_at: nextDue?.toISOString() ?? null,
  } as ComplianceObligationWithStatus & { compliance_records: any[] }
}

// ============================================================
// addComplianceObligation
// ============================================================
export async function addComplianceObligation(data: {
  site_id: string
  name: string
  category: string
  description?: string | null
  legislation_ref?: string | null
  frequency: string
  frequency_days?: number | null
  notice_days: number
  red_days: number
  owner_role?: string | null
  owner_profile_id?: string | null
  notes?: string | null
  building_ids?: string[]
}) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()

  const { building_ids, ...obligationData } = data

  const { data: obligation, error } = await supabase
    .from('compliance_obligations')
    .insert({ ...obligationData, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return { error: error.message }

  // Link buildings
  if (building_ids && building_ids.length > 0) {
    const links = building_ids.map((bid) => ({
      obligation_id: obligation.id,
      building_id: bid,
    }))
    const { error: linkError } = await supabase
      .from('compliance_buildings')
      .insert(links)
    if (linkError) return { error: linkError.message }
  }

  revalidatePath('/compliance')
  return { success: true, id: obligation.id }
}

// ============================================================
// updateComplianceObligation
// ============================================================
export async function updateComplianceObligation(
  id: string,
  data: Partial<{
    name: string
    category: string
    description: string | null
    legislation_ref: string | null
    frequency: string
    frequency_days: number | null
    notice_days: number
    red_days: number
    owner_role: string | null
    owner_profile_id: string | null
    notes: string | null
    building_ids: string[]
  }>
) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()
  const { building_ids, ...obligationData } = data

  const { error } = await supabase
    .from('compliance_obligations')
    .update({ ...obligationData, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  // Replace building links if provided
  if (building_ids !== undefined) {
    await supabase.from('compliance_buildings').delete().eq('obligation_id', id)
    if (building_ids.length > 0) {
      await supabase.from('compliance_buildings').insert(
        building_ids.map((bid) => ({ obligation_id: id, building_id: bid }))
      )
    }
  }

  revalidatePath('/compliance')
  revalidatePath(`/compliance/${id}`)
  return { success: true }
}

// ============================================================
// toggleObligationActive
// ============================================================
export async function toggleObligationActive(id: string, active: boolean) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('compliance_obligations')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/compliance')
  return { success: true }
}

// ============================================================
// addComplianceRecord
// ============================================================
export async function addComplianceRecord(
  data: {
    obligation_id: string
    completed_at: string
    contractor_name?: string | null
    notes?: string | null
    certificate_ref?: string | null
    expiry_date?: string | null
    task_id?: string | null
  },
  evidenceFormData?: FormData,
) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }

  const canRecord = ['ast_lead', 'safety_officer', 'responsible_person'].includes(profile.role)
  if (!canRecord) return { error: 'Not authorised' }

  const supabase = await createClient()
  const serviceClient = createServiceClient()

  let evidencePath: string | null = null

  // Handle optional evidence upload
  if (evidenceFormData) {
    const file = evidenceFormData.get('file') as File | null
    if (file && file.size > 0) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        return { error: 'Only JPEG, PNG, WebP and PDF files are allowed' }
      }
      if (file.size > 10 * 1024 * 1024) {
        return { error: 'Evidence file must be under 10 MB' }
      }

      const ext = file.type === 'application/pdf' ? 'pdf'
        : file.type === 'image/png' ? 'png'
        : file.type === 'image/webp' ? 'webp'
        : 'jpg'
      const uuid = crypto.randomUUID()
      const storagePath = `${data.obligation_id}/${uuid}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      const { error: uploadError } = await serviceClient.storage
        .from('compliance-evidence')
        .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

      if (uploadError) return { error: uploadError.message }
      evidencePath = storagePath
    }
  }

  const { data: record, error } = await supabase
    .from('compliance_records')
    .insert({
      ...data,
      completed_by: profile.id,
      evidence_path: evidencePath,
    })
    .select()
    .single()

  if (error) {
    // Roll back evidence upload if record insert failed
    if (evidencePath) {
      await serviceClient.storage.from('compliance-evidence').remove([evidencePath])
    }
    return { error: error.message }
  }

  revalidatePath('/compliance')
  revalidatePath(`/compliance/${data.obligation_id}`)
  revalidatePath('/dashboard')
  return { success: true, record }
}

// ============================================================
// deleteComplianceRecord
// ============================================================
export async function deleteComplianceRecord(id: string) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Fetch record to get evidence_path for cleanup
  const { data: record } = await supabase
    .from('compliance_records')
    .select('evidence_path, obligation_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('compliance_records')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  if (record?.evidence_path) {
    await serviceClient.storage
      .from('compliance-evidence')
      .remove([record.evidence_path])
  }

  revalidatePath('/compliance')
  if (record?.obligation_id) {
    revalidatePath(`/compliance/${record.obligation_id}`)
  }
  revalidatePath('/dashboard')
  return { success: true }
}

// ============================================================
// getComplianceEvidenceUrl — generates signed URL for download
// ============================================================
export async function getComplianceEvidenceUrl(path: string): Promise<string | null> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.storage
    .from('compliance-evidence')
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

// ============================================================
// getProfileResponsibilities — fetch scope for a responsible_person
// ============================================================
export async function getProfileResponsibilities(profileId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profile_responsibilities')
    .select('*')
    .eq('profile_id', profileId)
  return data ?? []
}

// ============================================================
// setProfileResponsibilities — replace all for a profile (ast_lead only)
// ============================================================
export async function setProfileResponsibilities(
  profileId: string,
  responsibilities: Array<{ site_id: string; category: string | null }>,
) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (profile.role !== 'ast_lead') return { error: 'Not authorised' }

  const supabase = await createClient()

  await supabase.from('profile_responsibilities').delete().eq('profile_id', profileId)

  if (responsibilities.length > 0) {
    const rows = responsibilities.map((r) => ({
      profile_id: profileId,
      site_id: r.site_id,
      category: r.category ?? null,
    }))
    const { error } = await supabase.from('profile_responsibilities').insert(rows)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

// ============================================================
// assignComplianceOwner
// Quick-assign an individual to an obligation (no full edit needed)
// ============================================================
export async function assignComplianceOwner(
  obligationId: string,
  profileId: string | null,
) {
  const profile = await getCurrentProfile()
  if (!profile) return { error: 'Not authenticated' }
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) {
    return { error: 'Not authorised' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('compliance_obligations')
    .update({ owner_profile_id: profileId, updated_at: new Date().toISOString() })
    .eq('id', obligationId)

  if (error) return { error: error.message }

  revalidatePath(`/compliance/${obligationId}`)
  revalidatePath('/compliance')
  return { success: true }
}
