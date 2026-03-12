'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { addComplianceRecord } from '@/lib/actions/compliance'
import { Paperclip, X } from 'lucide-react'
import { compressImage } from '@/lib/utils'

interface RecordFormProps {
  obligationId: string
  onSuccess?: () => void
}

export function RecordForm({ obligationId, onSuccess }: RecordFormProps) {
  const [isPending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
  }

  function removeFile() {
    setFile(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const fd = new FormData(form)

    const completedAt = fd.get('completed_at') as string
    const contractorName = fd.get('contractor_name') as string || null
    const notes = fd.get('notes') as string || null
    const certRef = fd.get('certificate_ref') as string || null
    const expiryDate = fd.get('expiry_date') as string || null

    // Build evidence FormData if file selected
    let evidenceFd: FormData | undefined
    if (file) {
      evidenceFd = new FormData()
      let uploadFile = file
      if (file.type.startsWith('image/') && file.size > 500 * 1024) {
        try {
          uploadFile = await compressImage(file, 1024, 0.8)
        } catch {
          // use original if compression fails
        }
      }
      evidenceFd.set('file', uploadFile)
    }

    startTransition(async () => {
      const result = await addComplianceRecord(
        {
          obligation_id: obligationId,
          completed_at: completedAt ? new Date(completedAt).toISOString() : new Date().toISOString(),
          contractor_name: contractorName,
          notes,
          certificate_ref: certRef,
          expiry_date: expiryDate || null,
        },
        evidenceFd,
      )

      if (result.error) {
        setError(result.error)
      } else {
        toast.success('Compliance record added')
        form.reset()
        setFile(null)
        onSuccess?.()
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="completed_at">Completed on *</Label>
          <Input
            id="completed_at"
            name="completed_at"
            type="date"
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="mt-1"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="certificate_ref">Certificate / ref no.</Label>
          <Input id="certificate_ref" name="certificate_ref" placeholder="Optional" className="mt-1" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="contractor_name">Contractor (if external)</Label>
          <Input id="contractor_name" name="contractor_name" placeholder="Optional" className="mt-1" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="expiry_date">Certificate expiry</Label>
          <Input id="expiry_date" name="expiry_date" type="date" className="mt-1" />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Any additional details..." className="mt-1" />
      </div>

      {/* Evidence upload */}
      <div>
        <Label>Evidence (certificate, photo, PDF)</Label>
        <div className="mt-1">
          {file ? (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
              <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1 truncate text-gray-700">{file.name}</span>
              <button type="button" onClick={removeFile} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:text-purple-600 transition-colors">
              <Paperclip className="w-4 h-4" />
              Attach file
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="bg-purple-700 hover:bg-purple-800">
          {isPending ? 'Saving...' : 'Record completion'}
        </Button>
      </div>
    </form>
  )
}
