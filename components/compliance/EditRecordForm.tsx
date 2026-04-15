'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { updateComplianceRecord, deleteComplianceRecord } from '@/lib/actions/compliance'
import { Pencil, Trash2 } from 'lucide-react'
import type { ComplianceRecord } from '@/lib/supabase/types'

interface Props {
  record: ComplianceRecord
  selfCompleted?: boolean
  obligationId: string
}

export function EditRecordForm({ record, selfCompleted = false, obligationId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const completedAt = fd.get('completed_at') as string
    const contractorName = fd.get('contractor_name') as string || null
    const notes = fd.get('notes') as string || null
    const certRef = fd.get('certificate_ref') as string || null
    const expiryDate = fd.get('expiry_date') as string || null

    startTransition(async () => {
      const result = await updateComplianceRecord(record.id, {
        completed_at: completedAt ? new Date(completedAt).toISOString() : undefined,
        contractor_name: contractorName,
        notes,
        certificate_ref: certRef,
        expiry_date: expiryDate || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        toast.success('Record updated')
        setOpen(false)
        router.refresh()
      }
    })
  }

  function handleDelete() {
    if (!confirm('Delete this compliance record? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteComplianceRecord(record.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Record deleted')
        setOpen(false)
        router.refresh()
      }
    })
  }

  const defaultDate = record.completed_at
    ? new Date(record.completed_at).toISOString().split('T')[0]
    : ''
  const defaultExpiry = record.expiry_date
    ? new Date(record.expiry_date).toISOString().split('T')[0]
    : ''

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        title="Edit record"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit completion record</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="edit_completed_at">Completed on *</Label>
                <Input
                  id="edit_completed_at"
                  name="completed_at"
                  type="date"
                  required
                  defaultValue={defaultDate}
                  className="mt-1"
                />
              </div>
              {!selfCompleted && (
                <>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit_certificate_ref">Certificate / ref no.</Label>
                    <Input
                      id="edit_certificate_ref"
                      name="certificate_ref"
                      defaultValue={record.certificate_ref ?? ''}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit_contractor_name">Contractor (if external)</Label>
                    <Input
                      id="edit_contractor_name"
                      name="contractor_name"
                      defaultValue={record.contractor_name ?? ''}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit_expiry_date">Certificate expiry</Label>
                    <Input
                      id="edit_expiry_date"
                      name="expiry_date"
                      type="date"
                      defaultValue={defaultExpiry}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                name="notes"
                rows={2}
                defaultValue={record.notes ?? ''}
                placeholder="Any additional details..."
                className="mt-1"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <DialogFooter className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 mr-auto"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete record
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="bg-purple-700 hover:bg-purple-800">
                {isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
