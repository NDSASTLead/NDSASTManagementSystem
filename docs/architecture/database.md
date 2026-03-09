# Database Architecture

**Engine:** PostgreSQL (via Supabase)
**Region:** eu-west-2 (London — closest to Northampton)
**RLS:** Enabled on all tables

---

## Tables

### `profiles`
Extends `auth.users`. Created automatically by the `handle_new_user` trigger when a new Supabase auth user is created.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Matches `auth.users.id` |
| `full_name` | TEXT | Required |
| `display_name` | TEXT | Optional, shown in UI |
| `email` | TEXT | Copied from auth |
| `phone` | TEXT | Optional |
| `whatsapp_opt_in` | BOOLEAN | Default false |
| `role` | TEXT | `volunteer \| owner \| ast_lead \| trustee` |
| `is_active` | BOOLEAN | Default true; deactivated users lose access |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger |

**Trigger:** `handle_new_user()` — fires `AFTER INSERT ON auth.users`. Creates a `profiles` row using `raw_user_meta_data` (full_name, role passed at invite time).

> ⚠️ The trigger function must use `SET search_path = public` and fully-qualify `public.profiles`. Without this, `SECURITY DEFINER` functions fail to resolve the table. See `DEV_NOTES.md §2`.

---

### `sites`
Physical locations managed by NDS.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT | Full name e.g. "Overstone Scout Activity Centre" |
| `short_name` | TEXT | e.g. "Overstone" |
| `slug` | TEXT UNIQUE | URL-safe e.g. "overstone" — used in `/report/[site-slug]` |
| `address` | TEXT | |
| `postcode` | TEXT | |
| `description` | TEXT | |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | |

**Current data:** Overstone Scout Activity Centre only (Phase 1). YHF and Fernie Fields planned for later phases.

---

### `profile_sites`
Many-to-many: which volunteers/owners can access which sites.

| Column | Type | Notes |
|--------|------|-------|
| `profile_id` | UUID FK → profiles | |
| `site_id` | UUID FK → sites | |
| PRIMARY KEY | (profile_id, site_id) | |

> `ast_lead` and `trustee` roles have district-wide access and do **not** need entries here.

---

### `buildings`
Sub-units within a site.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK → sites | |
| `name` | TEXT | e.g. "Pack Holiday Centre" |
| `description` | TEXT | |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | |

**Current buildings at Overstone:**
- Pack Holiday Centre
- Will Smith Building
- Archive / Store
- Grounds / External

---

### `asset_categories`
Classification for types of work.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT UNIQUE | e.g. "Fire Safety" |
| `icon` | TEXT | Lucide icon name e.g. "flame" |
| `colour` | TEXT | Tailwind color name e.g. "red" |

**Current categories:** Fire Safety, Electrical, Structural, Plumbing, Grounds, Security, Equipment, General.

---

### `assets`
Individual tracked items (not yet used heavily — Phase 3+).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK → sites | |
| `building_id` | UUID FK → buildings | |
| `category_id` | UUID FK → asset_categories | |
| `name` | TEXT | e.g. "Fire extinguisher — corridor 1" |
| `description` | TEXT | |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | |

---

### `tasks` ⭐ Core table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `site_id` | UUID FK → sites | Required |
| `building_id` | UUID FK → buildings | Optional |
| `asset_id` | UUID FK → assets | Optional |
| `category_id` | UUID FK → asset_categories | Optional |
| `title` | TEXT | Required — plain English description |
| `description` | TEXT | Optional extended detail |
| `location_detail` | TEXT | Free-text location for public submissions |
| `task_type` | TEXT | `scheduled \| reactive` |
| `priority` | TEXT | `low \| medium \| high \| critical` |
| `is_compliance` | BOOLEAN | True = statutory/compliance task |
| `legislation_ref` | TEXT | Reference standard e.g. "BS 5839" |
| `public_submission` | BOOLEAN | True = submitted via public form (no login) |
| `submitter_name` | TEXT | Name from public form (optional) |
| `status` | TEXT | See status flow below |
| `due_date` | DATE | Optional |
| `completed_at` | TIMESTAMPTZ | Set when status → complete |
| `overdue_notified_at` | TIMESTAMPTZ | Tracks when overdue notification was sent |
| `created_by` | UUID FK → profiles | |
| `assigned_to` | UUID FK → profiles | |
| `completed_by` | UUID FK → profiles | |
| `reviewed_by` | UUID FK → profiles | |
| `completion_notes` | TEXT | Added when marking complete |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated by trigger |

**Status flow:**
```
open → assigned → in_progress → pending_review → complete
                                               ↗
                             (ast_lead can skip review)
any → cancelled  (ast_lead only, irreversible in UI)
```

**Indexes:**
- `idx_tasks_site_status (site_id, status)` — dashboard + list queries
- `idx_tasks_due_date (due_date)` — overdue detection
- `idx_tasks_assigned_to (assigned_to)` — "my tasks" queries
- `idx_tasks_status (status)` — status filter
- `idx_tasks_public (public_submission)` — public submission views

> Tasks are **never deleted**. Use `cancelled` status. This preserves audit history.

---

