'use client'

import { useState, useTransition } from 'react'
import { createPublicSubmission } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, Camera } from 'lucide-react'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

interface Building { id: string; name: string }

interface Props {
  siteId: string
  siteName: string
  buildings: Building[]
}

type Stage = 'form' | 'photos' | 'done'

export function PublicReportForm({ siteId, siteName, buildings }: Props) {
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
              {buildings.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
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
