'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type EventType = 'task_assigned' | 'task_overdue' | 'public_submission' | 'compliance_overdue'

export interface NotificationSetting {
  event_type: EventType
  enabled: boolean
  threshold_days: number | null
}

export async function getNotificationSettings(): Promise<NotificationSetting[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notification_settings')
    .select('event_type, enabled, threshold_days')
    .eq('profile_id', user.id)

  return (data ?? []) as NotificationSetting[]
}

export async function saveNotificationSetting(eventType: EventType, enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notification_settings')
    .upsert(
      { profile_id: user.id, event_type: eventType, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'profile_id,event_type' }
    )

  if (error) return { error: 'Failed to save setting.' }
  revalidatePath('/settings/notifications')
  return { success: true }
}
