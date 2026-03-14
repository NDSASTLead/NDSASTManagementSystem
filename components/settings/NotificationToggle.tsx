'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { saveNotificationSetting } from '@/lib/actions/notifications'
import type { EventType } from '@/lib/actions/notifications'

interface Props {
  eventType: EventType
  enabled: boolean
  label: string
  description: string
  roleRestricted?: string   // e.g. "AST Lead & Safety Officer only"
}

export function NotificationToggle({ eventType, enabled, label, description, roleRestricted }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleChange(checked: boolean) {
    startTransition(async () => {
      const res = await saveNotificationSetting(eventType, checked)
      if (res?.error) toast.error(res.error)
    })
  }

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {roleRestricted && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{roleRestricted}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={isPending}
        onClick={() => handleChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          enabled ? 'bg-purple-600' : 'bg-gray-200'
        } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
