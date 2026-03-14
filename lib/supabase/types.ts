// Auto-generate this file by running:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
//
// Until then, these hand-written types mirror the schema.

export type Role = 'volunteer' | 'responsible_person' | 'safety_officer' | 'ast_lead' | 'trustee'
export type TaskStatus = 'open' | 'assigned' | 'in_progress' | 'pending_review' | 'complete' | 'cancelled'
export type TaskType = 'scheduled' | 'reactive'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export type ComplianceCategory =
  | 'fire_safety' | 'legionella' | 'electrical' | 'equipment'
  | 'first_aid' | 'coshh' | 'risk_assessment' | 'other'

export type ComplianceFrequency =
  | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  | 'biannual' | 'annual' | '5_yearly' | 'custom'

export type RAGStatus = 'red' | 'amber' | 'green' | 'unknown'

export interface Profile {
  id: string
  full_name: string
  display_name: string | null
  profile_picture_path: string | null
  email: string
  phone: string | null
  whatsapp_opt_in: boolean
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
  profile_prompt_dismissed_at: string | null
}

export interface ProfileResponsibility {
  id: string
  profile_id: string
  site_id: string
  category: string | null
  created_at: string
}

export interface Site {
  id: string
  name: string
  short_name: string
  slug: string
  address: string | null
  postcode: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Building {
  id: string
  site_id: string
  name: string
  description: string | null
  building_category: string | null
  is_active: boolean
  created_at: string
}

export interface AssetCategory {
  id: string
  name: string
  icon: string | null
  colour: string | null
}

export interface Asset {
  id: string
  site_id: string
  building_id: string | null
  category_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Task {
  id: string
  site_id: string
  building_id: string | null
  asset_id: string | null
  category_id: string | null
  title: string
  description: string | null
  location_detail: string | null
  task_type: TaskType
  priority: Priority
  is_compliance: boolean
  legislation_ref: string | null
  public_submission: boolean
  submitter_name: string | null
  status: TaskStatus
  due_date: string | null
  completed_at: string | null
  overdue_notified_at: string | null
  created_by: string | null
  assigned_to: string | null
  completed_by: string | null
  reviewed_by: string | null
  completion_notes: string | null
  template_id: string | null
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string | null
  body: string
  is_internal: boolean
  created_at: string
}

export interface TaskCommentWithAuthor extends TaskComment {
  author?: Profile | null
}

export interface TaskAttachment {
  id: string
  task_id: string
  storage_path: string
  original_filename: string
  file_size: number
  mime_type: string
  uploaded_by: string | null
  created_at: string
  signed_url?: string  // populated server-side before passing to components
}

// Joined types used in queries
export interface TaskWithRelations extends Task {
  site?: Site
  building?: Building | null
  category?: AssetCategory | null
  assigned_profile?: Profile | null
  created_profile?: Profile | null
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
}

// ============================================================
// COMPLIANCE TYPES
// ============================================================

export interface ComplianceObligation {
  id: string
  site_id: string
  name: string
  description: string | null
  category: ComplianceCategory
  legislation_ref: string | null
  frequency: ComplianceFrequency
  frequency_days: number | null
  notice_days: number
  red_days: number
  owner_role: string | null
  owner_profile_id: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ComplianceRecord {
  id: string
  obligation_id: string
  completed_at: string
  completed_by: string | null
  contractor_name: string | null
  notes: string | null
  certificate_ref: string | null
  expiry_date: string | null
  evidence_path: string | null
  task_id: string | null
  created_at: string
}

export interface ComplianceRecordWithProfile extends ComplianceRecord {
  completed_profile?: Profile | null
}

export interface ComplianceObligationWithStatus extends ComplianceObligation {
  site?: Site
  buildings?: Building[]
  owner_profile?: Profile | null
  latest_record?: ComplianceRecord | null
  rag: RAGStatus
  next_due_at: string | null
}

export interface MaintenanceTemplate {
  id: string
  site_id: string
  building_id: string | null
  asset_id: string | null
  title: string
  description: string | null
  category_id: string | null
  priority: Priority
  is_compliance: boolean
  legislation_ref: string | null
  frequency: ComplianceFrequency
  frequency_days: number | null
  notice_days: number
  assign_to_role: Role | null
  compliance_obligation_id: string | null
  is_active: boolean
  last_generated_at: string | null
  next_generate_at: string | null
  created_at: string
  updated_at: string
}

export interface MaintenanceTemplateWithRelations extends MaintenanceTemplate {
  site?: Site
  building?: Building | null
  category?: AssetCategory | null
}

export type NotificationEventType =
  | 'task_assigned'
  | 'task_overdue'
  | 'public_submission'
  | 'compliance_overdue'

export interface NotificationSetting {
  id: string
  profile_id: string
  event_type: NotificationEventType
  enabled: boolean
  threshold_days: number | null
  created_at: string
  updated_at: string
}
