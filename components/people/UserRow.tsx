'use client'

import { useTransition } from 'react'
import { updateUserRole, setUserActive } from '@/lib/actions/people'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Profile, Role } from '@/lib/supabase/types'

interface Props {
  person: Profile
  currentUserId: string
}

const ROLE_LABELS: Record<Role, string> = {
  volunteer: 'Volunteer',
  owner: 'Owner',
  ast_lead: 'AST Lead',
  trustee: 'Trustee',
}

export function UserRow({ person, currentUserId }: Props) {
  const [isPending, startTransition] = useTransition()
  const isSelf = person.id === currentUserId

  function handleRoleChange(role: string) {
    startTransition(async () => {
      const result = await updateUserRole(person.id, role as Role)
      if (result?.error) toast.error(result.error)
      else toast.success(`${person.full_name}'s role updated to ${ROLE_LABELS[role as Role]}`)
    })
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await setUserActive(person.id, !person.is_active)
      if (result?.error) toast.error(result.error)
      else toast.success(person.is_active ? `${person.full_name} deactivated` : `${person.full_name} reactivated`)
    })
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!person.is_active ? 'opacity-50' : ''}`}>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-purple-700">
          {person.full_name?.charAt(0)?.toUpperCase() ?? '?'}
        </span>
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {person.full_name}
          {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
          {!person.is_active && <span className="ml-2 text-xs text-red-500">inactive</span>}
        </p>
        <p className="text-xs text-gray-500 truncate">{person.email}</p>
      </div>

      {/* Role selector */}
      <div className="w-32 flex-shrink-0">
        <Select
          value={person.role}
          onValueChange={handleRoleChange}
          disabled={isPending || isSelf}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="volunteer">Volunteer</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="ast_lead">AST Lead</SelectItem>
            <SelectItem value="trustee">Trustee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activate / Deactivate */}
      {!isSelf && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleToggleActive}
          className={`text-xs h-8 flex-shrink-0 ${
            person.is_active
              ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
          }`}
        >
          {person.is_active ? 'Deactivate' : 'Reactivate'}
        </Button>
      )}
    </div>
  )
}
