import { Badge } from '@/components/ui/badge'
import type { Priority } from '@/lib/supabase/types'

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Can wait',
  medium: 'Needs doing',
  high: 'Urgent',
  critical: 'Safety issue',
}

const PRIORITY_CLASSES: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200 font-semibold',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="outline" className={PRIORITY_CLASSES[priority]}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  )
}
