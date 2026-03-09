'use client'

import { useState, useTransition } from 'react'
import { addComment } from '@/lib/actions/tasks'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/shared/Avatar'
import { toast } from 'sonner'
import { getDisplayName } from '@/lib/utils'
import type { TaskCommentWithAuthor, Profile } from '@/lib/supabase/types'

interface Props {
  taskId: string
  comments: TaskCommentWithAuthor[]
  currentProfile: Profile
}

export function TaskComments({ taskId, comments, currentProfile }: Props) {
  const [body, setBody] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return

    startTransition(async () => {
      const result = await addComment(taskId, body.trim())
      if (result?.error) {
        toast.error(result.error)
      } else {
        setBody('')
        toast.success('Comment added')
      }
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
                ? getDisplayName(comment.author)
                : 'Someone'
            return (
              <div key={comment.id} className={`rounded-lg px-4 py-3 text-sm ${
                comment.is_internal
                  ? 'bg-purple-50 border border-purple-100'
                  : 'bg-gray-50 border border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={authorName}
                      picturePath={isOwn ? currentProfile.profile_picture_path : comment.author?.profile_picture_path}
                      size="xs"
                    />
                    <span className="font-medium text-gray-800">
                      {isOwn ? 'You' : authorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.is_internal && (
                      <span className="text-xs text-purple-600 font-medium">Internal note</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.body}</p>
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-gray-100">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px] text-base resize-none"
        />
        <div className="flex items-center justify-between">
          {currentProfile.role === 'ast_lead' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-purple-700 text-sm"
              disabled={!body.trim() || isPending}
              onClick={() => {
                if (!body.trim()) return
                startTransition(async () => {
                  const result = await addComment(taskId, body.trim(), true)
                  if (result?.error) toast.error(result.error)
                  else { setBody(''); toast.success('Internal note added') }
                })
              }}
            >
              Add as internal note
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || isPending}
            className="ml-auto bg-purple-700 hover:bg-purple-800"
          >
            {isPending ? 'Adding...' : 'Add comment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
