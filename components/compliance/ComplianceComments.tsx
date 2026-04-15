'use client'

import { useState, useTransition } from 'react'
import { addComplianceComment, deleteComplianceComment } from '@/lib/actions/compliance'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/shared/Avatar'
import { toast } from 'sonner'
import { getDisplayName } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import type { ComplianceCommentWithAuthor, Profile } from '@/lib/supabase/types'

interface Props {
  obligationId: string
  comments: ComplianceCommentWithAuthor[]
  currentProfile: Profile
}

export function ComplianceComments({ obligationId, comments, currentProfile }: Props) {
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()

  const canComment = ['ast_lead', 'safety_officer', 'ast_member'].includes(currentProfile.role)
  const canDeleteAny = currentProfile.role === 'ast_lead'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    startTransition(async () => {
      const result = await addComplianceComment(obligationId, body.trim())
      if (result?.error) {
        toast.error(result.error)
      } else {
        setBody('')
        toast.success('Comment added')
      }
    })
  }

  function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return
    startTransition(async () => {
      const result = await deleteComplianceComment(commentId, obligationId)
      if (result?.error) toast.error(result.error)
      else toast.success('Comment deleted')
    })
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => {
            const isOwn = comment.author_id === currentProfile.id
            const authorName = isOwn
              ? getDisplayName(currentProfile)
              : comment.author
                ? getDisplayName(comment.author as Profile)
                : 'Someone'
            const canDelete = isOwn || canDeleteAny

            return (
              <div key={comment.id} className="rounded-lg px-4 py-3 text-sm bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={authorName}
                      picturePath={isOwn ? currentProfile.profile_picture_path : (comment.author as Profile | null)?.profile_picture_path}
                      size="xs"
                    />
                    <span className="font-medium text-gray-800">
                      {isOwn ? 'You' : authorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        disabled={isPending}
                        className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.body}</p>
              </div>
            )
          })}
        </div>
      )}

      {canComment && (
        <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-gray-100">
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[80px] text-base resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!body.trim() || isPending}
              className="bg-purple-700 hover:bg-purple-800"
            >
              {isPending ? 'Adding...' : 'Add comment'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
