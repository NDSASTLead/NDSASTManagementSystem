'use client'

import { useState, useTransition } from 'react'
import { setProfileResponsibilities } from '@/lib/actions/compliance'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CATEGORY_LABELS } from '@/lib/compliance-utils'
import type { Site, ProfileResponsibility } from '@/lib/supabase/types'

interface Props {
  profileId: string
  displayName: string
  sites: Site[]
  responsibilities: ProfileResponsibility[]
}

type CategoryKey = keyof typeof CATEGORY_LABELS

// Ordered list of categories for the UI
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryKey[]

interface SiteConfig {
  enabled: boolean
  allCategories: boolean          // true = category NULL (full site access)
  categories: Set<string>         // only used when allCategories = false
}

function buildInitialState(
  sites: Site[],
  responsibilities: ProfileResponsibility[],
): Record<string, SiteConfig> {
  const state: Record<string, SiteConfig> = {}

  for (const site of sites) {
    const siteResponsibilities = responsibilities.filter(r => r.site_id === site.id)

    if (siteResponsibilities.length === 0) {
      state[site.id] = { enabled: false, allCategories: true, categories: new Set() }
    } else {
      const hasFullAccess = siteResponsibilities.some(r => r.category === null)
      state[site.id] = {
        enabled: true,
        allCategories: hasFullAccess,
        categories: hasFullAccess
          ? new Set()
          : new Set(siteResponsibilities.map(r => r.category!).filter(Boolean)),
      }
    }
  }

  return state
}

export function ResponsibilitiesEditor({ profileId, displayName, sites, responsibilities }: Props) {
  const [config, setConfig] = useState<Record<string, SiteConfig>>(
    () => buildInitialState(sites, responsibilities)
  )
  const [isPending, startTransition] = useTransition()

  function toggleSite(siteId: string) {
    setConfig(prev => ({
      ...prev,
      [siteId]: { ...prev[siteId], enabled: !prev[siteId].enabled },
    }))
  }

  function toggleAllCategories(siteId: string) {
    setConfig(prev => ({
      ...prev,
      [siteId]: { ...prev[siteId], allCategories: !prev[siteId].allCategories, categories: new Set() },
    }))
  }

  function toggleCategory(siteId: string, category: string) {
    setConfig(prev => {
      const existing = new Set(prev[siteId].categories)
      if (existing.has(category)) existing.delete(category)
      else existing.add(category)
      return { ...prev, [siteId]: { ...prev[siteId], categories: existing } }
    })
  }

  function handleSave() {
    // Build the responsibilities payload
    const payload: Array<{ site_id: string; category: string | null }> = []

    for (const [siteId, cfg] of Object.entries(config)) {
      if (!cfg.enabled) continue

      if (cfg.allCategories) {
        payload.push({ site_id: siteId, category: null })
      } else {
        for (const cat of cfg.categories) {
          payload.push({ site_id: siteId, category: cat })
        }
      }
    }

    startTransition(async () => {
      const result = await setProfileResponsibilities(profileId, payload)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Site access updated for ${displayName}`)
      }
    })
  }

  const hasAnyAccess = Object.values(config).some(c => c.enabled)

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Site access
      </p>

      <div className="space-y-2">
        {sites.map(site => {
          const cfg = config[site.id]
          if (!cfg) return null
          return (
            <div key={site.id} className={`rounded-lg border p-3 transition-colors ${cfg.enabled ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50'}`}>

              {/* Site toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={() => toggleSite(site.id)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className={`text-sm font-medium ${cfg.enabled ? 'text-purple-900' : 'text-gray-600'}`}>
                  {site.name}
                </span>
              </label>

              {/* Category scope — only shown when site is enabled */}
              {cfg.enabled && (
                <div className="mt-2.5 ml-6 space-y-2">
                  {/* All categories toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cfg.allCategories}
                      onChange={() => toggleAllCategories(site.id)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-medium text-purple-700">All categories</span>
                  </label>

                  {/* Individual categories */}
                  {!cfg.allCategories && (
                    <div className="grid grid-cols-2 gap-1 ml-1">
                      {ALL_CATEGORIES.map(cat => (
                        <label key={cat} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={cfg.categories.has(cat)}
                            onChange={() => toggleCategory(site.id, cat)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-xs text-gray-700">{CATEGORY_LABELS[cat]}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!hasAnyAccess && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          No sites selected — this person will not see any compliance items.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="bg-purple-700 hover:bg-purple-800"
        >
          {isPending ? 'Saving…' : 'Save access'}
        </Button>
      </div>
    </div>
  )
}
