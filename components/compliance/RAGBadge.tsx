import { cn } from '@/lib/utils'
import type { RAGStatus } from '@/lib/supabase/types'

interface RAGBadgeProps {
  status: RAGStatus
  label?: string
  className?: string
}

const CONFIG: Record<RAGStatus, { dot: string; text: string; bg: string; label: string }> = {
  red:     { dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    label: 'Overdue' },
  amber:   { dot: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50',  label: 'Due soon' },
  green:   { dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  label: 'Compliant' },
  unknown: { dot: 'bg-gray-400',   text: 'text-gray-600',   bg: 'bg-gray-50',   label: 'No records' },
}

export function RAGBadge({ status, label, className }: RAGBadgeProps) {
  const c = CONFIG[status]
  const displayLabel = label ?? c.label
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
      c.bg, c.text, className
    )}>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
      {displayLabel}
    </span>
  )
}

export function RAGDot({ status, className }: { status: RAGStatus; className?: string }) {
  const dotClass = {
    red:     'bg-red-500',
    amber:   'bg-amber-400',
    green:   'bg-green-500',
    unknown: 'bg-gray-400',
  }[status]
  return (
    <span className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', dotClass, className)} />
  )
}
