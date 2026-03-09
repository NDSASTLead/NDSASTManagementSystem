'use client'

import { useState, useTransition } from 'react'
import { createTask } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Site { id: string; name: string; short_name: string }
interface Building { id: string; site_id: string; name: string }
interface Category { id: string; name: string }

interface Props {
  sites: Site[]
  initialBuildings: Building[]
  categories: Category[]
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'It can wait', description: 'Not urgent, do when possible', colour: 'border-gray-200 bg-white hover:bg-gray-50' },
  { value: 'medium', label: 'Needs doing soon', description: 'Should be done within a week or two', colour: 'border-blue-200 bg-blue-50 hover:bg-blue-100' },
  { value: 'high', label: 'Urgent', description: 'Needs attention within a few days', colour: 'border-orange-200 bg-orange-50 hover:bg-orange-100' },
  { value: 'critical', label: 'Safety issue', description: 'Could cause harm — act immediately', colour: 'border-red-300 bg-red-50 hover:bg-red-100' },
]

export function TaskCreateForm({ sites, initialBuildings, categories }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? '')
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [priority, setPriority] = useState('medium')

  async function handleSiteChange(siteId: string) {
    setSelectedSiteId(siteId)
    const supabase = createClient()
    const { data } = await supabase
      .from('buildings')
      .select('id, site_id, name')
      .eq('site_id', siteId)
      .eq('is_active', true)
    setBuildings(data ?? [])
  }

  function handleSubmit(formData: FormData) {
    formData.set('priority', priority)
    setError(null)
    startTransition(async () => {
      const result = await createTask(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Site */}
      {sites.length > 1 && (
        <div>
          <Label htmlFor="site_id" className="text-base font-medium">Which site?</Label>
          <Select
            name="site_id"
            value={selectedSiteId}
            onValueChange={handleSiteChange}
          >
            <SelectTrigger className="mt-1 h-12 text-base">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {sites.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {sites.length === 1 && (
        <input type="hidden" name="site_id" value={selectedSiteId} />
      )}

      {/* Building */}
      {buildings.length > 0 && (
        <div>
          <Label htmlFor="building_id" className="text-base font-medium">
            Which building or area? <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Select name="building_id">
            <SelectTrigger className="mt-1 h-12 text-base">
              <SelectValue placeholder="Select building / area" />
            </SelectTrigger>
            <SelectContent>
              {buildings.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Problem description */}
      <div>
        <Label htmlFor="title" className="text-base font-medium">
          What&apos;s the problem?
        </Label>
        <Textarea
          id="title"
          name="title"
          required
          placeholder="e.g. Fire door on corridor won't close properly"
          className="mt-1 text-base min-h-[100px] resize-none"
        />
      </div>

      {/* Additional detail */}
      <div>
        <Label htmlFor="description" className="text-base font-medium">
          Any more detail? <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="e.g. It's on the left as you enter from the car park. The latch is broken."
          className="mt-1 text-base min-h-[80px] resize-none"
        />
      </div>

      {/* Priority — big buttons, plain English */}
      <div>
        <Label className="text-base font-medium">How urgent is it?</Label>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {PRIORITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPriority(opt.value)}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-lg border-2 text-left transition-all',
                opt.colour,
                priority === opt.value ? 'ring-2 ring-purple-500 ring-offset-1' : ''
              )}
            >
              <div>
                <p className="font-semibold text-gray-900">{opt.label}</p>
                <p className="text-sm text-gray-600">{opt.description}</p>
              </div>
              {priority === opt.value && (
                <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 ml-3">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Category — optional */}
      {categories.length > 0 && (
        <div>
          <Label htmlFor="category_id" className="text-base font-medium">
            Category <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Select name="category_id">
            <SelectTrigger className="mt-1 h-12 text-base">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-14 text-lg bg-purple-700 hover:bg-purple-800"
      >
        {isPending ? 'Sending report...' : 'Send report'}
      </Button>
    </form>
  )
}
