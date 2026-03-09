# Permissions & Role-Based Access Control

## Roles

| Role | Who | Access level |
|------|-----|-------------|
| `public` | Anyone with a QR code link | Can submit a report — no login |
| `volunteer` | Site volunteers | Can create + update their assigned tasks at their site |
| `owner` | Site owners / keepers | Same as volunteer (role distinction reserved for future) |
| `ast_lead` | AST team members | Full access across all sites |
| `trustee` | NDS Trustees | Read-only — reports and dashboards only |

Roles are stored in `profiles.role` and cannot be changed by the user themselves.
Only `ast_lead` can change another user's role.

---

## Feature Permission Matrix

| Feature | public | volunteer | owner | ast_lead | trustee |
|---------|:------:|:---------:|:-----:|:--------:|:-------:|
| Submit public report (no login) | ✅ | ✅ | ✅ | ✅ | — |
| View task list | — | ✅ | ✅ | ✅ | ✅ |
| View task detail | — | ✅ | ✅ | ✅ | ✅ |
| Create task | — | ✅ | ✅ | ✅ | — |
| Edit task (title + description) | — | if assigned | if assigned | ✅ (any) | — |
| Edit task (all fields) | — | — | — | ✅ | — |
| Upload photos | — | ✅ | ✅ | ✅ | — |
| Delete photos | — | — | — | ✅ | — |
| Mark task in progress | — | if assigned | if assigned | ✅ | — |
| Mark task complete | — | if assigned → pending review | if assigned | ✅ (direct complete) | — |
| Sign off pending review | — | — | — | ✅ | — |
| Assign task to person | — | — | — | ✅ | — |
| Cancel task | — | — | — | ✅ | — |
| Add public comment | — | ✅ | ✅ | ✅ | — |
| Add internal comment | — | — | — | ✅ | — |
| View internal comments | — | — | — | ✅ | — |
| View dashboard | — | ✅ | ✅ | ✅ | ✅ |
| View reports | — | — | — | ✅ | ✅ |
| Invite users | — | — | — | ✅ | — |
| Change user roles | — | — | — | ✅ | — |
| Deactivate users | — | — | — | ✅ | — |

---

## Site Access

`ast_lead` and `trustee` have **district-wide** access — they can see all tasks across all sites.

`volunteer` and `owner` have **site-specific** access:
- They must have an entry in `profile_sites` for each site they can access.
- They can only see and create tasks at their assigned sites.
- When inviting a volunteer, the AST lead must also add them to the relevant site in `profile_sites`.

---

## Status Transitions

Only certain roles can trigger certain status transitions:

```
                   volunteer/owner             ast_lead
                   (if assigned to them)       (any task)
open          →    —                           → assigned
                                               → in_progress
                                               → complete
assigned      →    → in_progress               → in_progress
                                               → complete
in_progress   →    → pending_review            → complete
                   (then waits for ast_lead)   → pending_review
pending_review →   —                           → complete
                                               → in_progress (send back)
any           →    —                           → cancelled
```

---

## Enforcement Layers

Permissions are enforced at **two independent layers**:

### 1. Database — Row Level Security (RLS)
The database itself rejects queries that violate access rules.
RLS runs regardless of how the query reaches the database.

Example: A volunteer cannot read tasks from a site they're not assigned to.
Even if they crafted a direct Supabase API call, the RLS policy would return 0 rows.

### 2. Server Actions — Field-Level Checks
Server actions (`lib/actions/tasks.ts`) check role before updating:
- `updateTask()` strips fields to `{title, description}` for non-ast_lead callers.
- `addComment()` prevents `is_internal: true` for non-ast_lead.
- `deleteTaskPhoto()` rejects non-ast_lead before touching storage.

### 3. UI — Conditional Rendering (convenience only)
The UI hides buttons and inputs that the user can't use.
This is **not** a security control — it's purely for usability.
If the UI check is missing, layers 1 and 2 will still protect the data.

---

## How the Role Is Fetched

Every protected server component calls `getCurrentProfile()` from `lib/supabase/helpers.ts`:

```typescript
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}
```

The profile (including role) is then:
- Passed to child Server Components as a prop
- Passed to Client Components that need role-aware rendering (e.g. `TaskActions`, `TaskEditButton`)

> The profile is **always fetched fresh from the database** per request. There is no client-side role caching that could be spoofed.
