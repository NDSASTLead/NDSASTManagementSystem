import { NextRequest, NextResponse } from 'next/server'
import { generateTasksFromTemplates } from '@/lib/actions/maintenance-templates'
import { runOverdueChecks } from '@/lib/notifications/overdue'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const [generated, overdue] = await Promise.all([
      generateTasksFromTemplates(),
      runOverdueChecks(),
    ])
    return NextResponse.json({
      generated: generated.generated,
      tasksNotified: overdue.tasksNotified,
      complianceNotified: overdue.complianceNotified,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('cron error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
