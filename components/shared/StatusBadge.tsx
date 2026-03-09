import { Badge } from '@/components/ui/badge'
import type { TaskStatus } from '@/lib/supabase/types'

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In progress',
  pending_review: 'Waiting for review',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

const STATUS_CLASSES: Record<TaskStatus, string> = {
  open: 'bg-gray-100 text-gray-700 border-gray-200',
  assigned: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  pending_review: 'bg-purple-100 text-purple-700 border-purple-200',
  complete: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-400 border-gray-200 line-through',
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