### `task_comments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `task_id` | UUID FK → tasks CASCADE | Deletes comments if task is deleted (not used — tasks aren't deleted) |
| `author_id` | UUID FK → profiles | Null for anonymous public submissions |
| `body` | TEXT | Comment text |
| `is_internal` | BOOLEAN | If true: only visible to `ast_lead`. Used for internal notes. |
| `created_at` | TIMESTAMPTZ | |

**Index:** `idx_task_comments_task (task_id)`

---

### `task_attachments`
Photos attached to tasks. Stored in Supabase Storage (`task-photos` bucket).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `task_id` | UUID FK → tasks | |
| `storage_path` | TEXT | e.g. `{task_id}/{uuid}.jpg` |
| `original_filename` | TEXT | Original file name from user's device |
| `file_size` | BIGINT | Bytes (after client-side compression) |
| `mime_type` | TEXT | e.g. `image/jpeg` |
| `uploaded_by` | UUID FK → profiles | Null for public form uploads |
| `created_at` | TIMESTAMPTZ | |

**Storage bucket:** `task-photos` (private, no public URLs)
**Access:** Signed URLs (60 minute expiry) generated server-side via `getSignedUrls()`
**Limits:** Max 5 MB per file, max 10 photos per task (enforced in server action)

---

### `audit_log`
Immutable record of all significant state changes. Written by service role only — no user can insert or update.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `entity_type` | TEXT | e.g. `task`, `profile` |
| `entity_id` | UUID | The record that changed |
| `action` | TEXT | e.g. `status_changed`, `assigned` |
| `old_values` | JSONB | Previous state |
| `new_values` | JSONB | New state |
| `actor_id` | UUID FK → profiles | Who made the change |
| `actor_name` | TEXT | Denormalised name (in case profile is deleted) |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `idx_audit_entity (entity_type, entity_id)`, `idx_audit_created_at (created_at)`

> Audit log writes are not yet wired up in the application (Phase 3+). The table and RLS are in place.

---

## Helper Functions (SQL)

### `current_user_role()`
Returns the `role` from `profiles` for the current authenticated user.
Used in RLS policies to avoid subquery repetition.

```sql
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
```

### `user_has_site_access(p_site_id UUID)`
Returns true if the current user has an entry in `profile_sites` for the given site.

```sql
CREATE OR REPLACE FUNCTION user_has_site_access(p_site_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_sites
    WHERE profile_id = auth.uid() AND site_id = p_site_id
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
```

---

## Row Level Security Policies

### `profiles`
| Policy | Operation | Rule |
|--------|-----------|------|
| own read | SELECT | `id = auth.uid()` |
| ast_lead/trustee read all | SELECT | `current_user_role() IN ('ast_lead', 'trustee')` |
| own update | UPDATE | `id = auth.uid()` |
| ast_lead update any | UPDATE | `current_user_role() = 'ast_lead'` |

### `sites`
| Policy | Operation | Rule |
|--------|-----------|------|
| authenticated read | SELECT | `auth.role() = 'authenticated' AND is_active` |
| public read active | SELECT | `is_active = true` |
| ast_lead write | INSERT/UPDATE | `current_user_role() = 'ast_lead'` |

### `tasks`
| Policy | Operation | Rule |
|--------|-----------|------|
| site member read | SELECT | `ast_lead/trustee` OR `user_has_site_access(site_id)` |
| site member insert | INSERT | `ast_lead` OR (`volunteer/owner` AND `user_has_site_access(site_id)`) |
| assignee update | UPDATE | `ast_lead` OR (`volunteer/owner` AND `assigned_to = auth.uid()`) |
| public submission insert | INSERT | `public_submission = true` (allows anon) |

### `task_comments`
| Policy | Operation | Rule |
|--------|-----------|------|
| read non-internal | SELECT | `NOT is_internal` OR `ast_lead` |
| insert | INSERT | `NOT is_internal` OR `ast_lead` |
| own update | UPDATE | `author_id = auth.uid()` |

### `task_attachments`
| Policy | Operation | Rule |
|--------|-----------|------|
| site member read | SELECT | Mirrors tasks SELECT policy (via site_id lookup) |
| site member insert | INSERT | Authenticated, mirrors tasks INSERT |
| ast_lead delete | DELETE | `current_user_role() = 'ast_lead'` |

### `audit_log`
| Policy | Operation | Rule |
|--------|-----------|------|
| ast_lead/trustee read | SELECT | `current_user_role() IN ('ast_lead', 'trustee')` |
| No user insert | — | No INSERT policy; service role only |

---

## Triggers

### `handle_new_user`
Fires `AFTER INSERT ON auth.users`.
Creates a `profiles` row from the inviting user's metadata.

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### `set_updated_at`
Fires `BEFORE UPDATE` on `tasks` and `profiles`.
Sets `updated_at = NOW()`.

---

## Running Migrations

Migrations are plain SQL files run manually in the Supabase SQL Editor.
Run in order on each new project:

```
supabase/migrations/001_initial_schema.sql  ← Tables, triggers, helper functions
supabase/migrations/002_rls_policies.sql    ← All RLS policies
supabase/migrations/003_seed_data.sql       ← Overstone + buildings + categories
supabase/migrations/004_attachments.sql     ← task_attachments + storage bucket
```

> There is no CLI migration runner configured. Apply each file manually via the SQL Editor.
