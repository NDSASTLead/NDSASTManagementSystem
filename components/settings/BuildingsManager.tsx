'use client'

import { useState, useTransition } from 'react'
import { addBuilding, renameBuilding, toggleBuildingActive } from '@/lib/actions/buildings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Pencil, Check, X, ChevronDown } from 'lucide-react'
import type { Building, Site } from '@/lib/supabase/types'

interface SiteWithBuildings extends Site {
  buildings: Building[]
}

interface Props {
  sites: SiteWithBuildings[]
}

export function BuildingsManager({ sites }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
      {sites.map(site => (
        <SiteBuildingsList key={site.id} site={site} />
      ))}
    </div>
  )
}

function SiteBuildingsList({ site }: { site: SiteWithBuildings }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')

  const active = site.buildings.filter(b => b.is_active)
  const inactive = site.buildings.filter(b => !b.is_active)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const fd = new FormData()
    fd.set('name', newName.trim())
    fd.set('site_id', site.id)
    startTransition(async () => {
      const result = await addBuilding(fd)
      if (result?.error) toast.error(result.error)
      else {
        toast.success(`"${newName.trim()}" added`)
        setNewName('')
      }
    })
  }

  return (
    <div>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-900">{site.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{active.length} active</span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50/50">
          {/* Add form */}
          <form onSubmit={handleAdd} className="flex gap-2 mb-3">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New building or area name…"
              className="h-9 text-sm bg-white"
            />
            <Button
              type="submit"
              disabled={isPending || !newName.trim()}
              size="sm"
              className="h-9 bg-purple-700 hover:bg-purple-800 gap-1.5 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </form>

          {/* Active buildings */}
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {active.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-4">No active buildings yet.</p>
            ) : (
              active.map(b => <BuildingRow key={b.id} building={b} />)
            )}
          </div>

          {/* Inactive buildings */}
          {inactive.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1 px-1">Inactive</p>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 opacity-60">
                {inactive.map(b => <BuildingRow key={b.id} building={b} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BuildingRow({ building }: { building: Building }) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(building.name)

  function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim() || editName.trim() === building.name) {
      setEditing(false)
      setEditName(building.name)
      return
    }
    startTransition(async () => {
      const result = await renameBuilding(building.id, editName.trim())
      if (result?.error) toast.error(result.error)
      else {
        toast.success(`Renamed to "${editName.trim()}"`)
        setEditing(false)
      }
    })
  }

  function handleCancelEdit() {
    setEditing(false)
    setEditName(building.name)
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleBuildingActive(building.id, !building.is_active)
      if (result?.error) toast.error(result.error)
      else toast.success(building.is_active ? `"${building.name}" deactivated` : `"${building.name}" reactivated`)
    })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {editing ? (
        <form onSubmit={handleRename} className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="h-8 text-sm flex-1"
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={isPending}
            className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCancelEdit}
            className="h-8 px-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </form>
      ) : (
        <>
          <p className="flex-1 text-sm text-gray-900 min-w-0 truncate">{building.name}</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => setEditing(true)}
            className="h-8 px-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleToggleActive}
            className={`text-xs h-8 flex-shrink-0 ${
              building.is_active
                ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                : 'text-green-600 hover:text-green-700 hover:bg-green-50'
            }`}
          >
            {building.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </>
      )}
    </div>
  )
}
