import { Resend } from 'resend'
import type { Task, Profile, ComplianceObligationWithStatus } from '@/lib/supabase/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'AST <noreply@ndsmaintenance.org.uk>'
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')

// ---- helpers ------------------------------------------------

function priorityLabel(p: string) {
  return { low: 'Low', medium: 'Medium', high: 'High', critical: 'CRITICAL' }[p] ?? p
}

function baseLayout(title: string, body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 8px; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; }
  .header { background: #581c87; color: #fff; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; }
  .header h1 { margin: 0; font-size: 18px; }
  .btn { display: inline-block; background: #581c87; color: #fff !important; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; margin-top: 20px; }
  .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 24px; }
  p { color: #374151; font-size: 14px; line-height: 1.6; margin: 8px 0; }
  .label { font-weight: bold; color: #111827; }
</style></head>
<body><div class="card">
  <div class="header"><h1>NDS Maintenance Tracker</h1></div>
  <h2 style="margin:0 0 16px;color:#111827;font-size:16px;">${title}</h2>
  ${body}
  <div class="footer">Northampton District Scouts &middot; Asset Support Team<br>
  <a href="${APP_URL}/settings/notifications" style="color:#9ca3af;">Manage notifications</a></div>
</div></body></html>`
}

async function send(to: string | string[], subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return  // silently skip if not configured
  const toArr = Array.isArray(to) ? to : [to]
  if (!toArr.length) return
  try {
    await resend.emails.send({ from: FROM, to: toArr, subject, html })
  } catch (err) {
    console.error('[email] send error:', err)
  }
}

// ---- notification functions ---------------------------------

/** Task assigned to someone */
export async function notifyTaskAssigned(task: Task, assignee: Profile, assigner: Profile) {
  const body = `
    <p>Hi ${assignee.display_name ?? assignee.full_name},</p>
    <p>A maintenance task has been assigned to you by <span class="label">${assigner.display_name ?? assigner.full_name}</span>.</p>
    <p><span class="label">Task:</span> ${task.title}</p>
    ${task.description ? `<p><span class="label">Details:</span> ${task.description}</p>` : ''}
    <p><span class="label">Priority:</span> ${priorityLabel(task.priority)}</p>
    ${task.due_date ? `<p><span class="label">Due:</span> ${new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
    <a class="btn" href="${APP_URL}/tasks/${task.id}">View task</a>
  `
  await send(assignee.email, `Task assigned to you: ${task.title}`, baseLayout('Task assigned to you', body))
}

/** New public submission — notify all AST leads */
export async function notifyPublicSubmission(task: Task, astLeads: Profile[]) {
  const emails = astLeads.map(p => p.email).filter(Boolean)
  if (!emails.length) return
  const submitter = task.submitter_name ? ` by ${task.submitter_name}` : ''
  const body = `
    <p>A new issue has been submitted via the public report form${submitter}.</p>
    <p><span class="label">Issue:</span> ${task.title}</p>
    ${task.location_detail ? `<p><span class="label">Location detail:</span> ${task.location_detail}</p>` : ''}
    <p><span class="label">Priority:</span> ${priorityLabel(task.priority)}</p>
    <p>Please review and assign this task.</p>
    <a class="btn" href="${APP_URL}/tasks/${task.id}">View task</a>
  `
  await send(emails, `New public submission: ${task.title}`, baseLayout('New public submission', body))
}

/** Task is overdue — notify assignee + AST leads */
export async function notifyTaskOverdue(task: Task, assignee: Profile | null, astLeads: Profile[]) {
  const recipients = [
    ...(assignee ? [assignee.email] : []),
    ...astLeads.map(p => p.email),
  ].filter(Boolean)
  if (!recipients.length) return

  const dueStr = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'no due date set'

  const body = `
    <p>The following task is now overdue${assignee ? ` — assigned to ${assignee.display_name ?? assignee.full_name}` : ''}.</p>
    <p><span class="label">Task:</span> ${task.title}</p>
    <p><span class="label">Priority:</span> ${priorityLabel(task.priority)}</p>
    <p><span class="label">Due:</span> ${dueStr}</p>
    <a class="btn" href="${APP_URL}/tasks/${task.id}">View task</a>
  `
  await send(recipients, `Overdue task: ${task.title}`, baseLayout('Task overdue', body))
}

/** Compliance obligation overdue — notify AST leads + safety officers + trustees */
export async function notifyComplianceOverdue(
  obligations: ComplianceObligationWithStatus[],
  recipients: Profile[],
) {
  const emails = recipients.map(p => p.email).filter(Boolean)
  if (!emails.length || !obligations.length) return

  const rows = obligations.map(o => {
    const due = o.next_due_at
      ? new Date(o.next_due_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Unknown'
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;">${o.name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#dc2626;font-weight:bold;">${due}</td>
    </tr>`
  }).join('')

  const body = `
    <p>The following compliance obligations are overdue and require immediate attention.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <thead><tr>
        <th style="text-align:left;padding:6px 8px;background:#f9fafb;">Obligation</th>
        <th style="text-align:left;padding:6px 8px;background:#f9fafb;">Was due</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <a class="btn" href="${APP_URL}/compliance">View compliance register</a>
  `
  await send(emails, `${obligations.length} compliance obligation${obligations.length > 1 ? 's' : ''} overdue`, baseLayout('Compliance overdue', body))
}
