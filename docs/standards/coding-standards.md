# Coding Standards

Standards and patterns used throughout the NDS Maintenance Tracker codebase. When in doubt, look at an existing file that does something similar and follow the same pattern.

---

## TypeScript

### Strict mode
TypeScript is configured with `strict: true`. No `any` types unless absolutely unavoidable (document with a comment if used).

### Interfaces over types for objects
```typescript
// ✅ Preferred
interface Task { id: string; title: string }

// ❌ Avoid for objects
type Task = { id: string; title: string }
```

### Types from the database live in `lib/supabase/types.ts`
Do not redeclare database shapes inline in components. Import from types:
```typescript
import type { Task, Profile, TaskWithRelations } from '@/lib/supabase/types'
```

### Enums as union types
```typescript
// ✅ Used throughout the codebase
type Role = 'volunteer' | 'owner' | 'ast_lead' | 'trustee'
type Priority = 'low' | 'medium' | 'high' | 'critical'

// ❌ Avoid TypeScript enums (they generate runtime code)
enum Role { Volunteer = 'volunteer', ... }
```

---

## React Components

### Server vs. Client split
Components are Server Components by default in the App Router. Add `'use client'` only when you need:
- Browser APIs (`window`, `navigator`, `canvas`)
- React state (`useState`, `useReducer`)
- React effects (`useEffect`)
- Event handlers (`onClick`, `onChange`)
- Client-side hooks (`useRouter`, `usePathname`, `useTransition`)

```typescript
// ✅ Server Component (no directive needed)
export default async function TaskPage({ params }) {
  const task = await fetchTask(params.id)
  return <div>{task.title}</div>
}

// ✅ Client Component
'use client'
export function TaskActions({ task }) {
  const [isPending, startTransition] = useTransition()
  ...
}
```

### Props interfaces — define locally or import
```typescript
// Small interface — define at top of file
interface Props {
  task: TaskWithRelations
  currentProfile: Profile
}

export function TaskEditButton({ task, currentProfile }: Props) { ... }
```

### Named exports for components (not default)
Client components use named exports. Server page components use default exports (required by Next.js routing).

```typescript
// ✅ Client component — named export
export function TaskActions({ task }: Props) { ... }

// ✅ Page component — default export (Next.js requirement)
export default async function TaskDetailPage({ params }) { ... }
```

---

## Server Actions

### File location and directive
All server actions live in `lib/actions/`. Every file starts with `'use server'`.

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
```

### Return shape
Server actions always return `{ success: true }` or `{ error: string }`. Never throw — callers check the return value.

```typescript
export async function updateTask(taskId: string, input: UpdateTaskInput) {
  // ...
  if (error) return { error: 'Failed to update task. Please try again.' }
  revalidatePath(`/tasks/${taskId}`)
  return { success: true }
}
```

### Auth check first
Every server action verifies authentication before doing anything:
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: 'Not authenticated' }
```

### Role check second
Then check role — never trust the client for authorization:
```typescript
const { data: profile } = await supabase
  .from('profiles').select('id, role').eq('id', user.id).single()
if (!profile || profile.role !== 'ast_lead') return { error: 'Not authorised.' }
```

### Zod validation
Validate all inputs with Zod before touching the database:
```typescript
const parsed = CreateTaskSchema.safeParse(raw)
if (!parsed.success) return { error: parsed.error.issues[0].message }
```

### Cache invalidation
Always call `revalidatePath` after mutations so server components re-render:
```typescript
revalidatePath(`/tasks/${taskId}`)
revalidatePath('/tasks')
revalidatePath('/dashboard')
```

---

## Zod Schemas

### UUID validation
Do **not** use `z.string().uuid()`. It uses RFC 9562 strict validation (version nibble 1–8). Seed data uses version-0 UUIDs.

Use the project's custom UUID schema:
```typescript
const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID'
)
```

### Optional fields from HTML forms
HTML forms return empty strings for unfilled inputs, not `undefined`. Use `z.preprocess` to coerce:
```typescript
const optionalUuid = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  uuidSchema.optional()
)

const optionalText = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().optional()
)
```

---

## Supabase Clients

Three clients exist — use the right one:

| Client | File | Use when |
|--------|------|----------|
| Browser | `lib/supabase/client.ts` | Client components that need live Supabase access (e.g. realtime, dynamic dropdowns) |
| Server | `lib/supabase/server.ts` | Server components, server actions, middleware |
| Service | `lib/supabase/service.ts` | Bypasses RLS — ONLY for anonymous uploads and admin invite API |

```typescript
// ✅ Server Component / Server Action
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// ✅ Client Component
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// ✅ Service role (sparingly — bypasses RLS)
import { createServiceClient } from '@/lib/supabase/service'
const supabase = createServiceClient()
```

> ⚠️ Never use the service client in a client component. It exposes the service role key to the browser.

---

## Form Pattern

Client forms follow this pattern consistently (see `TaskCreateForm.tsx` and `TaskActions.tsx`):

```typescript
'use client'
import { useState, useTransition } from 'react'
import { myServerAction } from '@/lib/actions/my-actions'
import { toast } from 'sonner'

export function MyForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await myServerAction(data)
      if (result?.error) {
        setError(result.error)      // show inline error
        // or: toast.error(result.error)
      } else {
        toast.success('Done!')
        // page re-renders automatically via revalidatePath
      }
    })
  }

  return (
    <form>
      {/* fields */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </Button>
    </form>
  )
}
```

Key points:
- `useTransition` wraps the server action call — keeps UI responsive
- Disabled state from `isPending` prevents double-submit
- Error shown inline (not just toast) so it's visible after scroll

---

## Styling

### Class ordering
Follow Tailwind's recommended order: layout → box model → typography → visual → interactive.

### Use `cn()` for conditional classes
```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'base-classes always-applied',
  condition && 'conditional-class',
  variant === 'primary' ? 'bg-purple-700' : 'bg-gray-100'
)} />
```

### Never use inline styles
Use Tailwind classes. Exception: dynamic values that can't be expressed in Tailwind (e.g. `style={{ width: `${percent}%` }}`).

### shadcn/ui components
Use shadcn/ui components from `components/ui/` for all standard UI elements:
- `Button`, `Input`, `Textarea`, `Label` — form elements
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` — dropdowns
- `Card`, `CardHeader`, `CardContent` — content containers
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTrigger` — modals

Do **not** edit files in `components/ui/` directly — they are managed by shadcn. Re-run `npx shadcn add` to update or add components.

### Responsive design
Mobile-first. Add `md:` and `lg:` breakpoint variants for larger screens:
```typescript
<div className="flex flex-col md:flex-row gap-4">
```

---

## File & Folder Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Pages | `page.tsx` | `app/(app)/tasks/page.tsx` |
| Layouts | `layout.tsx` | `app/(app)/layout.tsx` |
| API routes | `route.ts` | `app/auth/callback/route.ts` |
| Components | `PascalCase.tsx` | `TaskEditButton.tsx` |
| Server actions | `camelCase.ts` | `lib/actions/tasks.ts` |
| Helpers/utils | `camelCase.ts` | `lib/supabase/helpers.ts` |
| Docs | `kebab-case.md` | `phase-1-mvp.md` |
| SQL migrations | `NNN_description.sql` | `001_initial_schema.sql` |

---

## Key Constraints to Never Break

1. **`tailwindcss` and `@tailwindcss/postcss` must stay pinned at exactly `4.0.7`** (no `^` caret). Any higher version crashes Turbopack on Windows. See ADR 001.

2. **Never use `z.string().uuid()`** — use the project's custom `uuidSchema` regex instead.

3. **Never use the service client in client components.** It exposes `SUPABASE_SERVICE_ROLE_KEY` to the browser.

4. **Never hard-delete tasks.** Use `status = 'cancelled'`.

5. **Always call `revalidatePath` after mutations** — without it, the page shows stale data.

6. **The `handle_new_user` trigger function must keep `SET search_path = public`** — removing it causes `SECURITY DEFINER` to fail to resolve the profiles table.

---

## Commits

Follow conventional commit format:
```
feat: add thing that didn't exist
fix: correct thing that was broken
refactor: restructure without changing behaviour
docs: update documentation
chore: dependency update, config change
```

Keep commits focused. Each commit should do one thing.
