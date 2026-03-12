import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { createClient } from '@/lib/supabase/server'
import { ObligationForm } from '@/components/compliance/ObligationForm'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewCompliancePage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!['ast_lead', 'safety_officer'].includes(profile.role)) redirect('/compliance')

  const supabase = await createClient()
  const [{ data: sites }, { data: buildings }, { data: profiles }] = await Promise.all([
    supabase.from('sites').select('*').eq('is_active', true).order('name'),
    supabase.from('buildings').select('*').eq('is_active', true).order('name'),
    supabase.from('profiles').select('id, full_name, display_name').eq('is_active', true).order('full_name'),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/compliance" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Compliance Register
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add compliance obligation</h1>
        <p className="text-gray-500 text-sm mt-1">Define a new legal or operational duty that must be performed on a schedule.</p>
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
          />
        </CardContent>
      </Card>
    </div>
  )
}
