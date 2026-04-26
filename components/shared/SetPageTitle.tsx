'use client'

import { useEffect } from 'react'
import { usePageTitle } from '@/lib/page-title-context'

/**
 * Render this at the top of any server page to push the item title
 * into the sticky mobile header. The component renders nothing visible.
 *
 * Usage (inside a server component):
 *   <SetPageTitle title={task.title} />
 */
export function SetPageTitle({ title }: { title: string }) {
  const { setTitle } = usePageTitle()
  useEffect(() => {
    setTitle(title)
    // Clear on unmount so list pages don't carry a stale title
    return () => setTitle('')
  }, [title, setTitle])
  return null
}
