'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { UserCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dismissProfilePrompt } from '@/lib/actions/account'

export function ProfilePromptBanner() {
  const [isPending, startTransition] = useTransition()

  function handleDismiss() {
    startTransition(async () => {
      await dismissProfilePrompt()
    })
  }

  return (
    <div className="bg-purple-50 border-b border-purple-100 px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
        <UserCircle className="w-4 h-4 text-purple-600" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-purple-900">Set up your profile</p>
        <p className="text-xs text-purple-700 hidden sm:block">
          Add a display name and photo so your team can recognise you.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          asChild
          size="sm"
          className="h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white"
        >
          <Link href="/account">Set up now</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          disabled={isPending}
          aria-label="Dismiss"
          className="h-8 w-8 p-0 text-purple-400 hover:text-purple-600 hover:bg-purple-100"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
