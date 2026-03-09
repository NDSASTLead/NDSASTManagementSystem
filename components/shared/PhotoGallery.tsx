'use client'

import { useState, useTransition } from 'react'
import { X, ZoomIn, Trash2, ImageOff } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteTaskPhoto } from '@/lib/actions/attachments'
import { toast } from 'sonner'
import type { TaskAttachment } from '@/lib/supabase/types'

interface Props {
  attachments: TaskAttachment[]
  canDelete?: boolean
  taskId: string
}

export function PhotoGallery({ attachments, canDelete = false, taskId }: Props) {
  const [lightbox, setLightbox] = useState<TaskAttachment | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(attachment: TaskAttachment) {
    if (!confirm('Delete this photo? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteTaskPhoto(attachment.id, attachment.storage_path, taskId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Photo deleted')
        if (lightbox?.id === attachment.id) setLightbox(null)
      }
    })
  }

  if (attachments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <ImageOff className="w-4 h-4" />
        <span>No photos attached</span>
      </div>
    )
  }

  return (
    <>
      {/* Count badge */}
      <p className="text-xs font-medium text-gray-500 mb-2">
        {attachments.length} photo{attachments.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {attachments.map(attachment => (
          <div
            key={attachment.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
            onClick={() => setLightbox(attachment)}
          >
            {attachment.signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.signed_url}
                alt={attachment.original_filename}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-6 h-6 text-gray-300" />
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Delete button — ast_lead only */}
            {canDelete && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleDelete(attachment) }}
                disabled={isPending}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={open => !open && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black border-none">
          <div className="relative">
            {lightbox?.signed_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.signed_url}
                alt={lightbox.original_filename}
                className="w-full max-h-[80vh] object-contain rounded"
              />
            )}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-gray-400">{lightbox?.original_filename}</span>
              <div className="flex gap-2">
                {canDelete && lightbox && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => lightbox && handleDelete(lightbox)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                  onClick={() => setLightbox(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
