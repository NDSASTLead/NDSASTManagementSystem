'use client'

import { useState, useTransition } from 'react'
import { updateTaskStatus, assignTask } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { TaskWithRelations, Profile, TaskStatus } from '@/lib/supabase/types'

interface Props {
  task: TaskWithRelations
  currentProfile: Profile
  assignableProfiles: { id: string; full_name: string }[]
}

interface PendingAction {
  label: string           // e.g. "Mark as in progress"
  confirmLabel: string    // Button label e.g. "Confirm"
  colour: 'blue' | 'green' | 'red' | 'orange' | 'purple'
  commentPlaceholder: string
  onConfirm: (comment: string) => Promise<void>
}

const COLOUR_MAP = {
  blue:   'border-blue-200 bg-blue-50 text-blue-900',
  green:  'border-green-200 bg-green-50 text-green-900',
  red:    'border-red-200 bg-red-50 text-red-900',
  orange: 'border-orange-200 bg-orange-50 text-orange-900',
  purple: 'border-purple-200 bg-purple-50 text-purple-900',
}

const BTN_COLOUR_MAP = {
  blue:   'bg-blue-600 hover:bg-blue-700',
  green:  'bg-green-600 hover:bg-green-700',
  red:    'bg-red-600 hover:bg-red-700',
  orange: 'bg-orange-500 hover:bg-orange-600',
  purple: 'bg-purple-700 hover:bg-purple-800',
}

