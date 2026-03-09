import { HelpCircle, ArrowRight, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { redirect } from 'next/navigation'

// ── Inline status pill ──────────────────────────────────────────────────────
function Status({ label, colour }: { label: string; colour: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${colour}`}>
      {label}
    </span>
  )
}

// ── Flow step card ──────────────────────────────────────────────────────────
function FlowStep({
  status,
  colour,
  who,
  description,
  button,
  last = false,
}: {
  status: string
  colour: string
  who: string
  description: string
  button?: string
  last?: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-full rounded-xl border p-4 ${colour}`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-semibold text-sm">{status}</span>
          <span className="text-xs text-gray-500 whitespace-nowrap">{who}</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        {button && (
          <p className="mt-2 text-xs font-medium text-gray-800">
            Button: <span className="italic">"{button}"</span>
          </p>
        )}
      </div>
      {!last && (
        <div className="flex items-center justify-center w-8 h-6 text-gray-300">
          <ArrowDown className="w-4 h-4" />
        </div>
      )}
    </div>
  )
}

// ── Role section ────────────────────────────────────────────────────────────
function RoleSection({
  role,
  colour,
  actions,
}: {
  role: string
  colour: string
  actions: string[]
}) {
  return (
    <div className={`rounded-xl border p-4 ${colour}`}>
      <p className="font-semibold text-sm mb-2">{role}</p>
      <ul className="space-y-1">
        {actions.map(a => (
          <li key={a} className="flex items-start gap-2 text-xs text-gray-700">
            <span className="mt-0.5 text-gray-400 flex-shrink-0">•</span>
            {a}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── How-to row ──────────────────────────────────────────────────────────────
function HowTo({ goal, steps }: { goal: string; steps: string[] }) {
  return (
    <div className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
      <p className="text-sm font-semibold text-gray-900 mb-2">{goal}</p>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
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
          <p className="text-sm text-gray-500">Task flow, roles, and what each button does</p>
        </div>
      </div>

      {/* ── Task lifecycle ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Task lifecycle</h2>
        <p className="text-sm text-gray-500 mb-5">
          Every maintenance issue follows the same path from report through to sign-off.
        </p>

        <div className="flex flex-col gap-0">
          <FlowStep
            status="Open"
            colour="bg-gray-50 border-gray-200"
            who="Anyone"
            description="A problem has been reported — either by a logged-in user via the app, or by a visitor via the public QR-code link. No one has been assigned yet."
          />
          <FlowStep
            status="Assigned"
            colour="bg-blue-50 border-blue-200"
            who="AST Lead assigns"
            description='An AST Lead selects a person from the "Assign to" dropdown on the task. They must add a note explaining the assignment. The assignee can now see the task on their list.'
            button="Assign to → [select name]"
          />
          <FlowStep
            status="In Progress"
            colour="bg-yellow-50 border-yellow-200"
            who="Assignee or AST Lead"
            description="The assignee has started working on the task. They press the button when they physically begin, so the team knows it is being actively worked on."
            button="I've started this"
          />
          <FlowStep
            status="Waiting for review"
            colour="bg-purple-50 border-purple-200"
            who="Assignee completes"
            description={"The assignee has finished the work and pressed \"I've completed this\". Their note describes exactly what was done. The task now waits for an AST Lead to check and sign it off. AST Leads skip this step and go straight to Complete."}
            button="I've completed this"
          />
          <FlowStep
            status="Complete"
            colour="bg-green-50 border-green-200"
            who="AST Lead signs off"
            description='An AST Lead has reviewed the work and confirmed it is done. They press "Sign off as complete" and add a confirmation note. The task is now closed.'
            button="Sign off as complete"
            last
          />
        </div>

        {/* Side paths */}
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other transitions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs">
              <p className="font-semibold text-orange-800 mb-1">Put on hold</p>
              <p className="text-gray-600">
                <Status label="In Progress" colour="bg-yellow-100 text-yellow-700 border-yellow-200" />
                {' '}<ArrowRight className="inline w-3 h-3" />{' '}
                <Status label="Assigned" colour="bg-blue-100 text-blue-700 border-blue-200" />
              </p>
              <p className="mt-1.5 text-gray-600">AST Lead can pause work and return the task to Assigned — e.g. waiting for parts.</p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs">
              <p className="font-semibold text-orange-800 mb-1">Send back for rework</p>
              <p className="text-gray-600">
                <Status label="Waiting for review" colour="bg-purple-100 text-purple-700 border-purple-200" />
                {' '}<ArrowRight className="inline w-3 h-3" />{' '}
                <Status label="In Progress" colour="bg-yellow-100 text-yellow-700 border-yellow-200" />
              </p>
              <p className="mt-1.5 text-gray-600">AST Lead inspects the work and decides it needs more attention before sign-off.</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs sm:col-span-2">
              <p className="font-semibold text-red-700 mb-1">Cancel task</p>
              <p className="text-gray-600">AST Lead only. Closes the task permanently — e.g. the problem no longer exists or was resolved another way. A reason must be provided.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Roles &amp; what they can do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RoleSection
            role="Volunteer / Site Owner"
            colour="bg-gray-50 border-gray-200"
            actions={[
              'Report a new problem via the app',
              'View tasks at their assigned site(s)',
              'Start and complete tasks assigned to them',
              'Add comments to tasks they can see',
              'Upload photos to tasks',
            ]}
          />
          <RoleSection
            role="AST Lead"
            colour="bg-purple-50 border-purple-200"
            actions={[
              'Everything a Volunteer can do',
              'Assign tasks to any team member',
              'Change task status (put on hold, send back, cancel)',
              'Sign off completed tasks',
              'Manage buildings & areas in Settings',
              'Invite and manage team members',
            ]}
          />
          <RoleSection
            role="Trustee"
            colour="bg-blue-50 border-blue-200"
            actions={[
              'View all tasks across all sites (read only)',
              'Cannot create, edit, or change the status of tasks',
            ]}
          />
        </div>
      </section>

      {/* ── How to ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Common actions — step by step</h2>
        <p className="text-sm text-gray-500 mb-4">
          Every status change and assignment requires you to type a short note before it saves. This creates a history of what happened and why.
        </p>
        <Card>
          <CardContent className="pt-5 space-y-4">
            <HowTo
              goal="Report a problem (public — no login needed)"
              steps={[
                'Scan the QR code at the building, or use the public link from Settings.',
                'Choose the building or area where the problem is.',
                'Describe the problem clearly.',
                'Optionally add your name and a photo.',
                'Tap "Send report".',
              ]}
            />
            <HowTo
              goal="Report a problem (logged in)"
              steps={[
                'Tap "Report a Problem" in the menu.',
                'Fill in the location, description, priority, and optional due date.',
                'Tap "Create task".',
              ]}
            />
            <HowTo
              goal="Assign a task to someone (AST Lead)"
              steps={[
                'Open the task.',
                'Use the "Assign to" dropdown in the Actions card.',
                'Select the person.',
                'Type a note explaining who should do what and by when.',
                'Tap "Assign" to confirm.',
              ]}
            />
            <HowTo
              goal="Start work on a task"
              steps={[
                'Open the task assigned to you.',
                'Tap "I\'ve started this" in the Actions card.',
                'Type a short note — e.g. "Started today, need to check the parts list first."',
                'Tap "Start task" to confirm.',
              ]}
            />
            <HowTo
              goal="Mark a task as complete"
              steps={[
                'Open the task you have finished.',
                'Tap "I\'ve completed this".',
                'Type a note describing exactly what you did — include any parts used or costs.',
                'Tap "Mark complete" to confirm.',
                'If you are a Volunteer or Owner, the task moves to "Waiting for review" for an AST Lead to sign off.',
                'If you are an AST Lead, the task closes immediately.',
              ]}
            />
            <HowTo
              goal="Sign off a completed task (AST Lead)"
              steps={[
                'Open the task showing "Waiting for review".',
                'Check the completion notes and any photos.',
                'Tap "Sign off as complete".',
                'Type a confirmation note — e.g. "Checked on site — all good."',
                'Tap "Sign off" to close the task.',
              ]}
            />
            <HowTo
              goal="Send a task back for rework (AST Lead)"
              steps={[
                'Open the task showing "Waiting for review".',
                'Tap "Send back for rework".',
                'Type a clear explanation of what still needs to be done.',
                'Tap "Send back" — the task returns to "In Progress" for the assignee.',
              ]}
            />
          </CardContent>
        </Card>
      </section>

    </div>
  )
}
