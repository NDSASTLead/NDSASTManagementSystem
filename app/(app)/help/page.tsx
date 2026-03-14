import { HelpCircle, ArrowRight } from 'lucide-react'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { redirect } from 'next/navigation'

// ── Inline status pill ──────────────────────────────────────────────────────
function Status({ label, colour }: { label: string; colour: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${colour}`}>
      {label}
    </span>
  )
}

// ── Button display ───────────────────────────────────────────────────────────
function Btn({ label, variant = 'default' }: { label: string; variant?: 'primary' | 'default' | 'danger' }) {
  const cls =
    variant === 'primary'
      ? 'bg-purple-700 text-white border-purple-700'
      : variant === 'danger'
      ? 'bg-red-50 text-red-700 border-red-300'
      : 'bg-white text-gray-800 border-gray-300'
  return (
    <span className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold border shadow-sm ${cls}`}>
      {label}
    </span>
  )
}

// ── Action card ──────────────────────────────────────────────────────────────
function ActionCard({
  button,
  variant = 'default',
  who,
  description,
  note,
  from,
  to,
}: {
  button: string
  variant?: 'primary' | 'default' | 'danger'
  who: string
  description: string
  note?: string
  from?: { label: string; colour: string }
  to?: { label: string; colour: string }
}) {
  return (
    <div className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
      {/* Button col */}
      <div className="w-48 shrink-0 flex flex-col gap-2 pt-0.5">
        <Btn label={button} variant={variant} />
        {from && to && (
          <div className="flex items-center gap-1 flex-wrap">
            <Status {...from} />
            <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
            <Status {...to} />
          </div>
        )}
      </div>
      {/* Detail col */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{who}</p>
        <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
        {note && (
          <p className="text-xs text-gray-400 italic">{note}</p>
        )}
      </div>
    </div>
  )
}

// ── Role section ─────────────────────────────────────────────────────────────
function RoleSection({ role, colour, actions }: { role: string; colour: string; actions: string[] }) {
  return (
    <div className={`rounded-xl border p-4 ${colour}`}>
      <p className="font-semibold text-sm mb-2">{role}</p>
      <ul className="space-y-1">
        {actions.map(a => (
          <li key={a} className="flex items-start gap-2 text-xs text-gray-700">
            <span className="mt-0.5 text-gray-400 shrink-0">•</span>
            {a}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function HelpPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-10 pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-purple-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">How it works</h1>
          <p className="text-sm text-gray-500">What each button does and who can press it</p>
        </div>
      </div>

      {/* ── Button reference ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Task buttons</h2>
        <p className="text-sm text-gray-500 mb-4">
          Every status change requires a short note before it saves — this creates an audit trail of what happened and why.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4">

          <ActionCard
            button="Report a problem"
            variant="primary"
            who="Anyone (no login needed via QR code; logged-in for the full form)"
            description="Opens the report form. Fill in the location, describe the problem, and set a priority. Logged-in users can also set a due date and category."
            from={{ label: '—', colour: 'text-gray-400 border-gray-200 bg-gray-50' }}
            to={{ label: 'Open', colour: 'bg-gray-100 text-gray-700 border-gray-300' }}
          />

          <ActionCard
            button="Assign to →"
            who="AST Lead · Safety Officer"
            description="Pick a person from the dropdown to assign them to the task. They'll see it in their task list. You must add a note — include what you need them to do and by when."
            note="Tip: you can reassign at any time — just pick a different person."
            from={{ label: 'Open', colour: 'bg-gray-100 text-gray-700 border-gray-300' }}
            to={{ label: 'Assigned', colour: 'bg-blue-100 text-blue-700 border-blue-200' }}
          />

          <ActionCard
            button="I've started this"
            who="Assignee · AST Lead · Safety Officer"
            description="Tells the team you've physically begun the work. Use it when you arrive on site or start investigating, so nobody else thinks it is still waiting."
            from={{ label: 'Assigned', colour: 'bg-blue-100 text-blue-700 border-blue-200' }}
            to={{ label: 'In Progress', colour: 'bg-yellow-100 text-yellow-700 border-yellow-200' }}
          />

          <ActionCard
            button="I've completed this"
            who="Assignee · AST Lead · Safety Officer"
            description="Marks the work as finished. Describe exactly what was done — include any parts used, costs, or anything the site owner should know."
            note="Volunteers & Responsible Persons: task moves to Waiting for Review for sign-off. AST Lead & Safety Officer: task closes immediately."
            from={{ label: 'In Progress', colour: 'bg-yellow-100 text-yellow-700 border-yellow-200' }}
            to={{ label: 'Complete / Review', colour: 'bg-purple-100 text-purple-700 border-purple-200' }}
          />

          <ActionCard
            button="Sign off as complete"
            who="AST Lead · Safety Officer"
            description="Confirms the work meets the required standard and closes the task. Check any completion notes and photos before signing off. Add a short confirmation — e.g. 'Checked on site — all good.'"
            from={{ label: 'Waiting for review', colour: 'bg-purple-100 text-purple-700 border-purple-200' }}
            to={{ label: 'Complete', colour: 'bg-green-100 text-green-700 border-green-200' }}
          />

          <ActionCard
            button="Send back for rework"
            who="AST Lead · Safety Officer"
            description="Returns the task to In Progress when the work is not finished or not up to standard. Be specific in your note about what still needs to be done so the assignee knows exactly what's expected."
            from={{ label: 'Waiting for review', colour: 'bg-purple-100 text-purple-700 border-purple-200' }}
            to={{ label: 'In Progress', colour: 'bg-yellow-100 text-yellow-700 border-yellow-200' }}
          />

          <ActionCard
            button="Put on hold"
            who="AST Lead · Safety Officer"
            description="Pauses active work and returns the task to Assigned. Use this when progress is blocked — e.g. waiting for parts, a contractor, or further information. Note the reason so the team knows what is being waited on."
            from={{ label: 'In Progress', colour: 'bg-yellow-100 text-yellow-700 border-yellow-200' }}
            to={{ label: 'Assigned', colour: 'bg-blue-100 text-blue-700 border-blue-200' }}
          />

          <ActionCard
            button="Cancel task"
            variant="danger"
            who="AST Lead only"
            description="Permanently closes the task without completing it. Use when the problem no longer exists, was resolved another way, or was logged in error. A reason is required and cannot be undone."
            note="Cancelled tasks are kept in the record — they are never deleted."
          />

        </div>
      </section>

      {/* ── Roles ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Roles &amp; permissions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RoleSection
            role="Volunteer"
            colour="bg-gray-50 border-gray-200"
            actions={[
              'Report problems (app or QR code)',
              'View tasks at their assigned site(s)',
              'Start and complete tasks assigned to them',
              'Add comments and upload photos',
            ]}
          />
          <RoleSection
            role="Responsible Person"
            colour="bg-orange-50 border-orange-200"
            actions={[
              'Everything a Volunteer can do',
              'View compliance obligations for their site(s) or category',
              'Record completion of compliance checks',
            ]}
          />
          <RoleSection
            role="Safety Officer"
            colour="bg-yellow-50 border-yellow-200"
            actions={[
              'Assign and manage tasks',
              'Sign off and cancel tasks',
              'Full access to the Compliance Register',
              'Add and edit compliance obligations',
              'Manage maintenance templates',
            ]}
          />
          <RoleSection
            role="AST Lead"
            colour="bg-purple-50 border-purple-200"
            actions={[
              'Everything a Safety Officer can do',
              'Invite and manage team members',
              'Manage buildings & areas in Settings',
              'Access reports',
            ]}
          />
          <RoleSection
            role="Trustee"
            colour="bg-blue-50 border-blue-200"
            actions={[
              'View all tasks and compliance data (read only)',
              'Cannot create, edit, or change status',
            ]}
          />
        </div>
      </section>

    </div>
  )
}
