# Phase 3 — Scheduling & Notifications

**Status:** 🔜 Next up
**Goal:** Automate recurring compliance tasks and alert the team when action is needed.

---

## Objectives

The compliance schedule (fire risk assessments, PAT testing, water hygiene, etc.) is currently managed manually. Missing a statutory deadline has legal and safety consequences. This phase automates that entirely.

---

## Planned Deliverables

### Task Templates
- [ ] `task_templates` table — defines recurring tasks (title, category, frequency, advance_notice_days, is_compliance, legislation_ref)
- [ ] Template management UI (ast_lead only — `/schedules`)
- [ ] Link generated tasks back to their template via `template_id` on tasks

### Daily Cron (Vercel Cron)
- [ ] `app/api/cron/daily/route.ts` — runs once per day via Vercel Cron
- [ ] `lib/scheduling/generate-tasks.ts` — creates task instances from templates when due
- [ ] `lib/scheduling/recurrence.ts` — frequency calculation (weekly, monthly, annual, etc.)
- [ ] `CRON_SECRET` environment variable for authenticated cron calls

### Email Notifications (Resend)
- [ ] Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` environment variables
- [ ] `lib/notifications/email.ts` — Resend API wrapper
- [ ] React Email templates for each notification type
- [ ] Notification events:

| Event | Recipients |
|-------|-----------|
| Task assigned to me | Assignee |
| Task due in N days | Assignee |
| Task overdue | Assignee + ast_leads |
| Compliance task overdue | ast_leads + trustees |
| New public submission | ast_leads |
| New reactive task | ast_leads |

### Notification Settings
- [ ] `notification_settings` table — per-user preferences
- [ ] Settings UI at `/settings/notifications`
- [ ] Configurable thresholds (e.g. "alert me 3 days before due")
- [ ] Per-user opt-out for each event type

### Overdue Escalation
- [ ] Cron checks for overdue tasks daily
- [ ] Records `overdue_notified_at` on task to avoid repeat notifications
- [ ] Compliance tasks escalate to trustees if not resolved within N days

### Audit Log Writes
- [ ] Wire up audit log writes in server actions for key events (status changes, assignment, etc.)

---

## Schema Changes Needed

```sql
-- New table
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  building_id UUID REFERENCES buildings(id),
  category_id UUID REFERENCES asset_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'scheduled',
  priority TEXT DEFAULT 'medium',
  is_compliance BOOLEAN DEFAULT false,
  legislation_ref TEXT,
  frequency TEXT NOT NULL,         -- 'weekly' | 'monthly' | 'quarterly' | 'annual'
  advance_notice_days INT DEFAULT 7,
  assigned_to UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add to tasks
ALTER TABLE tasks ADD COLUMN template_id UUID REFERENCES task_templates(id);

-- New table
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  threshold_days INT,             -- For "due in N days" events
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, event_type)
);
```

---

## New Environment Variables

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@ndsmaintenance.org
CRON_SECRET=some-long-random-secret
```

---

## Verification

```
✓ Create template for "Annual fire alarm test" (compliance)
✓ Run cron manually → task created 7 days before due date
✓ Assign task → assignee receives email notification
✓ Mark overdue → overdue email sent; overdue_notified_at set
✓ Compliance task overdue → trustees also notified
✓ User disables "task assigned" notification → no email sent on assignment
✓ Visit /schedules → see all active templates
```
