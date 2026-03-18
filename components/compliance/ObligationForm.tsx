'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { addComplianceObligation, updateComplianceObligation } from '@/lib/actions/compliance'
import { CATEGORY_LABELS } from '@/lib/compliance-utils'
import type { Site, Building, ComplianceObligation, ComplianceFrequency, Profile } from '@/lib/supabase/types'

interface ObligationFormProps {
  sites: Site[]
  buildings?: Building[]
  defaultSiteId?: string
  obligation?: ComplianceObligation  // provided when editing
  onSuccess?: () => void
  profiles?: Pick<Profile, 'id' | 'full_name' | 'display_name'>[]
}

const FREQUENCIES = [
  { value: 'daily',    label: 'Daily' },
  { value: 'weekly',   label: 'Weekly' },
  { value: 'monthly',  label: 'Monthly' },
  { value: 'quarterly',label: 'Quarterly (3 months)' },
  { value: 'biannual', label: 'Biannual (6 months)' },
  { value: 'annual',   label: 'Annual' },
  { value: '5_yearly', label: 'Every 5 years' },
  { value: 'custom',   label: 'Custom (specify days)' },
]

const OWNER_ROLES = [
  { value: '_none',              label: 'Unspecified' },
  { value: 'responsible_person', label: 'Responsible Person' },
  { value: 'safety_officer',     label: 'Safety Officer' },
  { value: 'ast_lead',           label: 'AST Lead' },
  { value: 'contractor',         label: 'External Contractor' },
]

