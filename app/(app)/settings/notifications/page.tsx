import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { getNotificationSettings } from '@/lib/actions/notifications'
import { NotificationToggle } from '@/components/settings/NotificationToggle'
import type { EventType } from '@/lib/actions/notifications'

const ALL_EVENTS: {
  eventType: EventType
  label: string
  description: string
  roles: string[]
  roleLabel?: string
}[] = [
  {
    eventType: 'task_assigned',
    label: 'Task assigned to me',
    description: 'Get an email when a maintenance task is assigned to you.',
    roles: ['volunteer', 'responsible_person', 'safety_officer', 'ast_lead', 'trustee'],
  },
  {
    eventType: 'task_overdue',
    label: 'Task overdue',
    description: 'Get an email when a task you are assigned to passes its due date.',
    roles: ['volunteer', 'responsible_person', 'safety_officer', 'ast_lead'],
  },
  {
    eventType: 'public_submission',
    label: 'New public submission',
    description: 'Get an email when someone submits an issue via the public report form.',
    roles: ['ast_lead', 'safety_officer'],
    roleLabel: 'AST Lead & Safety Officer',
  },
  {
    eventType: 'compliance_overdue',
    label: 'Compliance obligation overdue',
    description: 'Get an email when a statutory compliance obligation passes its due date.',
    roles: ['ast_lead', 'safety_officer', 'trustee'],
    roleLabel: 'AST Lead, Safety Officer & Trustee',
  },
]

export default async function NotificationSettingsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const savedSettings = await getNotificationSettings()
  const settingsMap = Object.fromEntries(savedSettings.map(s => [s.event_type, s.enabled]))

  // Filter events relevant to this role, default enabled = true if not yet saved
  const visibleEvents = ALL_EVENTS.filter(e => e.roles.includes(profile.role))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Bell className="w-5 h-5 text-purple-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification settings</h1>
          <p className="text-sm text-gray-500">Choose which emails you receive from the system.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 divide-y divide-gray-100">
        {visibleEvents.map(event => (
          <NotificationToggle
            key={event.eventType}
            eventType={event.eventType}
            label={event.label}
            description={event.description}
            enabled={settingsMap[event.eventType] ?? true}
            roleRestricted={event.roleLabel}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Changes save instantly. Notifications are sent to <strong>{profile.email}</strong>.
      </p>
    </div>
  )
}
