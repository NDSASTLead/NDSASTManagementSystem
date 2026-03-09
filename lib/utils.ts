import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compress an image file client-side using the Canvas API.
 * Resizes to maxPx on the longest edge and re-encodes as JPEG.
 * Dramatically reduces file size before upload (avg ~300 KB from ~3 MB).
 */
export async function compressImage(
  file: File,
  maxPx = 1920,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width >= height) {
          height = Math.round((height / width) * maxPx)
          width = maxPx
        } else {
          width = Math.round((width / height) * maxPx)
          height = maxPx
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas context unavailable'))

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => {
          if (!blob) return reject(new Error('Compression failed'))
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressed)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Returns the display name for a profile, falling back to full_name.
 */
export function getDisplayName(profile: { full_name: string; display_name: string | null }): string {
  return profile.display_name ?? profile.full_name
}

/**
 * Returns the public URL for a profile picture, or null if none set.
 */
export function getProfilePictureUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/profile-pictures/${path}`
}
