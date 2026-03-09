# NDS Maintenance Tracker — Progress

| [architecture/permissions.md](architecture/permissions.md) | Role permission matrix |

# NDS Maintenance Tracker — Progress

**Last updated:** 2026-03-05
**Current focus:** Phase 3 — Login, SMTP, Task Views & WhatsApp (not yet started)

---

## Phase Overview

| Phase | Name | Status | Cost |
|-------|------|--------|------|
| 1 | MVP — Core task management | âœ… Complete | £0/mo |
| 2 | Photos, editing & environments | âœ… Complete | £0/mo |
| 3 | Login, SMTP, task views & WhatsApp | ðŸ”œ Next | ~£2–5/mo |
| 4 | Scheduling & notifications | ðŸ“‹ Planned | £0/mo |
| 5 | Trustee reporting & risk management | ðŸ“‹ Planned | £0/mo |
| 6 | PWA & polish | ðŸ“‹ Planned | ~£1/mo |

---

## Phase 1 — MVP âœ… Complete

**Goal:** Something live that the team can use immediately.

### Infrastructure
- [x] Next.js 16 App Router deployed on Vercel (auto-deploy from `main`)
- [x] Supabase PostgreSQL with full RLS
- [x] GitHub repository with CI/CD

### Authentication
- [x] Magic link login
- [x] Password login (added for dev convenience)
- [x] Invite-only registration
- [x] Role-based middleware (unauthenticated â†’ `/login`)
- [x] Auth callback for PKCE and OTP flows

### Database
- [x] `profiles` table with 5-role system (`volunteer`, `owner`, `ast_lead`, `trustee`, `public`)
- [x] `sites`, `buildings`, `asset_categories` tables
- [x] `profile_sites` many-to-many for site-scoped access
- [x] `tasks` table — full status lifecycle (`open â†’ assigned â†’ in_progress â†’ pending_review â†’ complete`)
- [x] `task_comments` with `is_internal` flag
- [x] `audit_log` table (structure complete; writes wired in Phase 4)
- [x] RLS policies on all tables
- [x] Seed data: Overstone site, 4 buildings, 8 asset categories

### Core Features
- [x] Task list with status tabs (All / Open / In progress / Needs review / Complete)
- [x] Task detail page (description, location, due date, assignee, category)
- [x] Create reactive task (mobile-first: site â†’ problem â†’ urgency â†’ submit)
- [x] Task assignment (ast_lead only)
- [x] Status updates with transitions
- [x] Completion notes when marking done
- [x] Comments (public and internal)
- [x] Public report form at `/report/overstone` (no login required)
- [x] Basic dashboard: open/overdue counts + urgent task list

### User Management
- [x] Invite user (ast_lead sends email with role)
- [x] Change user role
- [x] Activate / deactivate user

### Navigation
- [x] Desktop sidebar (role-filtered links)
- [x] Mobile bottom navigation bar

---

## Phase 2 — Photos, Editing & Environments âœ… Complete

**Goal:** Photo evidence on tasks, role-aware editing, stable dual environments.

### Photo Attachments
- [x] `task_attachments` table
- [x] `task-photos` Supabase Storage bucket (private, signed URLs only)
- [x] Client-side image compression (Canvas API — max 1920px, 80% JPEG)
- [x] Authenticated photo upload (`uploadTaskPhoto`)
- [x] Anonymous photo upload via service-role client (`uploadPublicPhoto`)
- [x] Signed URL generation server-side (60 min expiry)
- [x] Photo gallery on task detail (tap to enlarge lightbox)
- [x] Photo upload on public report form
- [x] Photo deletion (ast_lead only)
- [x] Limits enforced: 5 MB per file, 10 photos per task

### Task Editing
- [x] Edit button (pencil icon) on task detail header
- [x] Dialog-based edit form (no page navigation)
- [x] ast_lead: edit all fields (title, description, priority, building, category, due date, compliance flag, task type)
- [x] volunteer/owner: edit title + description only (if assigned)
- [x] Server-side field stripping for non-ast_lead callers (defence-in-depth)

### Authentication Improvements
- [x] Password reset flow (full end-to-end)
- [x] `AuthStateListener` in root layout (catches recovery events on all pages)
- [x] Success banner on login page after password reset

### Environments
- [x] Separate dev and production Supabase projects
- [x] `.env.local` â†’ dev credentials (git-ignored)
- [x] Vercel env vars â†’ production credentials