export function TaskActions({ task, currentProfile, assignableProfiles }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [comment, setComment] = useState('')
  const [pendingAssignee, setPendingAssignee] = useState<string | null>(null)

  if (task.status === 'complete' || task.status === 'cancelled') return null

  const isAstLead = currentProfile.role === 'ast_lead'
  const isAssignedToMe = task.assigned_to === currentProfile.id
  const canAct = isAssignedToMe || isAstLead

  function openAction(action: PendingAction) {
    setComment('')
    setPendingAction(action)
  }

  function cancelAction() {
    setPendingAction(null)
    setComment('')
    setPendingAssignee(null)
  }

  function confirmAction() {
    if (!pendingAction || !comment.trim()) return
    startTransition(async () => {
      await pendingAction.onConfirm(comment.trim())
      setPendingAction(null)
      setComment('')
      setPendingAssignee(null)
    })
  }

  // ── Action definitions ──────────────────────────────────────────────────

  function startAction(): PendingAction {
    return {
      label: "Mark as in progress",
      confirmLabel: "Start task",
      colour: 'blue',
      commentPlaceholder: "e.g. Started work on this today — need to order a part first.",
      onConfirm: async (c) => {
        const result = await updateTaskStatus(task.id, 'in_progress', c)
        if (result?.error) toast.error(result.error)
        else toast.success('Task started')
      },
    }
  }

  function holdAction(): PendingAction {
    return {
      label: "Put on hold",
      confirmLabel: "Put on hold",
      colour: 'orange',
      commentPlaceholder: "e.g. Waiting for parts — will resume next week.",
      onConfirm: async (c) => {
        const result = await updateTaskStatus(task.id, 'assigned', c)
        if (result?.error) toast.error(result.error)
        else toast.success('Task put on hold')
      },
    }
  }

  function completeAction(): PendingAction {
    return {
      label: "Mark as complete",
      confirmLabel: "Mark complete",
      colour: 'green',
      commentPlaceholder: "e.g. Fixed the latch. Replaced the hinge — parts cost £12 from Screwfix.",
      onConfirm: async (c) => {
        const newStatus: TaskStatus = isAstLead ? 'complete' : 'pending_review'
        const result = await updateTaskStatus(task.id, newStatus, c, c)
        if (result?.error) toast.error(result.error)
        else toast.success(isAstLead ? 'Task marked complete' : 'Sent for review')
      },
    }
  }

  function signOffAction(): PendingAction {
    return {
      label: "Sign off as complete",
      confirmLabel: "Sign off",
      colour: 'green',
      commentPlaceholder: "e.g. Checked and confirmed — good to go.",
      onConfirm: async (c) => {
        const result = await updateTaskStatus(task.id, 'complete', c)
        if (result?.error) toast.error(result.error)
        else toast.success('Task signed off as complete')
      },
    }
  }

  function sendBackAction(): PendingAction {
    return {
      label: "Send back for rework",
      confirmLabel: "Send back",
      colour: 'orange',
      commentPlaceholder: "e.g. The repair isn't holding — please revisit and re-tighten the fittings.",
      onConfirm: async (c) => {
        const result = await updateTaskStatus(task.id, 'in_progress', c)
        if (result?.error) toast.error(result.error)
        else toast.success('Task sent back for rework')
      },
    }
  }

  function cancelTaskAction(): PendingAction {
    return {
      label: "Cancel this task",
      confirmLabel: "Cancel task",
      colour: 'red',
      commentPlaceholder: "e.g. No longer required — issue resolved another way.",
      onConfirm: async (c) => {
        const result = await updateTaskStatus(task.id, 'cancelled', c)
        if (result?.error) toast.error(result.error)
        else toast.success('Task cancelled')
      },
    }
  }

  function assignAction(assigneeId: string | null, assigneeName: string): PendingAction {
    return {
      label: assigneeId
        ? `Assign to ${assigneeName}`
        : 'Remove assignment',
      confirmLabel: assigneeId ? 'Assign' : 'Unassign',
      colour: 'purple',
      commentPlaceholder: assigneeId
        ? `e.g. ${assigneeName} has the skills for this — please action by Friday.`
        : "e.g. Removing assignment — will reassign once available.",
      onConfirm: async (c) => {
        const result = await assignTask(task.id, assigneeId, c)
        if (result?.error) toast.error(result.error)
        else toast.success(assigneeId ? `Assigned to ${assigneeName}` : 'Assignment removed')
      },
    }
  }

  // ── Confirm panel ───────────────────────────────────────────────────────

  if (pendingAction) {
    const colours = COLOUR_MAP[pendingAction.colour]
    const btnColour = BTN_COLOUR_MAP[pendingAction.colour]
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`rounded-lg border p-4 space-y-3 ${colours}`}>
            <p className="text-sm font-semibold">{pendingAction.label}</p>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Note <span className="text-red-500">*</span>{' '}
                <span className="font-normal text-gray-400">(required)</span>
              </label>
              <Textarea
                autoFocus
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={pendingAction.commentPlaceholder}
                className="min-h-[80px] bg-white text-gray-900 border-white/60"
              />
            </div>
            <div className="flex gap-2">
              <Button
                className={`flex-1 h-10 text-sm text-white ${btnColour}`}
                disabled={!comment.trim() || isPending}
                onClick={confirmAction}
              >
                {isPending ? 'Saving…' : pendingAction.confirmLabel}
              </Button>
              <Button
                variant="ghost"
                className="h-10 text-sm"
                disabled={isPending}
                onClick={cancelAction}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Normal actions view ─────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Assignment — ast_lead only */}
        {isAstLead && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Assign to</p>
            <Select
              value={task.assigned_to ?? 'unassigned'}
              onValueChange={(val) => {
                const assigneeId = val === 'unassigned' ? null : val
                const assigneeName = assignableProfiles.find(p => p.id === val)?.full_name ?? ''
                openAction(assignAction(assigneeId, assigneeName))
              }}
              disabled={isPending}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Choose a person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">— Unassigned —</SelectItem>
                {assignableProfiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status actions */}
        {canAct && (
          <div className="flex flex-col gap-2">

            {/* open or assigned → in_progress */}
            {(task.status === 'open' || task.status === 'assigned') && (
              <Button
                variant="outline"
                className="h-11 text-base border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => openAction(startAction())}
                disabled={isPending}
              >
                I&apos;ve started this
              </Button>
            )}

            {/* in_progress → put on hold (back to assigned) */}
            {task.status === 'in_progress' && isAstLead && (
              <Button
                variant="outline"
                className="h-11 text-base border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={() => openAction(holdAction())}
                disabled={isPending}
              >
                Put on hold
              </Button>
            )}

            {/* in_progress → complete / pending_review */}
            {(task.status === 'assigned' || task.status === 'in_progress') && (
              <Button
                className="h-11 text-base bg-green-600 hover:bg-green-700"
                onClick={() => openAction(completeAction())}
                disabled={isPending}
              >
                I&apos;ve completed this
              </Button>
            )}

            {/* pending_review → complete (ast_lead sign-off) */}
            {isAstLead && task.status === 'pending_review' && (
              <Button
                className="h-11 text-base bg-green-600 hover:bg-green-700"
                onClick={() => openAction(signOffAction())}
                disabled={isPending}
              >
                Sign off as complete
              </Button>
            )}

            {/* pending_review → in_progress (send back) */}
            {isAstLead && task.status === 'pending_review' && (
              <Button
                variant="outline"
                className="h-11 text-base border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={() => openAction(sendBackAction())}
                disabled={isPending}
              >
                Send back for rework
              </Button>
            )}

            {/* Cancel — ast_lead only */}
            {isAstLead && (
              <Button
                variant="ghost"
                className="h-10 text-sm text-gray-400 hover:text-red-600 mt-1"
                onClick={() => openAction(cancelTaskAction())}
                disabled={isPending}
              >
                Cancel task
              </Button>
            )}
          </div>
        )}

        {!canAct && !isAstLead && (
          <p className="text-sm text-gray-500 text-center py-2">
            This task is assigned to someone else. Contact your AST lead to reassign it.
          </p>
        )}

      </CardContent>
    </Card>
  )
}
