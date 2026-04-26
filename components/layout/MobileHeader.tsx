'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'

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

  const detail = getDetailConfig(pathname)

  // Exact match first, then prefix match for anything not caught above
  const sectionTitle =
    SECTION_TITLES[pathname] ??
    Object.entries(SECTION_TITLES)
      .sort((a, b) => b[0].length - a[0].length) // longest prefix first
      .find(([key]) => pathname.startsWith(key))?.[1] ??
    'NDS Maintenance'

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">

      {/* Left: back arrow on detail pages, logo on top-level pages */}
      {detail ? (
        <Link
          href={detail.back}
          className="flex items-center gap-1.5 text-purple-700 font-medium text-sm flex-shrink-0 -ml-1 px-1 py-1"
          aria-label={`Back to ${detail.label}`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{detail.label}</span>
        </Link>
      ) : (
        <div className="w-7 h-7 bg-purple-600 rounded-md flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">N</span>
        </div>
      )}

      {/* Centre: current page / section title */}
      <p className="flex-1 font-semibold text-gray-900 text-sm truncate">
        {detail ? '' : sectionTitle}
      </p>

      {/* Right: avatar → account */}
      <Link href="/account" className="flex-shrink-0" aria-label="My account">
        <Avatar name={displayName} picturePath={picturePath} size="sm" />
      </Link>
    </header>
  )
}
