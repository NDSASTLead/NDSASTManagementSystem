# Phase 1 — MVP

**Status:** ✅ Complete
**Goal:** Something live that the team can use immediately.

---

## Delivered

### Infrastructure
- [x] Next.js 16 App Router on Vercel (auto-deploy from `main` branch)
- [x] Supabase PostgreSQL database with full RLS
- [x] GitHub repository with CI/CD

### Authentication
- [x] Magic link login (no password to forget)
- [x] Password login (added for convenience during development — see Phase 2)
- [x] Invite-only registration (AST lead sends invite email)
- [x] Role-based middleware (unauthenticated → `/login`)
- [x] Auth callback handling for both PKCE and OTP flows

### Database
- [x] `profiles` table with role system (`volunteer`, `owner`, `ast_lead`, `trustee`)
- [x] `sites`, `buildings`, `asset_categories` tables
- [x] `profile_sites` many-to-many for site-scoped access
- [x] `tasks` table with full status lifecycle
- [x] `task_comments` with internal flag
- [x] `audit_log` table (writes pending Phase 3)
- [x] RLS policies on all tables
- [x] Seed data: Overstone site, 4 buildings, 8 asset categories

### Core Features
- [x] Task list with status tabs (All active / Open / In progress / Needs review / Complete)
- [x] Task detail: description, location, due date, assigned person, category
- [x] Create task (mobile-first: site → problem → urgency → submit)
- [x] Task assignment (ast_lead only)
- [x] Status updates: in progress → pending review → complete
- [x] Completion notes when marking done
- [x] Comments (public and internal/ast_lead-only)
- [x] Public report form at `/report/overstone` (no login required)
- [x] Basic dashboard: open/overdue counts + urgent task list

### User Management
- [x] Invite user (ast_lead sends email with role)
- [x] Change user role
- [x] Activate/deactivate user

### Navigation
- [x] Desktop sidebar with role-filtered links
- [x] Mobile bottom navigation bar

---

## Key Technical Decisions Made in This Phase

See [decisions/001_tech_stack.md](../decisions/001_tech_stack.md) and [decisions/002_auth_strategy.md](../decisions/002_auth_strategy.md).

---

## Verification

```
✓ Log in as volunteer → create task → visible in list
✓ AST lead assigns task → volunteer sees it as "assigned to me"
✓ Volunteer marks in progress → marks complete (→ pending review)
✓ AST lead signs off → task shows as complete
✓ Visit /report/overstone without login → submit issue → appears in dashboard
✓ Trustee logs in → can view but cannot create/edit
✓ Volunteer cannot see tasks from a site they're not assigned to
```
