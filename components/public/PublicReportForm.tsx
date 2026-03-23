'use client'

import { useState, useTransition } from 'react'
import { createPublicSubmission } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, Camera } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

interface Building { id: string; name: string; building_category: string | null }

interface Props {
  siteId: string
  siteName: string
  siteSlug?: string
  buildings: Building[]
}

type Stage = 'form' | 'photos' | 'done'

const CATEGORY_ORDER = [
  'accommodation', 'activity', 'campsite', 'facilities', 'storage', 'grounds',
] as const

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: 'Accommodation',
  activity: 'Activity Areas',
  campsite: 'Campsites & Fields',
  facilities: 'Facilities',
  storage: 'Storage',
  grounds: 'Grounds & External',
}

function BuildingOptions({ buildings }: { buildings: Building[] }) {
  const hasCategories = buildings.some(b => b.building_category)
  if (!hasCategories) {
    return <>{buildings.map(b => (
      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
    ))}</>
  }

  // Group buildings by category
  const grouped = new Map<string, Building[]>()
  const uncategorised: Building[] = []
  for (const b of buildings) {
    if (!b.building_category) { uncategorised.push(b); continue }
    if (!grouped.has(b.building_category)) grouped.set(b.building_category, [])
    grouped.get(b.building_category)!.push(b)
  }

  return <>
    {CATEGORY_ORDER.filter(cat => grouped.has(cat)).map(cat => (
      <SelectGroup key={cat}>
        <SelectLabel>{CATEGORY_LABELS[cat] ?? cat}</SelectLabel>
        {grouped.get(cat)!.map(b => (
          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
        ))}
      </SelectGroup>
    ))}
    {/* Any categories not in CATEGORY_ORDER */}
    {[...grouped.entries()].filter(([cat]) => !(CATEGORY_ORDER as readonly string[]).includes(cat)).map(([cat, items]) => (
      <SelectGroup key={cat}>
        <SelectLabel>{CATEGORY_LABELS[cat] ?? cat}</SelectLabel>
        {items.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
      </SelectGroup>
    ))}
    {uncategorised.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
  </>
}

export function PublicReportForm({ siteId, siteName, siteSlug, buildings }: Props) {
  const [isPending, startTransition] = useTransition()
  const [stage, setStage] = useState<Stage>('form')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    formData.set('site_id', siteId)
    setError(null)

    startTransition(async () => {
      const result = await createPublicSubmission(formData)
      if (result?.error) {
        setError(result.error)
      } else if (result?.taskId) {
        setTaskId(result.taskId)
        setStage('photos')
      }
    })
  }

  // ── Done screen ──────────────────────────────────────────────
  if (stage === 'done') {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Report sent!</h3>
        <p className="text-gray-600 text-sm">
          Your report has been sent to the {siteName} maintenance team.
          They&apos;ll look at it as soon as possible.
        </p>
        <p className="text-gray-400 text-xs mt-4">Thank you for helping keep the site safe.</p>
        <Button
          variant="ghost"
          className="mt-4 text-sm"
          onClick={() => { setStage('form'); setTaskId(null) }}
        >
          Report another problem
        </Button>
      </div>
    )
  }

  // ── Photo upload step ────────────────────────────────────────
  if (stage === 'photos' && taskId) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
            <Camera className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Add photos (optional)</h3>
          <p className="text-gray-600 text-sm">
            A photo helps the team find and fix the problem faster — especially in the woodland.
          </p>
        </div>

        <PhotoUpload
          taskId={taskId}
          isPublic={true}
          existingCount={0}
          onUploaded={() => {
            // Refresh photo count after each upload (handled inside component)
          }}
        />

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-12 text-base"
            onClick={() => setStage('done')}
          >
            Skip
          </Button>
          <Button
            className="flex-1 h-12 text-base bg-purple-700 hover:bg-purple-800"
            onClick={() => setStage('done')}
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  // ── Report form ──────────────────────────────────────────────
  return (
    <form action={handleSubmit} className="space-y-5">
      {siteSlug === 'overstone' && (
        <a
          href="https://wa.me/447518343802"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm no-underline"
        >
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Zm0 18a7.96 7.96 0 0 1-4.07-1.115l-.29-.172-2.87.854.854-2.87-.172-.29A7.96 7.96 0 0 1 4 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8Zm4.406-5.845c-.242-.121-1.432-.707-1.654-.787-.221-.08-.382-.12-.543.12-.16.242-.623.787-.764.948-.14.16-.281.18-.523.06-.242-.12-1.022-.376-1.947-1.2-.72-.643-1.207-1.437-1.348-1.679-.14-.242-.015-.373.106-.493.108-.108.242-.281.362-.422.121-.14.161-.242.242-.402.08-.161.04-.302-.02-.422-.06-.121-.543-1.311-.744-1.794-.196-.47-.396-.406-.543-.414l-.462-.008c-.16 0-.422.06-.643.302-.221.242-.845.826-.845 2.015 0 1.19.865 2.34.986 2.502.12.16 1.703 2.6 4.127 3.645.577.248 1.027.397 1.378.508.579.184 1.106.158 1.523.096.465-.069 1.432-.586 1.633-1.152.201-.565.201-1.05.14-1.151-.06-.1-.221-.161-.463-.282Z"/>
          </svg>
          <span>
            <span className="font-semibold text-red-700">Emergency?</span>
            <span className="text-red-600"> Message the site manager on WhatsApp →</span>
          </span>
        </a>
      )}
      {/* Building */}
      {buildings.length > 0 && (
        <div>
          <Label className="text-base font-medium">
            Where is the problem?
          </Label>
          <Select name="building_id">
            <SelectTrigger className="mt-1 h-12 text-base">
              <SelectValue placeholder="Select building or area" />
            </SelectTrigger>
            <SelectContent>
              <BuildingOptions buildings={buildings} />
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Exact location */}
      <div>
        <Label htmlFor="location_detail" className="text-base font-medium">
          Can you describe where exactly? <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Input
          id="location_detail"
          name="location_detail"
          placeholder="e.g. Left side of the main entrance, near the fire door"
          className="mt-1 h-12 text-base"
        />
      </div>

      {/* Problem */}
      <div>
        <Label htmlFor="title" className="text-base font-medium">
          What&apos;s the problem?
        </Label>
        <Textarea
          id="title"
          name="title"
          required
          placeholder="e.g. The toilet is blocked in the main block"
          className="mt-1 text-base min-h-[100px] resize-none"
        />
      </div>

      {/* Name */}
      <div>
        <Label htmlFor="submitter_name" className="text-base font-medium">
          Your name <span className="text-gray-400 font-normal">(optional)</span>
        </Label>
        <Input
          id="submitter_name"
          name="submitter_name"
          placeholder="So we can follow up if needed"
          className="mt-1 h-12 text-base"
        />
      </div>

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
        {isPending ? 'Sending...' : 'Send report'}
      </Button>
    </form>
  )
}
