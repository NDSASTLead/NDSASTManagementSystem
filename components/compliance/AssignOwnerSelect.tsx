'use client'

import { useTransition } from 'react'
import { UserCheck } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { assignComplianceOwner } from '@/lib/actions/compliance'
import { toast } from 'sonner'

interface Props {
  obligationId: string
  currentProfileId: string | null
  profiles: { id: string; full_name: string; display_name: string | null }[]
}

export function AssignOwnerSelect({ obligationId, currentProfileId, profiles }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleChange(val: string) {
    const profileId = val === '_none' ? null : val
    startTransition(async () => {
      const res = await assignComplianceOwner(obligationId, profileId)
      if (res?.error) toast.error(res.error)
      else toast.success(profileId ? 'Owner assigned' : 'Owner removed')
    })
  }

  return (
    <div className="flex items-center gap-2">
      <UserCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <Select
        value={currentProfileId ?? '_none'}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 text-sm border-gray-200 bg-white w-52">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">
            <span className="text-gray-400">Unassigned</span>
          </SelectItem>
          {profiles.map(p => (
            <SelectItem key={p.id} value={p.id}>
              {p.display_name || p.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
