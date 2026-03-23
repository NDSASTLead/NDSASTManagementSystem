'use client'

import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Site { id: string; short_name: string }
interface Building { id: string; name: string }

interface Props {
  sites: Site[]
  buildings: Building[]
  selectedSiteId?: string
  selectedBuildingId?: string
  statusFilter?: string
}

export function TaskLocationFilter({ sites, buildings, selectedSiteId, selectedBuildingId, statusFilter }: Props) {
  const router = useRouter()

  function buildUrl(siteId?: string, buildingId?: string) {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (siteId) params.set('site', siteId)
    if (buildingId) params.set('building', buildingId)
    const qs = params.toString()
    return qs ? `/tasks?${qs}` : '/tasks'
  }

  function handleSiteChange(value: string) {
    router.push(buildUrl(value === '_all' ? undefined : value))
  }

  function handleBuildingChange(value: string) {
    router.push(buildUrl(selectedSiteId, value === '_all' ? undefined : value))
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Select value={selectedSiteId ?? '_all'} onValueChange={handleSiteChange}>
        <SelectTrigger className="h-9 text-sm w-auto min-w-[130px] bg-white">
          <SelectValue placeholder="All sites" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All sites</SelectItem>
          {sites.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.short_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedSiteId && buildings.length > 0 && (
        <Select value={selectedBuildingId ?? '_all'} onValueChange={handleBuildingChange}>
          <SelectTrigger className="h-9 text-sm w-auto min-w-[150px] bg-white">
            <SelectValue placeholder="All buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All buildings</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
