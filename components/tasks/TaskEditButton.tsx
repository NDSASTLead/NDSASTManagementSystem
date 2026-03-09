'use client'

import { useState, useTransition } from 'react'
import { updateTask } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TaskWithRelations, Profile } from '@/lib/supabase/types'

interface Building { id: string; site_id: string; name: string }
interface Category { id: string; name: string }

interface Props {
  task: TaskWithRelations
  currentProfile: Profile
  buildings: Building[]
  categories: Category[]
}

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'It can wait',      colour: 'border-gray-200 bg-white hover:bg-gray-50' },
  { value: 'medium',   label: 'Needs doing soon',  colour: 'border-blue-200 bg-blue-50 hover:bg-blue-100' },
  { value: 'high',     label: 'Urgent',            colour: 'border-orange-200 bg-orange-50 hover:bg-orange-100' },
  { value: 'critical', label: 'Safety issue',      colour: 'border-red-300 bg-red-50 hover:bg-red-100' },
]

export function TaskEditButton({ task, currentProfile, buildings, categories }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isAstLead = currentProfile.role === 'ast_lead'

  // Form state — pre-populated from current task
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState(task.priority)
  const [buildingId, setBuildingId] = useState(task.building_id ?? '')
  const [categoryId, setCategoryId] = useState(task.category_id ?? '')
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [isCompliance, setIsCompliance] = useState(task.is_compliance)
  const [taskType, setTaskType] = useState(task.task_type)

  function resetForm() {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setPriority(task.priority)
    setBuildingId(task.building_id ?? '')
    setCategoryId(task.category_id ?? '')
    setDueDate(task.due_date ?? '')
    setIsCompliance(task.is_compliance)
    setTaskType(task.task_type)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm()
    setOpen(next)
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateTask(task.id, {
        title,
        description: description || undefined,
        priority: priority as 'low' | 'medium' | 'high' | 'critical',
        building_id: buildingId || undefined,
        category_id: categoryId || undefined,
        due_date: dueDate || undefined,
        is_compliance: isCompliance,
        task_type: taskType as 'scheduled' | 'reactive',
      })

      if (result?.error) {
        setError(result.error)
      } else {
        toast.success('Task updated')
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 text-sm text-purple-700 hover:text-purple-900 hover:bg-purple-50 px-2 py-1 rounded-md transition-colors"
          aria-label="Edit task"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title — all roles */}
          <div>
            <Label htmlFor="edit-title" className="text-sm font-medium">
              Problem description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Fire door on corridor won't close properly"
              className="mt-1 text-base min-h-[80px] resize-none"
            />
          </div>

          {/* Description — all roles */}
          <div>
            <Label htmlFor="edit-description" className="text-sm font-medium">
              More detail <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. It's on the left as you enter from the car park. The latch is broken."
              className="mt-1 text-base min-h-[70px] resize-none"
            />
          </div>

          {/* AST Lead only fields */}
          {isAstLead && (
            <>
              {/* Priority */}
              <div>
                <Label className="text-sm font-medium">How urgent?</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value as typeof priority)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg border-2 text-left transition-all text-sm',
                        opt.colour,
                        priority === opt.value ? 'ring-2 ring-purple-500 ring-offset-1' : ''
                      )}
                    >
                      <span className="font-medium text-gray-900">{opt.label}</span>
                      {priority === opt.value && (
                        <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 ml-2">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Building + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">
                    Building <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Select value={buildingId || 'none'} onValueChange={v => setBuildingId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {buildings.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Category <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Select value={categoryId || 'none'} onValueChange={v => setCategoryId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="mt-1 h-10">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Due date */}
              <div>
                <Label htmlFor="edit-due-date" className="text-sm font-medium">
                  Due date <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>

              {/* Compliance + Task type */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCompliance}
                    onChange={e => setIsCompliance(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium">Compliance task</span>
                </label>

                <div>
                  <Label className="text-sm font-medium">Task type</Label>
                  <div className="flex gap-3 mt-1.5">
                    {(['reactive', 'scheduled'] as const).map(t => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer text-sm select-none">
                        <input
                          type="radio"
                          name="task_type"
                          value={t}
                          checked={taskType === t}
                          onChange={() => setTaskType(t)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="capitalize">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            onClick={handleSave}
            disabled={isPending || !title.trim()}
            className="bg-purple-700 hover:bg-purple-800"
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
