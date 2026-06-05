# NDS Maintenance Tracker — Progress

**Last updated:** 2026-03-05
**Current focus:** Phase 7 — OBB Volunteer Hours (Phase 3 SMTP blocked pending DNS — see Gary)

---

## Phase Overview

| Phase | Name | Status | Cost |
|-------|------|--------|------|
| 1 | MVP — Core task management | ✅ Complete | £0/mo |
| 2 | Photos, editing & environments | ✅ Complete | £0/mo |
| 3 | Login, SMTP, task views & WhatsApp | 🔜 Next | ~£2–5/mo |
| 4 | Scheduling & notifications | 📋 Planned | £0/mo |
| 5 | Trustee reporting & risk management | 📋 Planned | £0/mo |
| 6 | PWA & polish | 📋 Planned | ~£1/mo |
| 7 | OBB Volunteer Hours | 📋 Planned | £0/mo |

---

## Phase 1 — MVP ✅ Complete

**Goal:** Something live that the team can use immediately.

### Infrastructure
- [x] Next.js 16 App Router deployed on Vercel (auto-deploy from `main`)
- [x] Supabase PostgreSQL with full RLS
- [x] GitHub repository with CI/CD

### Authentication
- [x] Magic link login
- [x] Password login (added for dev convenience)
- [x] Invite-only registration
- [x] Role-based middleware (unauthenticated → `/login`)
- [x] Auth callback for PKCE and OTP flows

### Database
- [x] `profiles` table with 5-role system (`volunteer`, `owner`, `ast_lead`, `trustee`, `public`)
- [x] `sites`, `buildings`, `asset_categories` tables
- [x] `profile_sites` many-to-many for site-scoped access
- [x] `tasks` table — full status lifecycle (`open → assigned → in_progress → pending_review → complete`)
- [x] `task_comments` with `is_internal` flag
- [x] `audit_log` table (structure complete; writes wired in Phase 4)
- [x] RLS policies on all tables
- [x] Seed data: Overstone site, 4 buildings, 8 asset categories

### Core Features
- [x] Task list with status tabs (All / Open / In progress / Needs review / Complete)
- [x] Task detail page (description, location, due date, assignee, category)
- [x] Create reactive task (mobile-first: site → problem → urgency → submit)
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

## Phase 2 — Photos, Editing & Environments ✅ Complete

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
- [x] `.env.local` → dev credentials (git-ignored)
- [x] Vercel env vars → production credentials

### Bug Fixes
- [x] Turbopack NUL crash on Windows — pinned `tailwindcss@4.0.7` exactly
- [x] UUID validation — shape-only regex replacing `z.string().uuid()`
- [x] Auth callback 404 — created route at `app/auth/callback/route.ts`
- [x] `handle_new_user` trigger — added `SET search_path = public`
- [x] Seed data UUID mismatch in `003_seed_data.sql`
- [x] Supabase Site URL updated to Vercel production domain

---

## Phase 3 — Login, SMTP, Task Views & WhatsApp 🔜 Next up

**Goal:** Confirm all login flows work reliably in production, replace Supabase's default email service with a custom SMTP provider, improve how tasks are presented, and deliver WhatsApp notifications.

### Login & Authentication Verification
- [ ] End-to-end test of magic link flow in production (send → receive → land on dashboard)
- [ ] End-to-end test of password login in production
- [ ] End-to-end test of password reset in production (send → receive → set password → redirect)
- [ ] End-to-end test of invite flow in production (invite email → accept → set password → correct role)
- [ ] Verify all role-based redirects (volunteer, owner, ast_lead, trustee — each land on correct page)
- [ ] Verify unauthenticated users are blocked from all protected routes
- [ ] Document any issues found and apply fixes

### Custom SMTP (replace Supabase default)
- [x] Select SMTP provider — Resend chosen (see [ADR 004](decisions/004_smtp_provider.md))
- [x] Configure Resend SMTP credentials in Supabase dashboard → Auth → SMTP settings
- [x] Set custom `From` address and display name (`NDS Maintenance`)
- [ ] Add DNS records to domain — SPF (merge into existing M365 record), DKIM (new subdomain entry) ⬅ **BLOCKED — Gary to assist with M365 DNS**
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

## Phase 4 — Scheduling & Notifications 📋 Planned

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

## Phase 5 — Trustee Reporting & Risk Management 📋 Planned

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

