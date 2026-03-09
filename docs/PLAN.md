# NDS Maintenance Tracking Tool - Original Implementation Plan

> ⚠️ **Historical reference only.** This is the original pre-build plan. Phase numbering and scope shifted during implementation.
> - **Track current progress** → [`PROGRESS.md`](PROGRESS.md)
> - Architecture → [`architecture/overview.md`](architecture/overview.md)
> - Decisions → [`decisions/`](decisions/)
> - Coding standards → [`standards/coding-standards.md`](standards/coding-standards.md)

> **Note on phase numbering:** The original plan had 4 phases. During implementation, Phase 2 ("Scheduling") was deprioritised and photo/editing work was delivered first, shifting scheduling to Phase 3. The docs/phases/ files reflect the actual delivery order.

---

## Context

Northampton District Scouts Asset Support Team (AST) manages physical properties across multiple Scout sites. Currently, maintenance tasks are tracked informally (WhatsApp, verbal), compliance schedules are at risk of being missed, and Trustees have no visibility of property health. This tool replaces that with a structured, role-appropriate web application.

**Key constraint:** SASU volunteers are older, less tech-savvy, and resistant to change. Adoption is the primary risk. Simplicity trumps features.

**Delivery priority:** Get something running ASAP. Ship Phase 1, then iterate.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | Vercel (free) | Zero cost, auto-deploy from GitHub |
| Database + Auth | Supabase (free) | PostgreSQL + RLS + magic link auth |
| Framework | Next.js 14 App Router | Server Components reduce JS on mobile, Server Actions simplify forms |
| Email | Resend (free: 3k/month) | Simple API, React Email templates |
| WhatsApp | Twilio (Phase 4) | Opt-in only, ~£2-5/month |
| UI | shadcn/ui + Tailwind | Accessible Radix primitives, no bundle bloat |
| Auth method | Magic links only | No passwords - simpler for older volunteers |
| Sites (Phase 1) | Overstone Scout Activity Centre | PHC is part of Overstone, not a separate site |
| Task types | Scheduled + Reactive | Covers compliance calendar and ad-hoc repairs |
| Monthly cost | ~£0/month | All services on free tier until domain connected (Phase 4) |

---

## User Roles

| Role | Can Do |
|---|---|
| `public` | Submit a maintenance issue from a QR code at the site — no login required |
| `volunteer` | Log reactive tasks, view + update assigned tasks at their site |
| `owner` | Same as volunteer + request assistance |
| `ast_lead` | Full access: assign, prioritise, manage templates, configure notifications, user admin |
| `trustee` | Read-only reporting dashboard |

### Public Submission Flow
- QR code at each building links to `/report/[site-slug]`
- Simple 3-field form: What's the problem? / Where is it? / Your name (optional)
- No login required
- Creates a task with status `open`, assigned to no one, flagged as `public_submission: true`
- AST lead is notified immediately
- AST lead can promote to a full task, assign it, or dismiss it

---

## Data Model (PostgreSQL via Supabase)

### Sites
Overstone Scout Activity Centre is the primary site. Buildings within it (e.g. Will Smith, Pack Holiday Centre block) are tracked as `buildings`. YHF and Fernie Fields are added later as separate sites.

### Tables
- `profiles` — extends auth.users; includes role, site_ids, whatsapp_opt_in
- `sites` — Overstone (Phase 1); YHF, Fernie Fields later
- `buildings` — sub-units within sites (e.g. PHC block, Will Smith building, Archive)
- `asset_categories` — Fire Safety, Electrical, Structural, Grounds, etc.
- `assets` — individual tracked items per site/building
- `task_templates` — recurring schedule definitions (frequency, advance_notice_days, compliance flag)
- `tasks` — instances (scheduled or reactive); status: open → assigned → in_progress → pending_review → complete
- `task_assignments` — history of all assignment changes
- `task_comments` — with is_internal flag (ast_lead internal notes vs. visible to all)
- `task_attachments` — Supabase Storage; photo evidence on completion
- `audit_log` — immutable record of all state changes
- `notifications_log` — tracks sent emails/WhatsApp messages
- `notification_settings` — per-user configurable notification preferences (UI-managed)

### Critical design notes
- Tasks are never deleted; use `cancelled` status
- `template_id` on tasks links scheduled instances back to their template
- `is_compliance` + `legislation_ref` flags drive trustee reporting
- `audit_log` inserts via service role only (no user RLS insert policy)
- `public_submission: true` flag on tasks created via the public form

---

## Row Level Security

All tables have RLS enabled. Role determined via helper function `current_user_role()` reading from `profiles`.

- Public submissions: anonymous insert only on `tasks` where `public_submission = true`
- Volunteers: read/write only tasks at their `site_ids`
- Owners: same as volunteer
- AST leads: full read/write across all sites and templates
- Trustees: read-only on tasks, audit_log, notifications_log
- No one can delete tasks (cancelled status only)

---

## Notification Settings (UI-Configurable)

Notification events and their defaults are stored in `notification_settings` and can be toggled per-user from a settings page. AST leads can also set org-wide defaults.

| Event | Default Recipients | Configurable? |
|---|---|---|
| Task assigned to me | Assignee | Yes — per user |
| Task due in N days | Assignee | Yes — threshold configurable |
| Task overdue | Assignee + AST leads | Yes — per user |
| Compliance task overdue | AST leads + Trustees | Yes — per user |
| New reactive task created | AST leads | Yes — per user |
| New public submission | AST leads | Yes — per user |
| Contractor lead time alert | AST leads | Yes — threshold configurable |
| Weekly digest | AST leads + Trustees | Yes — can disable |

