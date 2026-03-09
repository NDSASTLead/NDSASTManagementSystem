# Phase 2 — Enhancements

**Status:** ✅ Complete
**Goal:** Photo evidence, task editing, dual-environment setup, and stability fixes.

---

## Delivered

### Photo Attachments
- [x] `task_attachments` database table
- [x] `task-photos` Supabase Storage bucket (private, no public URLs)
- [x] Client-side image compression (Canvas API — max 1920px, 80% JPEG quality)
- [x] Authenticated photo upload via server action (`uploadTaskPhoto`)
- [x] Anonymous photo upload via service-role client (`uploadPublicPhoto`)
- [x] Signed URL generation server-side (60 min expiry — `getSignedUrls`)
- [x] Photo gallery on task detail (tap to enlarge)
- [x] Photo upload on public report form (after submission)
- [x] Photo deletion (ast_lead only)
- [x] Limits: 5 MB per file, 10 photos per task

### Task Editing
- [x] Edit button on task detail page (pencil icon in header)
- [x] Dialog-based edit form (no page navigation needed)
- [x] ast_lead: can edit all fields (title, description, priority, building, category, due date, compliance flag, task type)
- [x] volunteer/owner: can edit title + description if assigned to them
- [x] Server action (`updateTask`) strips extra fields for non-ast_lead callers (defence-in-depth)

### Authentication Improvements
- [x] Password login option added to login form (toggle from magic link)
- [x] Password reset flow fully working (3 attempts before fix — see `DEV_NOTES.md`)
- [x] `AuthStateListener` moved to root layout (catches recovery events on all pages)
- [x] Recovery session cleared via `signOut()` after password update (prevents redirect loop)
- [x] Success banner on login page after password reset

### Dual Supabase Environments
- [x] Separate production and dev Supabase projects
- [x] `.env.local` → dev project credentials (git-ignored)
- [x] Vercel env vars → production project credentials
- [x] Site URL and redirect URLs configured per-project in Supabase dashboard

### Bug Fixes
- [x] **Turbopack NUL crash (Windows):** Pinned `tailwindcss` and `@tailwindcss/postcss` to exact `4.0.7`. Versions above 4.0.7 generate a path ending in `\nul` (Windows reserved device) during PostCSS processing, causing a fatal Turbopack panic.
- [x] **UUID validation:** Replaced `z.string().uuid()` with shape-only regex to handle non-RFC-9562 UUIDs in seed data.
- [x] **Auth callback 404:** Created route at `app/auth/callback/route.ts` (parenthesised layout groups don't create URL segments — see `DEV_NOTES.md §1`).
- [x] **handle_new_user trigger:** Added `SET search_path = public` to the trigger function (see `DEV_NOTES.md §2`).
- [x] **Seed data UUID mismatch:** Buildings referenced wrong site UUID (fixed in `003_seed_data.sql`).
- [x] **Supabase Site URL:** Updated to Vercel domain so email links redirect to production not localhost.
- [x] **People page 404:** Route grouping fix.

---

## Key Technical Decisions Made in This Phase

See [decisions/003_edit_ticket.md](../decisions/003_edit_ticket.md).

---

## Verification

```
✓ Upload photo on task → appears in gallery
✓ Upload photo on public report form → attached to task
✓ Photo > 5 MB rejected client-side and server-side
✓ Non-image file rejected
✓ ast_lead can delete photo
✓ Volunteer cannot delete photo
✓ ast_lead edits task → all fields save correctly
✓ Volunteer (assigned) edits task → only title/description fields shown
✓ Volunteer (not assigned) → no edit button visible
✓ Trustee → no edit button visible
✓ Password reset email → lands on set-password page (not dashboard)
✓ After setting password → redirected to login with success banner
✓ After login → stays on dashboard (no redirect loop)
```
