'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'
import { usePageTitle } from '@/lib/page-title-context'

interface Props {
  displayName: string
  picturePath?: string | null
}

// ── Section titles (list/top-level pages) ──────────────────────────────────
const SECTION_TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/tasks':       'Tasks',
  '/tasks/new':   'Report a Problem',
  '/compliance':  'Compliance',
  '/safety':      'Safety',
  '/reports':     'Reports',
  '/schedules':   'Schedules',
  '/admin/users': 'People',
  '/settings':    'Settings',
  '/account':     'My Account',
  '/help':        'How it works',
}

// ── For detail pages: what to show and where back goes ────────────────────
interface DetailConfig {
  label: string   // shown in header as "← label"
  back: string    // href for the back arrow
}

function getDetailConfig(pathname: string): DetailConfig | null {
  if (/^\/tasks\/[^/]+$/.test(pathname) && pathname !== '/tasks/new') {
    return { label: 'Tasks', back: '/tasks' }
  }
  if (/^\/compliance\/[^/]+$/.test(pathname)) {
    return { label: 'Compliance', back: '/compliance' }
  }
  if (/^\/compliance\/[^/]+\/edit$/.test(pathname)) {
    return { label: 'Compliance', back: '/compliance' }
  }
  if (/^\/safety\/[^/]+$/.test(pathname)) {
    return { label: 'Safety', back: '/safety' }
  }
  if (/^\/admin\/users\/[^/]+$/.test(pathname)) {
    return { label: 'People', back: '/admin/users' }
  }
  return null
}

export function MobileHeader({ displayName, picturePath }: Props) {
  const pathname = usePathname()
  const { title } = usePageTitle()

  const detail = getDetailConfig(pathname)

  // Exact match first, then prefix match for anything not caught above
  const sectionTitle =
    SECTION_TITLES[pathname] ??
    Object.entries(SECTION_TITLES)
      .sort((a, b) => b[0].length - a[0].length) // longest prefix first
      .find(([key]) => pathname.startsWith(key))?.[1] ??
    'NDS Maintenance'

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3">

        {/* Left: back arrow on detail pages, logo on top-level pages */}
        {detail ? (
          <Link
            href={detail.back}
            className="flex items-center gap-1 text-purple-700 font-medium text-sm flex-shrink-0 -ml-1 px-1 py-1"
            aria-label={`Back to ${detail.label}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs">{detail.label}</span>
          </Link>
        ) : (
          <div className="w-7 h-7 bg-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">N</span>
          </div>
        )}

        {/* Centre: item title (detail pages) or section name (list pages) */}
        <p className="flex-1 font-semibold text-gray-900 text-sm truncate min-w-0">
          {detail ? (title || '') : sectionTitle}
        </p>

        {/* Right: avatar → account */}
        <Link href="/account" className="flex-shrink-0" aria-label="My account">
          <Avatar name={displayName} picturePath={picturePath} size="sm" />
        </Link>
      </div>

      {/* Item subtitle row — section label on detail pages once we have a title */}
      {detail && title && (
        <div className="px-4 pb-1.5">
          <p className="text-xs text-gray-400">{detail.label}</p>
        </div>
      )}
    </header>
  )
}