### Bug Fixes
- [x] Turbopack NUL crash on Windows — pinned `tailwindcss@4.0.7` exactly
- [x] UUID validation — shape-only regex replacing `z.string().uuid()`
- [x] Auth callback 404 — created route at `app/auth/callback/route.ts`
- [x] `handle_new_user` trigger — added `SET search_path = public`
- [x] Seed data UUID mismatch in `003_seed_data.sql`
- [x] Supabase Site URL updated to Vercel production domain

---

## Phase 3 — Login, SMTP, Task Views & WhatsApp ðŸ”œ Next up

**Goal:** Confirm all login flows work reliably in production, replace Supabase's default email service with a custom SMTP provider, improve how tasks are presented, and deliver WhatsApp notifications.

### Login & Authentication Verification
- [ ] End-to-end test of magic link flow in production (send â†’ receive â†’ land on dashboard)
- [ ] End-to-end test of password login in production
- [ ] End-to-end test of password reset in production (send â†’ receive â†’ set password â†’ redirect)
- [ ] End-to-end test of invite flow in production (invite email â†’ accept â†’ set password â†’ correct role)
- [ ] Verify all role-based redirects (volunteer, owner, ast_lead, trustee — each land on correct page)
- [ ] Verify unauthenticated users are blocked from all protected routes
- [ ] Document any issues found and apply fixes

### Custom SMTP (replace Supabase default)
- [x] Select SMTP provider — Resend chosen (see [ADR 004](decisions/004_smtp_provider.md))
- [x] Configure Resend SMTP credentials in Supabase dashboard â†’ Auth â†’ SMTP settings
- [x] Set custom `From` address and display name (`NDS Maintenance`)
- [ ] Add DNS records to domain — SPF (merge into existing M365 record), DKIM (new subdomain entry) â¬… blocking
- [ ] Domain verified in Resend dashboard
- [ ] Confirm auth emails (magic link, invite, password reset) route through Resend in production
- [ ] Test full invite and magic link flow after DNS propagation

### Improved Task Views
- [ ] Task list: add search / filter by building, category, assignee, and date range
- [ ] Task list: add sort options (due date, priority, created date)
- [ ] Task list: group-by view (group by site or building)
- [ ] Dashboard: improve urgency/overdue summary cards with drill-down links
- [ ] Dashboard: "assigned to me" quick-view panel for volunteers
- [ ] Task detail: improved layout — photos and comments side-by-side on desktop
- [ ] Task detail: activity timeline (status changes, assignments, comments in chronological order)
- [ ] Mobile: swipe-to-update status gesture on task cards (optional / evaluate feasibility)

### WhatsApp Notifications (Twilio)
- [ ] Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` env vars (dev + production)
- [ ] `lib/notifications/whatsapp.ts` — Twilio API wrapper
- [ ] Per-user opt-in UI (`whatsapp_opt_in` column already exists on `profiles`)
- [ ] WhatsApp message templates: task assigned, task overdue, new public submission
- [ ] ~£2–5/month pay-per-use

---

## Phase 4 — Scheduling & Notifications ðŸ“‹ Planned

**Goal:** Automate recurring compliance tasks; alert the team when action is needed.

### Task Templates
- [ ] `task_templates` table (migration `005_task_templates.sql`)
- [ ] Template management UI at `/schedules` (ast_lead only)
- [ ] Link generated tasks to their template via `template_id` on tasks

### Daily Cron (Vercel Cron)
- [ ] `app/api/cron/daily/route.ts` — authenticated cron endpoint
- [ ] `lib/scheduling/generate-tasks.ts` — create task instances from templates
- [ ] `lib/scheduling/recurrence.ts` — frequency calculation (weekly / monthly / quarterly / annual)
- [ ] `CRON_SECRET` environment variable

### Email Notifications (Resend)
- [ ] `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars (dev + production)
- [ ] `lib/notifications/email.ts` — Resend API wrapper
- [ ] React Email templates for each event type
- [ ] Events: task assigned, task due in N days, task overdue, compliance overdue, new public submission, new reactive task

### Notification Settings
- [ ] `notification_settings` table (migration)
- [ ] Settings UI at `/settings/notifications`
- [ ] Configurable thresholds ("alert me N days before due")
- [ ] Per-user opt-out per event type

### Overdue Escalation
- [ ] Daily cron checks for overdue tasks
- [ ] `overdue_notified_at` on task to prevent repeat notifications
- [ ] Compliance tasks escalate to trustees after N days unresolved

### Audit Log Writes
- [ ] Wire audit log writes in server actions: status changes, assignments, task creation, cancellation

---

## Phase 5 — Trustee Reporting & Risk Management ðŸ“‹ Planned

**Goal:** Give trustees clear visibility of property health, compliance status, and site risks.

