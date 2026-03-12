'use client'

import Link from 'next/link'
import { useState } from 'react'
import { RAGDot } from '@/components/compliance/RAGBadge'
import { CATEGORY_LABELS, CATEGORY_COLOURS, formatFrequency, formatDueLabel } from '@/lib/compliance-utils'
import { cn } from '@/lib/utils'
import type { ComplianceObligationWithStatus } from '@/lib/supabase/types'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface ComplianceTableProps {
  obligations: ComplianceObligationWithStatus[]
  showSiteColumn?: boolean
}

type SortField = 'rag' | 'name' | 'category' | 'next_due_at'
type SortDir = 'asc' | 'desc'

const RAG_ORDER = { red: 0, amber: 1, unknown: 2, green: 3 }

export function ComplianceTable({ obligations, showSiteColumn = false }: ComplianceTableProps) {
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'rag', dir: 'asc' })

  function toggleSort(field: SortField) {
    setSort(prev =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    )
  }

  const sorted = [...obligations].sort((a, b) => {
    let cmp = 0
    switch (sort.field) {
      case 'rag':
        cmp = RAG_ORDER[a.rag] - RAG_ORDER[b.rag]
        break
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'category':
        cmp = a.category.localeCompare(b.category)
        break
      case 'next_due_at': {
        const aDate = a.next_due_at ? new Date(a.next_due_at).getTime() : Infinity
        const bDate = b.next_due_at ? new Date(b.next_due_at).getTime() : Infinity
        cmp = aDate - bDate
        break
      }
    }
    return sort.dir === 'asc' ? cmp : -cmp
  })

  function SortHeader({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    const active = sort.field === field
    const Icon = active && sort.dir === 'desc' ? ChevronDown : ChevronUp
    return (
      <th
        className={cn('px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700', className)}
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <Icon className={cn('w-3 h-3', active ? 'opacity-100 text-purple-600' : 'opacity-30')} />
        </span>
      </th>
    )
  }

  if (obligations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">No compliance obligations found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <SortHeader field="rag" className="w-8">Status</SortHeader>
            <SortHeader field="name">Obligation</SortHeader>
            {showSiteColumn && (
              <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Site</th>
            )}
            <SortHeader field="category" className="hidden sm:table-cell">Category</SortHeader>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Frequency</th>
            <SortHeader field="next_due_at">Due</SortHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map(ob => (
            <tr key={ob.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-3 py-3">
                <RAGDot status={ob.rag} />
              </td>
              <td className="px-3 py-3">
                <Link href={`/compliance/${ob.id}`} className="font-medium text-gray-900 hover:text-purple-700 transition-colors">
                  {ob.name}
                </Link>
                {ob.legislation_ref && (
                  <p className="text-xs text-gray-400 mt-0.5">{ob.legislation_ref}</p>
                )}
              </td>
              {showSiteColumn && (
                <td className="px-3 py-3 hidden md:table-cell">
                  <span className="text-xs text-gray-500">{(ob as any).site?.short_name ?? '—'}</span>
                </td>
              )}
              <td className="px-3 py-3 hidden sm:table-cell">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', CATEGORY_COLOURS[ob.category] ?? 'bg-gray-100 text-gray-600')}>
                  {CATEGORY_LABELS[ob.category] ?? ob.category}
                </span>
              </td>
              <td className="px-3 py-3 text-xs text-gray-500 hidden lg:table-cell">
                {formatFrequency(ob)}
              </td>
              <td className="px-3 py-3">
                <span className={cn(
                  'text-xs font-medium',
                  ob.rag === 'red' ? 'text-red-600' :
                  ob.rag === 'amber' ? 'text-amber-600' :
                  ob.rag === 'green' ? 'text-green-600' :
                  'text-gray-400'
                )}>
                  {formatDueLabel(ob.next_due_at ? new Date(ob.next_due_at) : null)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
