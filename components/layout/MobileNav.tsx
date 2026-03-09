'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, PlusCircle, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/supabase/types'

interface MobileNavProps {
  role: Role
}

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname()

  const baseLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tasks', label: 'Tasks', icon: ClipboardList },
    { href: '/tasks/new', label: 'Report', icon: PlusCircle },
  ]

  const adminLinks = role === 'ast_lead'
    ? [{ href: '/admin/users', label: 'People', icon: Users }]
    : []

  const links = [...baseLinks, ...adminLinks, { href: '/settings', label: 'Settings', icon: Settings }]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium transition-colors',
                active
                  ? 'text-purple-700'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className={cn('w-6 h-6 mb-1', active && 'text-purple-700')} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
