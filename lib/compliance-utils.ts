import type { ComplianceFrequency, ComplianceObligation, ComplianceRecord, RAGStatus } from '@/lib/supabase/types'

// ============================================================
// Frequency → days mapping
// ============================================================

export const FREQUENCY_DAYS: Record<ComplianceFrequency, number> = {
  daily:    1,
  weekly:   7,
  monthly:  30,
  quarterly: 90,
  biannual: 180,
  annual:   365,
  '5_yearly': 1825,
  custom:   0, // use obligation.frequency_days
}

export function getFrequencyDays(obligation: ComplianceObligation): number {
  if (obligation.frequency === 'custom') {
    return obligation.frequency_days ?? 365
  }
  return FREQUENCY_DAYS[obligation.frequency]
}

// ============================================================
// Next due date
// ============================================================

export function getNextDue(
  obligation: ComplianceObligation,
  latestRecord: ComplianceRecord | null | undefined,
): Date | null {
  if (!latestRecord) return null
  const days = getFrequencyDays(obligation)
  const completed = new Date(latestRecord.completed_at)
  const next = new Date(completed.getTime() + days * 24 * 60 * 60 * 1000)
  return next
}

// ============================================================
// RAG calculation
// Red:   no records, OR overdue, OR within red_days of due
// Amber: within notice_days of due (but not red)
// Green: otherwise
// ============================================================

export function calculateRAG(
  obligation: ComplianceObligation,
  latestRecord: ComplianceRecord | null | undefined,
): RAGStatus {
  if (!latestRecord) return 'red'

  const nextDue = getNextDue(obligation, latestRecord)
  if (!nextDue) return 'unknown'

  const now = Date.now()
  const nextDueMs = nextDue.getTime()

  // Overdue
  if (now > nextDueMs) return 'red'

  // Within red_days window before due
  if (obligation.red_days > 0) {
    const redThreshold = nextDueMs - obligation.red_days * 24 * 60 * 60 * 1000
    if (now >= redThreshold) return 'red'
  }

  // Within notice_days (amber) window
  const amberThreshold = nextDueMs - obligation.notice_days * 24 * 60 * 60 * 1000
  if (now >= amberThreshold) return 'amber'

  return 'green'
}

// ============================================================
// Category labels + colours
// ============================================================

export const CATEGORY_LABELS: Record<string, string> = {
  fire_safety:      'Fire Safety',
  legionella:       'Legionella',
  electrical:       'Electrical',
  equipment:        'Equipment',
  first_aid:        'First Aid',
  coshh:            'COSHH',
  risk_assessment:  'Risk Assessment',
  other:            'Other',
}

export const CATEGORY_COLOURS: Record<string, string> = {
  fire_safety:      'bg-red-100 text-red-700',
  legionella:       'bg-blue-100 text-blue-700',
  electrical:       'bg-yellow-100 text-yellow-700',
  equipment:        'bg-orange-100 text-orange-700',
  first_aid:        'bg-green-100 text-green-700',
  coshh:            'bg-purple-100 text-purple-700',
  risk_assessment:  'bg-gray-100 text-gray-700',
  other:            'bg-gray-100 text-gray-600',
}

// ============================================================
// Human-readable frequency string
// ============================================================

export function formatFrequency(obligation: ComplianceObligation): string {
  switch (obligation.frequency) {
    case 'daily':    return 'Daily'
    case 'weekly':   return 'Weekly'
    case 'monthly':  return 'Monthly'
    case 'quarterly': return 'Every 3 months'
    case 'biannual': return 'Every 6 months'
    case 'annual':   return 'Annual'
    case '5_yearly': return 'Every 5 years'
    case 'custom': {
      const days = obligation.frequency_days ?? 0
      if (days === 1)  return 'Daily'
      if (days === 7)  return 'Weekly'
      if (days === 30) return 'Monthly'
      if (days === 365) return 'Annual'
      return `Every ${days} days`
    }
    default: return obligation.frequency
  }
}

// ============================================================
// Days until/since due (positive = days remaining, negative = overdue)
// ============================================================

export function daysUntilDue(nextDue: Date | null): number | null {
  if (!nextDue) return null
  const diff = nextDue.getTime() - Date.now()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export function formatDueLabel(nextDue: Date | null): string {
  const days = daysUntilDue(nextDue)
  if (days === null) return 'No records'
  if (days < 0)  return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days}d`
}

// ============================================================
// Profile scope helper
// Resolves which site IDs and categories a responsible_person can access
// ============================================================

export interface ProfileScope {
  siteIds: string[]
  /** null means all categories at those sites */
  categories: string[] | null
}

export function getProfileScope(
  responsibilities: Array<{ site_id: string; category: string | null }>,
): ProfileScope {
  if (responsibilities.length === 0) {
    return { siteIds: [], categories: [] }
  }

  const siteIds = [...new Set(responsibilities.map((r) => r.site_id))]

  // If any entry has category=null for a site, that site is fully open
  const hasFullSite = responsibilities.some((r) => r.category === null)
  if (hasFullSite) {
    return { siteIds, categories: null }
  }

  const categories = [...new Set(
    responsibilities
      .map((r) => r.category)
      .filter((c): c is string => c !== null),
  )]

  return { siteIds, categories }
}