## Phase 6 — PWA & Polish 📋 Planned

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
- [ ] Magic link in assignment email → tap to mark in-progress without opening the app
- [ ] Requires Resend webhook support (Phase 4 prerequisite)

---

## Future Phases (Backlog)

**Goal:** Capture candidate future workstreams beyond the current planned phases.

### Compliance Tracking (enhancement)
- [ ] Expand compliance coverage and evidence workflows beyond baseline reporting
- [ ] Add improved compliance dashboards by site/building/category
- [ ] Add compliance trend tracking and recurring issue detection

### OBB Hours Monitoring
> Promoted to **Phase 7** — see full spec in the Phase 7 section below.

### Risk Management (enhancement)
- [ ] Extend risk scoring and mitigation workflow automation
- [ ] Add risk review reminders and overdue escalation prompts
- [ ] Add cross-site risk heatmap and trend reporting

---

## Phase 7 — OBB Volunteer Hours 📋 Planned

**Goal:** Let OBB campaign volunteers publicly self-register, log their volunteering hours, and earn recognition through configurable reward tiers. Give AST leads a simple approval workflow and the public a live showcase of campaign momentum.

**Source:** OBBPlan.md — AST merch earn-access model (6h patch, 12h t-shirt, 24h hoodie)

### Open Registration
- [ ] `obb_volunteer` role added to Role enum and RLS policies
- [ ] Public sign-up page at `/obb/register` (no invite required — email + full name)
- [ ] Supabase Auth auto-confirm enabled for OBB volunteer accounts
- [ ] OBB volunteer login redirects to `/obb/dashboard`
- [ ] Middleware: `/obb/*` routes accessible to `obb_volunteer` role only (except `/obb` public page)

### Database — Configurable Tables
- [ ] `reward_tiers` table — name, description, hours_threshold, unlock_message, display_order, is_active
  - Default seed: 6h → patch/sticker access, 12h → t-shirt access, 24h → hoodie/accessory access
- [ ] `activity_types` table — name, description, icon, display_order, is_active
  - Default seed: Site work, Buildings, Woodland & Grounds, Admin & Logistics, Events, Other
- [ ] `volunteer_hours` table — volunteer_id, activity_type_id, date, hours (decimal), description, status (pending/approved/rejected), reviewed_by, reviewed_at, review_note
- [ ] `obb_settings` table — key/value config (campaign_goal_hours, public_leaderboard_enabled, registration_open)
- [ ] RLS: obb_volunteers can insert/read own hours; ast_lead can read all + update status; public can read aggregate stats only

### Admin — AST Lead
- [ ] `/admin/volunteers` — list all OBB volunteers with approved hours total and tier status
- [ ] `/admin/volunteers/hours` — pending approvals queue (approve / reject with note)
- [ ] `/admin/tiers` — full CRUD for reward tiers (add, edit, reorder, enable/disable)
- [ ] `/admin/activity-types` — full CRUD for activity types
- [ ] `/admin/obb-settings` — campaign goal, toggle registration open/closed, toggle public leaderboard

### Volunteer Portal
- [ ] `/obb/dashboard` — approved hours total, progress bar to next tier, list of unlocked tiers
- [ ] `/obb/log` — submit new hours entry (date, activity type, duration, description)
- [ ] `/obb/history` — full submission history with status badges (pending / approved / rejected + note)

### Public Showcase Page
- [ ] `/obb` — public page: total approved campaign hours, active volunteer count, recent activity feed
- [ ] Campaign progress gauge toward configurable goal (e.g. 1,000 hours by May 2028)
- [ ] Tier milestone display (how many volunteers have hit each tier)
- [ ] No PII shown publicly — aggregate stats only (opt-in name display per volunteer in settings)

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

## Requests

> Things to consider in the next Claude Code session. Not scheduled into a phase yet — review and decide whether to absorb into an existing phase or park.

| Request | Context | Logged |
|---------|---------|--------|
| RAG status integration | Surface RAG (Red/Amber/Green) status on the trustee dashboard per site — already planned in Phase 5 but flagged as a priority to not lose sight of. | 2026-06-05 |
| Middleware rename | Non-breaking: rename `middleware.ts` → `proxy.ts` per Next.js 16 deprecation warning (noted in DEV_NOTES.md #5). Quick win. | 2026-06-05 |