export function ObligationForm({ sites, buildings = [], defaultSiteId, obligation, onSuccess, profiles = [] }: ObligationFormProps) {
  const [isPending, startTransition] = useTransition()
  const [frequency, setFrequency] = useState(obligation?.frequency ?? 'monthly')
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>(
    // populated from existing obligation if editing
    []
  )
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isEditing = !!obligation

  function toggleBuilding(id: string) {
    setSelectedBuildingIds(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const data = {
      site_id:         fd.get('site_id') as string,
      name:            fd.get('name') as string,
      category:        fd.get('category') as string,
      description:     (fd.get('description') as string) || null,
      legislation_ref: (fd.get('legislation_ref') as string) || null,
      frequency,
      frequency_days:  frequency === 'custom' ? parseInt(fd.get('frequency_days') as string) || null : null,
      notice_days:     parseInt(fd.get('notice_days') as string) || 14,
      red_days:        parseInt(fd.get('red_days') as string) || 0,
      owner_role:      (fd.get('owner_role') as string | null) === '_none' ? null : ((fd.get('owner_role') as string) || null),
      owner_profile_id:(fd.get('owner_profile_id') as string | null) === '_none' ? null : ((fd.get('owner_profile_id') as string) || null),
      notes:           (fd.get('notes') as string) || null,
      instructions:    (fd.get('instructions') as string) || null,
      self_completed:  fd.get('self_completed') === 'on',
      building_ids:    selectedBuildingIds,
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateComplianceObligation(obligation.id, data)
        : await addComplianceObligation(data)

      if (result.error) {
        setError(result.error)
      } else {
        toast.success(isEditing ? 'Obligation updated' : 'Obligation added')
        onSuccess?.()
        router.refresh()
        if (!isEditing) router.push('/compliance')
      }
    })
  }

  const siteBuildings = buildings

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Site */}
        <div>
          <Label htmlFor="site_id">Site *</Label>
          <Select name="site_id" defaultValue={obligation?.site_id ?? defaultSiteId ?? sites[0]?.id} required>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select name="category" defaultValue={obligation?.category ?? 'other'} required>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Name */}
        <div className="sm:col-span-2">
          <Label htmlFor="name">Obligation name *</Label>
          <Input
            id="name" name="name" required
            defaultValue={obligation?.name}
            placeholder="e.g. Fire Alarm Weekly Test"
            className="mt-1"
          />
        </div>

        {/* Legislation ref */}
        <div className="sm:col-span-2">
          <Label htmlFor="legislation_ref">Legislation / standard reference</Label>
          <Input
            id="legislation_ref" name="legislation_ref"
            defaultValue={obligation?.legislation_ref ?? ''}
            placeholder="e.g. RRO 2005"
            className="mt-1"
          />
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={2}
            defaultValue={obligation?.description ?? ''}
            placeholder="What needs to be done?"
            className="mt-1" />
        </div>

        {/* Instructions */}
        <div className="sm:col-span-2">
          <Label htmlFor="instructions">
            How to complete
            <span className="ml-1 text-xs text-gray-400">shown to person recording completion</span>
          </Label>
          <Textarea id="instructions" name="instructions" rows={3}
            defaultValue={obligation?.instructions ?? ''}
            placeholder="Step-by-step instructions for completing this check..."
            className="mt-1" />
        </div>

        {/* Frequency */}
        <div>
          <Label>Frequency *</Label>
          <Select value={frequency} onValueChange={v => setFrequency(v as ComplianceFrequency)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {frequency === 'custom' && (
          <div>
            <Label htmlFor="frequency_days">Every N days *</Label>
            <Input
              id="frequency_days" name="frequency_days"
              type="number" min="1" required
              defaultValue={obligation?.frequency_days ?? 90}
              className="mt-1"
            />
          </div>
        )}

        {/* Notice days (amber) */}
        <div>
          <Label htmlFor="notice_days">
            Amber warning (days before due)
            <span className="ml-1 text-xs text-gray-400">default 14</span>
          </Label>
          <Input
            id="notice_days" name="notice_days"
            type="number" min="0"
            defaultValue={obligation?.notice_days ?? 14}
            className="mt-1"
          />
        </div>

        {/* Red days */}
        <div>
          <Label htmlFor="red_days">
            Red warning (days before due)
            <span className="ml-1 text-xs text-gray-400">0 = overdue only</span>
          </Label>
          <Input
            id="red_days" name="red_days"
            type="number" min="0"
            defaultValue={obligation?.red_days ?? 0}
            className="mt-1"
          />
        </div>

        {/* Owner role */}
        <div>
          <Label>Responsible role</Label>
          <Select name="owner_role" defaultValue={obligation?.owner_role ?? '_none'}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Unspecified" />
            </SelectTrigger>
            <SelectContent>
              {OWNER_ROLES.map(r => (
                <SelectItem key={r.value || 'none'} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assigned to (specific person) */}
        <div>
          <Label>Assigned to <span className="text-xs text-gray-400 ml-1">(optional)</span></Label>
          <Select name="owner_profile_id" defaultValue={obligation?.owner_profile_id ?? '_none'}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Unassigned</SelectItem>
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name || p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Buildings multi-select */}
        {siteBuildings.length > 0 && (
          <div className="sm:col-span-2">
            <Label>Buildings covered <span className="text-xs text-gray-400 ml-1">(leave empty = whole site)</span></Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {siteBuildings.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBuilding(b.id)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    selectedBuildingIds.includes(b.id)
                      ? 'bg-purple-100 border-purple-400 text-purple-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Internal notes</Label>
          <Textarea id="notes" name="notes" rows={2}
            defaultValue={obligation?.notes ?? ''}
            placeholder="Any additional notes..."
            className="mt-1" />
        </div>

        {/* Self-completed flag */}
        <div className="sm:col-span-2 flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <input
            id="self_completed"
            name="self_completed"
            type="checkbox"
            defaultChecked={obligation?.self_completed ?? false}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-purple-700"
          />
          <div>
            <Label htmlFor="self_completed" className="cursor-pointer font-medium">
              Internally completed (no contractor or certificate required)
            </Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Hides contractor and certificate fields when recording completion.
              Next due date is calculated automatically from the completion date.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="bg-purple-700 hover:bg-purple-800">
          {isPending ? 'Saving...' : isEditing ? 'Update obligation' : 'Add obligation'}
        </Button>
      </div>
    </form>
  )
}
