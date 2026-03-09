'use client'

import { useState, useTransition } from 'react'
import { inviteUser } from '@/lib/actions/people'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export function InviteUserForm() {
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState('volunteer')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('role', role)

    startTransition(async () => {
      const result = await inviteUser(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        toast.success(`Invite sent to ${email}`)
        setEmail('')
        setRole('volunteer')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <Label htmlFor="invite-email" className="sr-only">Email address</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="h-10"
        />
      </div>

      <div className="w-full sm:w-40">
        <Label htmlFor="invite-role" className="sr-only">Role</Label>
        <Select value={role} onValueChange={setRole} name="role">
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="volunteer">Volunteer</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="ast_lead">AST Lead</SelectItem>
            <SelectItem value="trustee">Trustee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending || !email} className="h-10 bg-purple-700 hover:bg-purple-800">
        {isPending ? 'Sending…' : 'Send invite'}
      </Button>

      {error && (
        <p className="text-sm text-red-600 sm:col-span-3">{error}</p>
      )}
    </form>
  )
}
