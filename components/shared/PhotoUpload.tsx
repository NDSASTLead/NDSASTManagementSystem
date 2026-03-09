'use client'

import { useRef, useState } from 'react'
import { Camera, X, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/lib/utils'
import { uploadTaskPhoto, uploadPublicPhoto } from '@/lib/actions/attachments'
import { toast } from 'sonner'

interface Props {
  taskId: string
  isPublic?: boolean
  existingCount?: number
  onUploaded?: () => void
}

interface PendingFile {
  id: string
  original: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

const MAX_PHOTOS = 10
const MAX_SIZE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export function PhotoUpload({ taskId, isPublic = false, existingCount = 0, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)

  const slotsLeft = MAX_PHOTOS - existingCount - pending.filter(f => f.status === 'done').length

  function handleFiles(files: FileList | null) {
    if (!files) return

    const newItems: PendingFile[] = []
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, WebP and HEIC images allowed`)
        continue
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} is over ${MAX_SIZE_MB} MB — please choose a smaller photo`)
        continue
      }
      if (pending.length + newItems.length + existingCount >= MAX_PHOTOS) {
        toast.error(`Maximum ${MAX_PHOTOS} photos per task`)
        break
      }
      newItems.push({
        id: crypto.randomUUID(),
        original: file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
      })
    }
    setPending(prev => [...prev, ...newItems])
  }

  function removePending(id: string) {
    setPending(prev => {
      const item = prev.find(f => f.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter(f => f.id !== id)
    })
  }

  async function uploadAll() {
    const toUpload = pending.filter(f => f.status === 'pending')
    if (toUpload.length === 0) return
    setUploading(true)

    for (const item of toUpload) {
      setPending(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f))

      try {
        const compressed = await compressImage(item.original)
        const fd = new FormData()
        fd.append('file', compressed)

        const result = isPublic
          ? await uploadPublicPhoto(taskId, fd)
          : await uploadTaskPhoto(taskId, fd)

        if (result?.error) {
          setPending(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: result.error } : f))
          toast.error(result.error)
        } else {
          URL.revokeObjectURL(item.previewUrl)
          setPending(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' } : f))
        }
      } catch {
        setPending(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: 'Upload failed' } : f))
        toast.error(`Failed to upload ${item.original.name}`)
      }
    }

    setUploading(false)
    const succeeded = pending.filter(f => f.status === 'done').length
    if (succeeded > 0) {
      onUploaded?.()
      // Clean up done items after a short delay
      setTimeout(() => setPending(prev => prev.filter(f => f.status !== 'done')), 1000)
    }
  }

  return (
    <div className="space-y-3">
      {/* Pending previews */}
      {pending.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {pending.map(item => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {/* Overlay states */}
              {item.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
              {item.status === 'done' && (
                <div className="absolute inset-0 bg-green-500/60 flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
              )}
              {item.status === 'error' && (
                <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                  <span className="text-white text-xs text-center px-1">{item.error}</span>
                </div>
              )}
              {item.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => removePending(item.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        {slotsLeft > 0 && (
          <>
            {/* Camera — opens rear camera on mobile */}
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 text-base border-dashed border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.setAttribute('capture', 'environment')
                  inputRef.current.click()
                }
              }}
              disabled={uploading}
            >
              <Camera className="w-5 h-5 mr-2" />
              Take photo
            </Button>

            {/* File picker — for existing photos */}
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 text-base border-dashed border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.removeAttribute('capture')
                  inputRef.current.click()
                }
              }}
              disabled={uploading}
            >
              <Upload className="w-5 h-5 mr-2" />
              Choose photo
            </Button>
          </>
        )}

        {/* Upload button — only shows when there are pending items */}
        {pending.some(f => f.status === 'pending') && (
          <Button
            type="button"
            onClick={uploadAll}
            disabled={uploading}
            className="w-full h-12 text-base bg-purple-700 hover:bg-purple-800"
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              : `Upload ${pending.filter(f => f.status === 'pending').length} photo${pending.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}`
            }
          </Button>
        )}
      </div>

      {slotsLeft === 0 && <p className="text-xs text-gray-400 text-center">Maximum {MAX_PHOTOS} photos reached</p>}

      {/* Hidden file input — accept multiple images */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