All notification rules are managed in the app UI under **Settings → Notifications**. No code changes needed to adjust them.

---

## Project Structure

```
nds-maintenance/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_seed_data.sql
│       └── 004_task_templates.sql
├── src/
│   ├── app/
│   │   ├── (auth)/login/             # Magic link login
│   │   ├── (auth)/callback/          # Supabase auth callback
│   │   ├── report/[site-slug]/       # Public submission form (no auth)
│   │   └── (app)/
│   │       ├── layout.tsx            # Role-aware sidebar + mobile nav
│   │       ├── dashboard/            # AST lead overview
│   │       ├── tasks/                # List, new, [id] detail
│   │       ├── schedules/            # Recurring templates (ast_lead)
│   │       ├── reports/              # Trustee dashboard
│   │       ├── settings/
│   │       │   └── notifications/    # Per-user notification preferences
│   │       └── admin/users/          # User management
│   │   └── api/
│   │       ├── cron/daily/           # Combined daily cron
│   │       └── webhooks/resend/      # Email delivery webhooks
│   ├── components/
│   │   ├── ui/                       # shadcn/ui (auto-generated)
│   │   ├── layout/                   # Sidebar, Header, MobileNav, RoleGuard
│   │   ├── tasks/                    # TaskCard, TaskCreateForm, TaskTimeline, etc.
│   │   ├── public/                   # PublicReportForm (no auth required)
│   │   ├── schedules/                # TemplateForm, RecurrenceSelector
│   │   ├── dashboard/                # OverviewCards, ComplianceStatusBar, etc.
│   │   ├── reports/                  # ComplianceSummary, ExportButton
│   │   ├── settings/                 # NotificationPreferences
│   │   └── shared/                   # PriorityBadge, StatusBadge, EmptyState
│   └── lib/
│       ├── supabase/                 # client.ts, server.ts, admin.ts, types.ts
│       ├── actions/                  # Server Actions: tasks.ts, templates.ts, users.ts
│       ├── notifications/            # email.ts, whatsapp.ts, React Email templates
│       └── scheduling/               # generate-tasks.ts, recurrence.ts
```

---

## Phased Delivery

### Phase 1 — Running ASAP (MVP)
Goal: Something live that the team can use immediately.

- Supabase schema + RLS
- Next.js on Vercel (auto-deploy from GitHub)
- Magic link auth + user management (invite flow)
- Reactive task creation — mobile-first: 3 fields, big buttons
- Public report form at `/report/overstone` — no login
- Task list + detail + comments
- Status updates by volunteers
- AST lead task assignment
- Basic dashboard (open/overdue counts)
- Seed data: Overstone, buildings, asset categories

### Phase 2 — Scheduling + Notifications
- Task template UI (ast_lead)
- Daily cron: generate tasks from templates
- Email notifications via Resend
- Notification settings UI (per-user preferences)
- Overdue escalation
- Photo/file attachments on completion
- Seed: full compliance schedule from PHC Fire Risk Assessment

### Phase 3 — Trustee Reporting
- Read-only trustee dashboard (RAG per site)
- Statutory compliance view (last completion dates)
- CSV + PDF export
- Monthly compliance digest email

### Phase 4 — WhatsApp + Domain + Polish
- WhatsApp via Twilio (opt-in)
- Custom domain connection
- Camera-first photo capture on mobile
- PWA manifest (add to home screen)
- Quick-complete from notification email (magic link)
- Bulk operations for AST leads

---

## Production Infrastructure

| Service | Plan | Cost |
|---|---|---|
| Vercel | Hobby | Free |
| Supabase | Free | Free |
| Resend | Free (3k emails) | Free |
| Custom domain | Phase 4 only | ~£1/mo when connected |
| Twilio WhatsApp | Phase 4, pay-per-use | ~£2-5/mo |
| **Total (Phase 1-3)** | | **£0/month** |

**Supabase region:** eu-west-2 (closest to Northampton)
**Auth:** Magic links only — no passwords

### Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
CRON_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
# Phase 4:
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_NUMBER
```

---

## UX Principles for SASU Volunteers

- Minimum 48px touch targets (WCAG 2.1 AA)
- Plain English everywhere: "Safety issue" not "priority: critical"
- Three-field reactive task form: Site → Problem → Urgency → Submit
- Bottom navigation bar on mobile (not sidebar)
- Success screen: "Your report has been sent. The team will look at it soon."
- Font size minimum 16px body
- A5 laminated card at each building: "Spot a problem?" + QR code to public report form

---

## First Files to Create (Blocking Everything Else)

1. `supabase/migrations/001_initial_schema.sql` — All tables + indexes
2. `supabase/migrations/002_rls_policies.sql` — Security boundary
3. `src/lib/supabase/types.ts` — Generated from schema (`supabase gen types`)
4. `src/lib/actions/tasks.ts` — Core Server Actions (createTask, updateStatus, assign, complete)
5. `src/app/(app)/layout.tsx` — Role-aware shell, all pages depend on this

---

## Verification

- Phase 1: Log in as volunteer → create task → AST lead assigns → volunteer marks complete → appears in dashboard
- Phase 1: Visit `/report/overstone` without login → submit issue → appears in AST lead dashboard
- Phase 2: Create template → run cron manually → verify task created → trigger email
- Phase 3: Log in as trustee → verify no write access → export CSV
- Phase 4: Opt in to WhatsApp → create task → verify Twilio message received
