// Auto-generate this file by running:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
//
// Until then, these hand-written types mirror the schema.

export type Role = 'volunteer' | 'owner' | 'ast_lead' | 'trustee'
export type TaskStatus = 'open' | 'assigned' | 'in_progress' | 'pending_review' | 'complete' | 'cancelled'
export type TaskType = 'scheduled' | 'reactive'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface Profile {
  id: string
  full_name: string
  display_name: string | null
  email: string
  phone: string | null
  whatsapp_opt_in: boolean
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
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
