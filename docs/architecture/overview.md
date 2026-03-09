# Architecture Overview

## What This System Does

The NDS Maintenance Tracker lets Northampton District Scouts log, assign, and track maintenance tasks across their properties. It has four user types: volunteers who report and complete work, owners who manage their building, AST leads who co-ordinate everything, and trustees who view-only reports.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | Server Components reduce JS sent to mobile browsers; Server Actions simplify forms without a REST API |
| Language | TypeScript 5 | Type safety across DB types, server actions, and component props |
| Database | Supabase (PostgreSQL) | Managed Postgres + built-in RLS + auth + storage in one service |
| Auth | Supabase Auth | Magic links (no password to forget) + password login for frequent users |
| Storage | Supabase Storage | Private bucket for task photos; signed URLs for access |
| Styling | Tailwind CSS 4.0 + shadcn/ui | Accessible Radix primitives, zero runtime CSS-in-JS cost |
| Deployment | Vercel | Zero-config CI/CD from GitHub; instant preview deploys |
| Toasts | Sonner | Lightweight, accessible toast notifications |
| Icons | Lucide React | Consistent icon set, tree-shakeable |

**Current version pinning:**
- `tailwindcss@4.0.7` and `@tailwindcss/postcss@4.0.7` — pinned exactly (no `^`). Versions above 4.0.7 cause a Windows/Turbopack crash (see ADR 001).
- `next@16.1.6` — Turbopack is default and mandatory in v16; `--no-turbopack` flag does not exist.

---

## Environments

| Environment | Frontend | Database | Config |
|-------------|----------|----------|--------|
| Production | Vercel (auto-deploy from `main`) | Supabase prod project | Vercel environment variables |
| Local dev | `npm run dev` on port 3000 | Supabase dev project | `.env.local` (git-ignored) |

The same codebase runs in both environments. Only the Supabase URL + keys differ.

---

## Request Flow

### Authenticated Page Request
```
Browser
  → Vercel Edge (Next.js middleware)
      → Checks Supabase session cookie
      → No session? Redirect /login
      → Has session? Proceed
  → Next.js Server Component (RSC)
      → createClient() [server] with session cookies
      → supabase.from('tasks').select(...)
          → PostgreSQL + RLS (checks user role/site)
      → Returns data to RSC
  → HTML streamed to browser
  → Client Components hydrate (TaskActions, comments, etc.)
```

### Form Submit (Server Action)
```
Browser
  → Client Component calls server action (e.g. createTask(formData))
  → Next.js Server Action executes on server
      → createClient() [server]
      → Zod validation
      → Role/permission check
      → supabase.from('tasks').insert(...)
          → PostgreSQL + RLS enforces access
      → revalidatePath('/tasks') — clears RSC cache
  → Browser receives response
  → RSC re-renders automatically (fresh data)
  → Toast shown (success/error)
```

### Photo Upload
```
Browser
  → PhotoUpload component
      → Canvas API compresses image (1920px max, 80% JPEG)
      → Calls uploadTaskPhoto(taskId, formData) server action
  → Server Action
      → Validates session + role
      → Validates: image type, ≤5 MB, ≤10 photos per task
      → supabase.storage.upload('task-photos/{taskId}/{uuid}.jpg')
      → supabase.from('task_attachments').insert(...)
      → revalidatePath('/tasks/{taskId}')
  → Page re-renders, signed URLs fetched server-side
```

### Public Report (No Login)
```
Browser → /report/overstone (no auth required)
  → Server Component loads site info (anon Supabase client)
  → User fills PublicReportForm
  → createPublicSubmission(formData) server action
      → Service role client (bypasses RLS for storage if photos)
      → Inserts task with public_submission: true
      → RLS anon INSERT policy allows this specific case
  → Thank-you screen
```

---

## Folder Structure

