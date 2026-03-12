import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { getComplianceObligation } from '@/lib/actions/compliance'
import { createClient } from '@/lib/supabase/server'
import { ObligationForm } from '@/components/compliance/ObligationForm'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EditCompliancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) redirect(`/compliance/${id}`)

  const obligation = await getComplianceObligation(id)
  if (!obligation) notFound()

  const supabase = await createClient()
  const [{ data: sites }, { data: buildings }, { data: profiles }] = await Promise.all([
    supabase.from('sites').select('*').eq('is_active', true).order('name'),
    supabase.from('buildings').select('*').eq('is_active', true).eq('site_id', obligation.site_id).order('name'),
    supabase.from('profiles').select('id, full_name, display_name').eq('is_active', true).order('full_name'),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/compliance/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to obligation
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit obligation</h1>
        <p className="text-gray-500 text-sm mt-1">{obligation.name}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Obligation details</CardTitle>
        </CardHeader>
        <CardContent>
          <ObligationForm
            sites={sites ?? []}
            buildings={buildings ?? []}
            profiles={profiles ?? []}
            obligation={obligation}
            defaultSiteId={obligation.site_id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
