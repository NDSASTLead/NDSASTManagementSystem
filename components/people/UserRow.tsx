'use client'

import { useState, useTransition } from 'react'
import { updateUserRole, setUserActive } from '@/lib/actions/people'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/shared/Avatar'
import { ResponsibilitiesEditor } from '@/components/people/ResponsibilitiesEditor'
import { toast } from 'sonner'
import { getDisplayName } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Profile, Role, Site, ProfileResponsibility } from '@/lib/supabase/types'

interface Props {
  person: Profile
  currentUserId: string
  sites: Site[]
  responsibilities: ProfileResponsibility[]
}

const ROLE_LABELS: Record<Role, string> = {
  volunteer:           'Volunteer',
  responsible_person:  'Responsible Person',
  safety_officer:      'Safety Officer',
  ast_member:          'AST Member',
  ast_lead:            'AST Lead',
  trustee:             'Trustee',
}

export function UserRow({ person, currentUserId, sites, responsibilities }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAccess, setShowAccess] = useState(false)
  const isSelf = person.id === currentUserId
  const displayName = getDisplayName(person)
  const isResponsiblePerson = person.role === 'responsible_person'

  function handleRoleChange(role: string) {
    startTransition(async () => {
      const result = await updateUserRole(person.id, role as Role)
      if (result?.error) toast.error(result.error)
      else toast.success(`${displayName}'s role updated to ${ROLE_LABELS[role as Role]}`)
    })
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await setUserActive(person.id, !person.is_active)
      if (result?.error) toast.error(result.error)
      else toast.success(person.is_active ? `${displayName} deactivated` : `${displayName} reactivated`)
    })
  }

  return (
    <div className={`px-4 py-3 ${!person.is_active ? 'opacity-50' : ''}`}>
      {/* Main row */}
      <div className="flex items-center gap-3">
        <Avatar name={displayName} picturePath={person.profile_picture_path} size="sm" />

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {displayName}
            {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
            {!person.is_active && <span className="ml-2 text-xs text-red-500">inactive</span>}
          </p>
          {person.display_name && (
            <p className="text-xs text-gray-400 truncate">{person.full_name}</p>
          )}
          <p className="text-xs text-gray-500 truncate">{person.email}</p>
        </div>

        {/* Role selector */}
        <div className="w-44 flex-shrink-0">
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
              <SelectItem value="responsible_person">Responsible Person</SelectItem>
              <SelectItem value="safety_officer">Safety Officer</SelectItem>
              <SelectItem value="ast_member">AST Member</SelectItem>
              <SelectItem value="ast_lead">AST Lead</SelectItem>
              <SelectItem value="trustee">Trustee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Site access toggle — responsible_person only */}
        {isResponsiblePerson && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAccess(v => !v)}
            className="text-xs h-8 flex-shrink-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            {showAccess ? (
              <><ChevronUp className="w-3.5 h-3.5 mr-1" />Sites</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5 mr-1" />Sites
                {responsibilities.length > 0 && (
                  <span className="ml-1 text-purple-400">({responsibilities.length})</span>
                )}
              </>
            )}
          </Button>
        )}

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

      {/* Expandable site access editor */}
      {isResponsiblePerson && showAccess && (
        <ResponsibilitiesEditor
          profileId={person.id}
          displayName={displayName}
          sites={sites}
          responsibilities={responsibilities}
        />
      )}
    </div>
  )
}