```
maintenance-tracker/
│
├── app/                          # Next.js App Router pages
│   ├── (app)/                    # Protected routes (require login)
│   │   ├── layout.tsx            # App shell: sidebar + mobile nav + toasts
│   │   ├── dashboard/page.tsx    # Task stats + urgent tasks list
│   │   ├── tasks/
│   │   │   ├── page.tsx          # Task list with status/site filters
│   │   │   ├── new/page.tsx      # Create task form
│   │   │   └── [id]/page.tsx     # Task detail: photos, actions, comments
│   │   └── admin/users/page.tsx  # User management (ast_lead only)
│   │
│   ├── (auth)/                   # Auth UI routes (public)
│   │   ├── login/
│   │   │   ├── page.tsx          # Server: checks session, passes props
│   │   │   └── LoginForm.tsx     # Client: magic link + password toggle
│   │   └── callback/route.ts     # Layout-group callback (unreachable — see DEV_NOTES)
│   │
│   ├── auth/
│   │   ├── callback/route.ts     # PKCE + OTP token exchange → redirect
│   │   └── update-password/
│   │       └── page.tsx          # Password reset form
│   │
│   ├── report/[site-slug]/       # Public report form (no login)
│   ├── layout.tsx                # Root layout: fonts + AuthStateListener
│   └── page.tsx                  # Root: forwards Supabase email params → /auth/callback
│
├── components/
│   ├── auth/                     # AuthStateListener, UpdatePasswordForm
│   ├── layout/                   # Sidebar, MobileNav
│   ├── tasks/                    # TaskCreateForm, TaskEditButton, TaskActions, TaskComments
│   ├── shared/                   # PhotoUpload, PhotoGallery, StatusBadge, PriorityBadge
│   ├── people/                   # InviteUserForm, UserRow
│   ├── public/                   # PublicReportForm
│   └── ui/                       # shadcn/ui primitives (generated — do not edit manually)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (uses cookies)
│   │   ├── server.ts             # Server Supabase client (uses cookies, async)
│   │   ├── service.ts            # Service role client (bypasses RLS — use sparingly)
│   │   ├── helpers.ts            # getCurrentProfile() helper
│   │   └── types.ts              # All TypeScript interfaces matching DB schema
│   ├── actions/
│   │   ├── tasks.ts              # createTask, updateTask, updateTaskStatus, assignTask, addComment
│   │   ├── people.ts             # inviteUser, updateUserRole, setUserActive
│   │   └── attachments.ts        # uploadTaskPhoto, uploadPublicPhoto, deleteTaskPhoto, getSignedUrls
│   └── utils.ts                  # cn() class merge, compressImage() canvas utility
│
├── supabase/migrations/          # SQL run in Supabase SQL Editor (in order)
│   ├── 001_initial_schema.sql    # All tables, indexes, triggers, seed helper functions
│   ├── 002_rls_policies.sql      # All Row Level Security policies
│   ├── 003_seed_data.sql         # Seed: Overstone site, buildings, asset categories
│   └── 004_attachments.sql       # task_attachments table + task-photos storage bucket
│
├── docs/                         # ← You are here
├── middleware.ts                 # Auth routing (session check + redirect)
├── .env.local                    # Local secrets (git-ignored)
└── package.json                  # Dependencies + scripts
```

---

## Key Design Principles

**1. Server first, client only when necessary**
Pages are Server Components by default. Client components (`'use client'`) are used only when browser APIs, state, or event handlers are needed (forms, photo upload, dialogs).

**2. Database is the source of truth for permissions**
RLS policies enforce access at the database level. Server actions add field-level checks on top (defence-in-depth). The UI then mirrors these restrictions — but the UI alone is never trusted.

**3. Never delete, only cancel**
Tasks move through statuses but are never hard-deleted. `status = 'cancelled'` is the terminal "removed" state. This preserves audit history.

**4. Simplicity over features**
SASU volunteers are older and less tech-savvy. Every feature decision starts with: "Will this confuse a 65-year-old on a phone?"

**5. Zero-cost infrastructure**
All services are on free tiers. See [phases/README.md](../phases/README.md) for cost breakdown.
