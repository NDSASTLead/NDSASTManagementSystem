'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronRight, Plus, ToggleLeft, ToggleRight, Pencil, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addTemplate, updateTemplate, toggleTemplateActive } from '@/lib/actions/maintenance-templates'
import { toast } from 'sonner'
import type { Site, Building, MaintenanceTemplate } from '@/lib/supabase/types'

interface Props {
  sites: (Site & { buildings: Building[]; templates: MaintenanceTemplate[] })[]
}

const FREQUENCIES = [
  { value: 'daily',     label: 'Daily' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual',  label: 'Every 6 months' },
  { value: 'annual',    label: 'Annual' },
  { value: '5_yearly',  label: 'Every 5 years' },
  { value: 'custom',    label: 'Custom' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const ROLES = [
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'responsible_person', label: 'Responsible Person' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'ast_member', label: 'AST Member' },
  { value: 'ast_lead', label: 'AST Lead' },
]

interface TemplateFormState {
  title: string
  description: string
  building_id: string
  priority: string
  frequency: string
  frequency_days: string
  notice_days: string
  is_compliance: boolean
  legislation_ref: string
  assign_to_role: string
}

const emptyForm = (): TemplateFormState => ({
  title: '', description: '', building_id: '', priority: 'medium',
  frequency: 'monthly', frequency_days: '', notice_days: '14',
  is_compliance: false, legislation_ref: '', assign_to_role: '',
})

function TemplateForm({
  siteId,
  buildings,
  initial,
  onSave,
  onCancel,
}: {
  siteId: string
  buildings: Building[]
  initial?: TemplateFormState
  onSave: (data: TemplateFormState) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<TemplateFormState>(initial ?? emptyForm())
  const [pending, startTransition] = useTransition()

  const set = (k: keyof TemplateFormState) => (v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const submit = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    startTransition(async () => { await onSave(form) })
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
      <div>
        <Label className="text-xs font-medium text-gray-600">Title *</Label>
        <Input
          value={form.title}
          onChange={e => set('title')(e.target.value)}
          placeholder="e.g. Monthly boiler inspection"
          className="mt-1 h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-gray-600">Frequency</Label>
          <Select value={form.frequency} onValueChange={set('frequency')}>
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.frequency === 'custom' && (
          <div>
            <Label className="text-xs font-medium text-gray-600">Days</Label>
            <Input
              type="number" min="1"
              value={form.frequency_days}
              onChange={e => set('frequency_days')(e.target.value)}
              placeholder="e.g. 90"
              className="mt-1 h-8 text-sm"
            />
          </div>
        )}
        <div>
          <Label className="text-xs font-medium text-gray-600">Notice (days)</Label>
          <Input
            type="number" min="0"
            value={form.notice_days}
            onChange={e => set('notice_days')(e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-600">Priority</Label>
          <Select value={form.priority} onValueChange={set('priority')}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {buildings.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-gray-600">Building (optional)</Label>
          <Select value={form.building_id || '_none'} onValueChange={v => set('building_id')(v === '_none' ? '' : v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="All buildings" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">All buildings</SelectItem>
              {buildings.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs font-medium text-gray-600">Assign to role (optional)</Label>
        <Select value={form.assign_to_role || '_none'} onValueChange={v => set('assign_to_role')(v === '_none' ? '' : v)}>
          <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Any role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Any role</SelectItem>
            {ROLES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-600">Description (optional)</Label>
        <Textarea
          value={form.description}
          onChange={e => set('description')(e.target.value)}
          rows={2}
          className="mt-1 text-sm resize-none"
          placeholder="Instructions, notes, what to check..."
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
          <input
            type="checkbox"
            checked={form.is_compliance}
            onChange={e => set('is_compliance')(e.target.checked)}
            className="rounded"
          />
          This is a compliance/legal obligation
        </label>
      </div>

      {form.is_compliance && (
        <div>
          <Label className="text-xs font-medium text-gray-600">Legislation reference</Label>
          <Input
            value={form.legislation_ref}
            onChange={e => set('legislation_ref')(e.target.value)}
            placeholder="e.g. Electricity at Work Regs 1989"
            className="mt-1 h-8 text-sm"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={submit}
          disabled={pending}
          className="bg-purple-700 hover:bg-purple-800 h-8"
        >
          <Check className="w-3.5 h-3.5 mr-1" />
          {pending ? 'Saving…' : 'Save template'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8">
          <X className="w-3.5 h-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

function SiteSection({
  site,
}: {
  site: Props['sites'][number]
}) {
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleAdd = async (form: TemplateFormState) => {
    const res = await addTemplate({
      site_id: site.id,
      title: form.title,
      description: form.description || null,
      building_id: form.building_id || null,
      priority: form.priority as any,
      frequency: form.frequency as any,
      frequency_days: form.frequency_days ? parseInt(form.frequency_days) : null,
      notice_days: parseInt(form.notice_days) || 14,
      is_compliance: form.is_compliance,
      legislation_ref: form.legislation_ref || null,
      assign_to_role: (form.assign_to_role || null) as any,
    })
    if (res?.error) { toast.error(res.error); return }
    toast.success('Template added')
    setAdding(false)
  }

  const handleEdit = async (id: string, form: TemplateFormState) => {
    const res = await updateTemplate(id, {
      title: form.title,
      description: form.description || null,
      building_id: form.building_id || null,
      priority: form.priority as any,
      frequency: form.frequency as any,
      frequency_days: form.frequency_days ? parseInt(form.frequency_days) : null,
      notice_days: parseInt(form.notice_days) || 14,
      is_compliance: form.is_compliance,
      legislation_ref: form.legislation_ref || null,
      assign_to_role: (form.assign_to_role || null) as any,
    })
    if (res?.error) { toast.error(res.error); return }
    toast.success('Template updated')
    setEditingId(null)
  }

  const handleToggle = (id: string, active: boolean) => {
    startTransition(async () => {
      const res = await toggleTemplateActive(id, !active)
      if (res?.error) toast.error(res.error)
      else toast.success(!active ? 'Template activated' : 'Template paused')
    })
  }

  const FREQ_LABELS: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly',
    biannual: '6-monthly', annual: 'Annual', '5_yearly': '5-yearly',
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <span className="font-medium text-gray-900">{site.name}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {site.templates.length} template{site.templates.length !== 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {site.templates.map(t => (
            <div key={t.id}>
              {editingId === t.id ? (
                <div className="p-3">
                  <TemplateForm
                    siteId={site.id}
                    buildings={site.buildings}
                    initial={{
                      title: t.title,
                      description: t.description ?? '',
                      building_id: t.building_id ?? '',
                      priority: t.priority,
                      frequency: t.frequency,
                      frequency_days: t.frequency_days?.toString() ?? '',
                      notice_days: t.notice_days.toString(),
                      is_compliance: t.is_compliance,
                      legislation_ref: t.legislation_ref ?? '',
                      assign_to_role: t.assign_to_role ?? '',
                    }}
                    onSave={(form) => handleEdit(t.id, form)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${t.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {t.title}
                      </span>
                      {t.is_compliance && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">Compliance</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {FREQ_LABELS[t.frequency] ?? t.frequency}
                        {t.frequency === 'custom' && t.frequency_days ? ` (${t.frequency_days}d)` : ''}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{t.notice_days}d notice</span>
                      {t.assign_to_role && (
                        <>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400 capitalize">{t.assign_to_role.replace(/_/g, ' ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setEditingId(t.id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => handleToggle(t.id, t.is_active)}
                      className={`h-7 w-7 p-0 ${t.is_active ? 'text-green-600' : 'text-gray-300'}`}
                    >
                      {t.is_active
                        ? <ToggleRight className="w-4 h-4" />
                        : <ToggleLeft className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {adding ? (
            <div className="p-3">
              <TemplateForm
                siteId={site.id}
                buildings={site.buildings}
                onSave={handleAdd}
                onCancel={() => setAdding(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add template
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function MaintenanceTemplatesManager({ sites }: Props) {
  if (sites.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
        No active sites found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sites.map(site => (
        <SiteSection key={site.id} site={site} />
      ))}
    </div>
  )
}
