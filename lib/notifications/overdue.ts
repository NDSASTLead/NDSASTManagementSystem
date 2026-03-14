'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { notifyTaskOverdue, notifyComplianceOverdue } from '@/lib/notifications/email'

/**
 * Checks for overdue tasks and compliance obligations, sends emails,
 * and marks tasks so they aren't notified again.
 */
export async function runOverdueChecks(): Promise<{ tasksNotified: number; complianceNotified: number }> {
  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // ── 1. Overdue tasks ───────────────────────────────────────
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('*, assigned_profile:profiles!tasks_assigned_to_fkey(id, full_name, display_name, email)')
    .lt('due_date', now)
    .not('status', 'in', '("complete","cancelled")')
    .is('overdue_notified_at', null)

  const astLeadsResult = await supabase
    .from('profiles')
    .select('id, full_name, display_name, email')
    .in('role', ['ast_lead', 'safety_officer'])
    .eq('is_active', true)

  const astLeads = (astLeadsResult.data ?? []) as any[]

  let tasksNotified = 0
  for (const task of overdueTasks ?? []) {
    const assignee = (task as any).assigned_profile ?? null
    await notifyTaskOverdue(task as any, assignee, astLeads)
    await supabase
      .from('tasks')
      .update({ overdue_notified_at: now })
      .eq('id', task.id)
    tasksNotified++
  }

  // ── 2. Overdue compliance obligations ─────────────────────
  const { data: obligations } = await supabase
    .from('compliance_obligations')
    .select(`
      *,
      site:sites(id, name, short_name, slug),
      latest_record:compliance_records(completed_at)
    `)
    .eq('is_active', true)

  const overdueObligations: any[] = []
  for (const ob of obligations ?? []) {
    const records = Array.isArray(ob.latest_record) ? ob.latest_record : []
    const lastDone = records.length
      ? new Date(records.sort((a: any, b: any) =>
          new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0].completed_at)
      : null

    const freqDays = ob.frequency_days ?? frequencyToDays(ob.frequency)
    if (!freqDays) continue

    const nextDue = lastDone
      ? new Date(lastDone.getTime() + freqDays * 86400000)
      : null

    if (nextDue && nextDue < new Date()) {
      overdueObligations.push({ ...ob, next_due_at: nextDue.toISOString(), rag: 'red' })
    }
  }

  const complianceRecipients = await supabase
    .from('profiles')
    .select('id, full_name, display_name, email')
    .in('role', ['ast_lead', 'safety_officer', 'trustee'])
    .eq('is_active', true)

  let complianceNotified = 0
  if (overdueObligations.length) {
    await notifyComplianceOverdue(overdueObligations, (complianceRecipients.data ?? []) as any[])
    complianceNotified = overdueObligations.length
  }

  return { tasksNotified, complianceNotified }
}

function frequencyToDays(frequency: string): number | null {
  const map: Record<string, number> = {
    daily: 1, weekly: 7, monthly: 30, quarterly: 91,
    biannual: 182, annual: 365, '5_yearly': 1825,
  }
  return map[frequency] ?? null
}
