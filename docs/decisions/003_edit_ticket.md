# ADR 003 — Edit Ticket Functionality

**Date:** 2026-03-04
**Status:** Implemented

---

## Context

Users needed to be able to edit ticket (task) details after creation. The question was which roles should be able to edit, and what fields each role should be allowed to change.

---

## Decision

### Permission levels

| Role | Can edit | Fields allowed |
|------|----------|---------------|
| `ast_lead` | Any task | title, description, priority, building, category, due_date, is_compliance, task_type |
| `volunteer` / `owner` | Only tasks assigned to them | title, description only |
| `trustee` | Never | — |

### Implementation choices

| Decision | Rationale |
|----------|-----------|
| Dialog-based edit (not a separate `/tasks/:id/edit` page) | Keeps context, better on mobile, consistent with app's inline action patterns |
| volunteer/owner edits only title + description | Core metadata (priority, due date, compliance) is set by ast_lead; volunteers shouldn't change scope or urgency |
| Server action strips extra fields for non-ast_lead | Defence-in-depth: even if the UI is bypassed, the server enforces field-level restrictions regardless of what's sent |
| No new SQL migration needed | Existing RLS `UPDATE` policy on `tasks` already allows: `ast_lead` (any), `volunteer`/`owner` (if `assigned_to = auth.uid()`) |
| Plain React state + `useTransition` | Consistent with `TaskCreateForm` and `TaskActions` patterns throughout the codebase |
| `revalidatePath` on save | Server component re-fetches fresh data automatically; no need for client-side cache management |

---

## Files changed

| File | Change |
|------|--------|
| `lib/actions/tasks.ts` | Added `updateTask()` server action with `UpdateTaskSchema` |
| `components/tasks/TaskEditButton.tsx` | New — pencil button + Dialog with role-aware form |
| `app/(app)/tasks/[id]/page.tsx` | Added `canEdit` check, buildings/categories fetch, `<TaskEditButton>` in header |

---

## Consequences

- Volunteers who are assigned to a task can now correct the title/description if it was submitted with inaccurate info.
- AST leads can fully adjust any task without needing to cancel and re-create it.
- The RLS policy remains the authoritative source of truth for who can update a task row; the server action adds field-level restriction on top.
