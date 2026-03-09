'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, PlusCircle,
  CalendarClock, BarChart3, Users, LogOut, Settings, HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/shared/Avatar'
import type { Role } from '@/lib/supabase/types'

interface SidebarProps {
  role: Role
  displayName: string
  picturePath?: string | null
}

export function Sidebar({ role, displayName, picturePath }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['volunteer', 'owner', 'ast_lead', 'trustee'] },
    { href: '/tasks', label: 'All Tasks', icon: ClipboardList, roles: ['volunteer', 'owner', 'ast_lead', 'trustee'] },
    { href: '/tasks/new', label: 'Report a Problem', icon: PlusCircle, roles: ['volunteer', 'owner', 'ast_lead'] },
    { href: '/schedules', label: 'Schedules', icon: CalendarClock, roles: ['ast_lead'] },
    { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['ast_lead', 'trustee'] },
    { href: '/admin/users', label: 'People', icon: Users, roles: ['ast_lead'] },
    { href: '/settings', label: 'Settings', icon: Settings, roles: ['volunteer', 'owner', 'ast_lead', 'trustee'] },
    { href: '/help', label: 'How it works', icon: HelpCircle, roles: ['volunteer', 'owner', 'ast_lead', 'trustee'] },
  ].filter(l => l.roles.includes(role))

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">NDS Maintenance</p>
          <p className="text-gray-400 text-xs">Northampton Scouts</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-purple-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <Link
          href="/account"
          className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-gray-800 transition-colors group"
        >
          <Avatar name={displayName} picturePath={picturePath} size="sm" className="ring-2 ring-purple-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-purple-200 transition-colors">{displayName}</p>
            <p className="text-xs text-gray-400 capitalize">{role.replace('_', ' ')}</p>
          </div>
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
