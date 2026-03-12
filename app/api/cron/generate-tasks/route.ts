import { NextRequest, NextResponse } from 'next/server'
import { generateTasksFromTemplates } from '@/lib/actions/maintenance-templates'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await generateTasksFromTemplates()
    return NextResponse.json({
      generated: result.generated,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('generate-tasks cron error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
