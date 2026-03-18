import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { createClient } from '@/lib/supabase/server'
import { getComplianceObligation, getComplianceEvidenceUrl, getProfileResponsibilities } from '@/lib/actions/compliance'
import { getProfileScope, CATEGORY_LABELS, formatFrequency, formatDueLabel } from '@/lib/compliance-utils'
import { RAGBadge } from '@/components/compliance/RAGBadge'
import { RecordForm } from '@/components/compliance/RecordForm'
import { AssignOwnerSelect } from '@/components/compliance/AssignOwnerSelect'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, FileText, Calendar, User, Building2 } from 'lucide-react'
import { format } from 'date-fns'

const ACCESS_ROLES = ['responsible_person', 'safety_officer', 'ast_lead', 'trustee']

export default async function ComplianceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!ACCESS_ROLES.includes(profile.role)) redirect('/dashboard')

  const obligation = await getComplianceObligation(id) as any
  if (!obligation) notFound()

  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, display_name')
    .eq('is_active', true)
    .order('full_name')

  // Determine if user can record completion
  let canRecord = ['ast_lead', 'safety_officer'].includes(profile.role)
  if (profile.role === 'responsible_person') {
    const responsibilities = await getProfileResponsibilities(profile.id)
    const scope = getProfileScope(responsibilities)
    const siteMatch = scope.siteIds.includes(obligation.site_id)
    const catMatch = scope.categories === null || scope.categories.includes(obligation.category)
    canRecord = siteMatch && catMatch
  }

  const canEdit = ['ast_lead', 'safety_officer'].includes(profile.role)

  const records: any[] = obligation.compliance_records ?? []

  // Generate signed URLs for evidence files
  const evidenceUrls: Record<string, string> = {}
  for (const rec of records) {
    if (rec.evidence_path) {
      const url = await getComplianceEvidenceUrl(rec.evidence_path)
      if (url) evidenceUrls[rec.id] = url
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/compliance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Compliance Register
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RAGBadge status={obligation.rag} />
            <span className="text-xs text-gray-500">{CATEGORY_LABELS[obligation.category] ?? obligation.category}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{obligation.name}</h1>
          {obligation.site && (
            <p className="text-sm text-gray-500 mt-1">{obligation.site.name}</p>
          )}
        </div>
        {canEdit && (
          <Link href={`/compliance/${id}/edit`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Edit className="w-3.5 h-3.5" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      {/* Details card */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Frequency</p>
            <p className="font-medium">{formatFrequency(obligation)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Next due</p>
            <p className={`font-medium ${
              obligation.rag === 'red' ? 'text-red-600' :
              obligation.rag === 'amber' ? 'text-amber-600' : 'text-gray-900'
            }`}>
              {obligation.next_due_at
                ? `${format(new Date(obligation.next_due_at), 'd MMM yyyy')} (${formatDueLabel(new Date(obligation.next_due_at))})`
                : 'No records yet'}
            </p>
          </div>
          {obligation.legislation_ref && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Legislation</p>
              <p className="text-gray-700">{obligation.legislation_ref}</p>
            </div>
          )}
          {obligation.description && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Description</p>
              <p className="text-gray-700">{obligation.description}</p>
            </div>
          )}
          {obligation.instructions && (
            <div className="col-span-2 rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs text-blue-600 uppercase tracking-wide font-medium mb-1">How to complete</p>
              <p className="text-sm text-blue-900 whitespace-pre-line">{obligation.instructions}</p>
            </div>
          )}
          {obligation.buildings && obligation.buildings.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Buildings covered
              </p>
              <p className="text-gray-700">{obligation.buildings.map((b: any) => b.name).join(', ')}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Amber warning</p>
            <p className="text-gray-700">{obligation.notice_days} days before due</p>
          </div>
          {obligation.red_days > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Red warning</p>
              <p className="text-gray-700">{obligation.red_days} days before due</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Assigned to
            </p>
            {canEdit ? (
              <AssignOwnerSelect
                obligationId={id}
                currentProfileId={obligation.owner_profile_id ?? null}
                profiles={profiles ?? []}
              />
            ) : (obligation.owner_profile || obligation.owner_role) ? (
              <p className="text-gray-700 text-sm">
                {obligation.owner_profile
                  ? (obligation.owner_profile.display_name || obligation.owner_profile.full_name)
                  : null}
                {obligation.owner_profile && obligation.owner_role && (
                  <span className="text-gray-400 ml-1">
                    ({obligation.owner_role.replace(/_/g, ' ')})
                  </span>
                )}
                {!obligation.owner_profile && obligation.owner_role && (
                  <span className="capitalize">{obligation.owner_role.replace(/_/g, ' ')}</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-400">Unassigned</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record completion */}
      {canRecord && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Record completion</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordForm obligationId={id} selfCompleted={obligation.self_completed} />
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Completion history ({records.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 pb-4">No records yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {records.map((rec: any) => (
                <div key={rec.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {format(new Date(rec.completed_at), 'd MMM yyyy')}
                        </span>
                        {!obligation.self_completed && rec.contractor_name && (
                          <span className="text-gray-500 text-xs">· {rec.contractor_name}</span>
                        )}
                        {!obligation.self_completed && rec.certificate_ref && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            Ref: {rec.certificate_ref}
                          </span>
                        )}
                        {!obligation.self_completed && rec.expiry_date && (
                          <span className="text-xs text-gray-500">
                            Expires: {format(new Date(rec.expiry_date), 'd MMM yyyy')}
                          </span>
                        )}
                      </div>
                      {rec.completed_profile && (
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {rec.completed_profile.display_name ?? rec.completed_profile.full_name}
                        </p>
                      )}
                      {rec.notes && <p className="text-gray-600 mt-1">{rec.notes}</p>}
                    </div>
                    {evidenceUrls[rec.id] && (
                      <a
                        href={evidenceUrls[rec.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 flex-shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Evidence
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