### Trustee Dashboard (`/reports`)
- [ ] RAG status cards per site (Red = overdue compliance, Amber = upcoming, Green = current)
- [ ] Compliance summary table (task type, last done, next due, status)
- [ ] Open task counts by priority across all sites
- [ ] "Completed this month / quarter" summary
- [ ] Risk summary panel — open risks by severity per site

### Compliance View
- [ ] Filter to compliance-only tasks (`is_compliance = true`)
- [ ] Show `legislation_ref` per item
- [ ] Highlight overdue compliance items in red
- [ ] Time-to-completion averages

### Risk Register
- [ ] `risks` table — site, building, title, description, likelihood, severity, RAG status, owner, review date, status (`open`, `mitigated`, `closed`)
- [ ] RLS: ast_lead can create/edit/close risks; trustee and owner can view only
- [ ] Risk management UI at `/risks` (ast_lead) — add, edit, update status
- [ ] Risk detail page — full description, mitigation notes, history
- [ ] Risk list linked to site/building for context
- [ ] Trustee risk view — read-only risk register filtered by site, sortable by severity
- [ ] RAG calculation on trustee dashboard includes open high-severity risks

### Export
- [ ] CSV export of compliance history
- [ ] CSV export of risk register
- [ ] PDF export via browser print stylesheet (compliance + risks combined)
- [ ] Date range filter for exports

### Monthly Digest Email
- [ ] Auto-sent to trustees + ast_leads on 1st of each month
- [ ] Summary: compliance status, overdue tasks, completed tasks, upcoming schedule, open risks

---

## Phase 6 — PWA & Polish ðŸ“‹ Planned

**Goal:** Professional finish and maximum convenience for volunteers.

### Custom Domain
- [ ] Purchase / connect domain (e.g. `maintenance.ndsscouts.org.uk`)
- [ ] Update Vercel project domain
- [ ] Update Supabase Site URL + redirect URLs
- [ ] ~£1/month

### PWA (Add to Home Screen)
- [ ] `public/manifest.json` — app name, icons, theme colour
- [ ] Service worker for offline detection
- [ ] "Add to home screen" prompt on first visit
- [ ] Splash screen on iOS/Android

### QR Code Management
- [ ] `/admin/qr-codes` page — all sites + buildings
- [ ] One-click printable A5 card (QR + "Spot a problem?" text)
- [ ] QR code regeneration if site slug changes

### Camera-First Photo Capture
- [ ] Direct camera button on mobile (beyond current `capture="environment"` attribute)
- [ ] Polish surrounding upload UI

### Bulk Operations (ast_lead)
- [ ] Multi-select on task list
- [ ] Bulk assign, bulk status update, bulk export

### Quick Complete from Email
- [ ] Magic link in assignment email â†’ tap to mark in-progress without opening the app
- [ ] Requires Resend webhook support (Phase 4 prerequisite)

---

## Future Phases (Backlog)

**Goal:** Capture candidate future workstreams beyond the current planned phases.

### Compliance Tracking (enhancement)
- [ ] Expand compliance coverage and evidence workflows beyond baseline reporting
- [ ] Add improved compliance dashboards by site/building/category
- [ ] Add compliance trend tracking and recurring issue detection

### OBB Hours Monitoring
- [ ] Add OBB hours logging model (task-linked and manual entries)
- [ ] Add per-person and per-team hour summaries
- [ ] Add monthly OBB contribution reporting with export

### Risk Management (enhancement)
- [ ] Extend risk scoring and mitigation workflow automation
- [ ] Add risk review reminders and overdue escalation prompts
- [ ] Add cross-site risk heatmap and trend reporting

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| [PLAN.md](PLAN.md) | Original pre-build plan (historical record) |
| [phases/phase-1-mvp.md](phases/phase-1-mvp.md) | Phase 1 detail + verification log |
| [phases/phase-2-enhancements.md](phases/phase-2-enhancements.md) | Phase 2 detail + verification log |
| [phases/phase-3-scheduling.md](phases/phase-3-scheduling.md) | Phase 3 original scheduling spec (now Phase 4) |
| [phases/phase-4-reporting.md](phases/phase-4-reporting.md) | Phase 4 original reporting spec (now Phase 5) |
| [phases/phase-5-polish.md](phases/phase-5-polish.md) | Phase 5 original polish spec (now Phase 6) |
| [architecture/database.md](architecture/database.md) | Full schema reference |
| [architecture/permissions.md](architecture/permissions.md) | Role permission matrix |

---

---

## Completed Phases

---


| [architecture/permissions.md](architecture/permissions.md) | Role permission matrix |

| [architecture/permissions.md](architecture/permissions.md) | Role permission matrix |