'use client'

import { useState } from 'react'
import { getProfilePictureUrl } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  picturePath?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-xl',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Avatar({ name, picturePath, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const pictureUrl = getProfilePictureUrl(picturePath)
  const initials = getInitials(name)
  const sizeClass = sizeClasses[size]

  if (pictureUrl && !imgError) {
    return (
      <img
        src={pictureUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={cn(sizeClass, 'rounded-full object-cover flex-shrink-0', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        sizeClass,
        'rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 font-semibold text-purple-700',
        className
      )}
    >
      {initials}
    </div>
  )
}
