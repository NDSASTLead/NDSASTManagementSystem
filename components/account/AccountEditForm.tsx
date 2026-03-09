'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Camera, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/shared/Avatar'
import { updateProfile, uploadProfilePicture, removeProfilePicture } from '@/lib/actions/account'
import { compressImage, getDisplayName } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/types'

interface AccountEditFormProps {
  profile: Profile
}

export function AccountEditForm({ profile }: AccountEditFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [picturePath, setPicturePath] = useState(profile.profile_picture_path)
  const [isSavingName, startSavingName] = useTransition()
  const [isUploadingPic, startUploadingPic] = useTransition()
  const [isRemovingPic, startRemovingPic] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSaveName() {
    startSavingName(async () => {
      const result = await updateProfile({ displayName })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Display name updated')
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG or WebP images are allowed')
      return
    }

    startUploadingPic(async () => {
      try {
        const compressed = await compressImage(file, 400, 0.85)
        const formData = new FormData()
        formData.append('file', compressed)
        const result = await uploadProfilePicture(formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          setPicturePath(result.path ?? null)
          toast.success('Profile picture updated')
        }
      } catch {
        toast.error('Failed to process image')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  function handleRemovePicture() {
    startRemovingPic(async () => {
      const result = await removeProfilePicture()
      if (result.error) {
        toast.error(result.error)
      } else {
        setPicturePath(null)
        toast.success('Profile picture removed')
      }
    })
  }

  const displayNameValue = displayName || getDisplayName(profile)

  return (
    <div className="space-y-6">

      {/* Profile Picture */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">Profile picture</Label>
        <div className="flex items-center gap-4">
          <Avatar
            name={displayNameValue}
            picturePath={picturePath}
            size="lg"
          />
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPic}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              {isUploadingPic ? 'Uploading…' : 'Upload photo'}
            </Button>
            {picturePath && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemovePicture}
                disabled={isRemovingPic}
                className="gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
              >
                <Trash2 className="w-4 h-4" />
                {isRemovingPic ? 'Removing…' : 'Remove'}
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">JPEG, PNG or WebP, max 2 MB</p>
      </div>

      {/* Display Name */}
      <div>
        <Label htmlFor="display-name" className="text-sm font-medium text-gray-700 mb-1 block">
          Display name
        </Label>
        <p className="text-xs text-gray-400 mb-2">
          How you appear to others. Leave blank to use your full name ({profile.full_name}).
        </p>
        <div className="flex gap-2">
          <Input
            id="display-name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={profile.full_name}
            className="max-w-xs"
          />
          <Button
            onClick={handleSaveName}
            disabled={isSavingName}
            size="sm"
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSavingName ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

    </div>
  )
}
