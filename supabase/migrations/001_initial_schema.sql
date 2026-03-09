-- ============================================================
-- NDS Maintenance Tracker - Initial Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with application-level fields
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  display_name    TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  role            TEXT NOT NULL DEFAULT 'volunteer' CHECK (role IN (
                    'volunteer',
                    'owner',
                    'ast_lead',
                    'trustee'
                  )),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SITES
-- ============================================================
CREATE TABLE sites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  address     TEXT,
  postcode    TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILE_SITES
-- Which sites a volunteer/owner is associated with
-- ast_lead and trustee have district-wide access (no entries needed)
-- ============================================================
CREATE TABLE profile_sites (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id    UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, site_id)
);

-- ============================================================
-- BUILDINGS
-- Sub-units within a site
-- ============================================================
CREATE TABLE buildings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASSET CATEGORIES
-- ============================================================
CREATE TABLE asset_categories (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name   TEXT NOT NULL UNIQUE,
  icon   TEXT,       -- Lucide icon name
  colour TEXT        -- Tailwind colour for badges e.g. 'red', 'blue'
);

-- ============================================================
-- ASSETS
-- Individual tracked items
-- ============================================================
CREATE TABLE assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES asset_categories(id),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location
  site_id     UUID NOT NULL REFERENCES sites(id),
  building_id UUID REFERENCES buildings(id),
  asset_id    UUID REFERENCES assets(id),
  category_id UUID REFERENCES asset_categories(id),

  -- Content
  title       TEXT NOT NULL,
  description TEXT,
  location_detail TEXT,   -- free text "where is it?" for public submissions

  -- Classification
  task_type   TEXT NOT NULL DEFAULT 'reactive' CHECK (task_type IN ('scheduled', 'reactive')),
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_compliance     BOOLEAN NOT NULL DEFAULT FALSE,
  legislation_ref   TEXT,
  public_submission BOOLEAN NOT NULL DEFAULT FALSE,
  submitter_name    TEXT,   -- for public submissions (optional)

  -- Status
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                'open',
                'assigned',
                'in_progress',
                'pending_review',
                'complete',
                'cancelled'
              )),

  -- Dates
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  overdue_notified_at TIMESTAMPTZ,

  -- People
  created_by    UUID REFERENCES profiles(id),
  assigned_to   UUID REFERENCES profiles(id),
  completed_by  UUID REFERENCES profiles(id),
  reviewed_by   UUID REFERENCES profiles(id),

  -- Completion
  completion_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_site_status   ON tasks(site_id, status);
CREATE INDEX idx_tasks_due_date      ON tasks(due_date);
CREATE INDEX idx_tasks_assigned_to   ON tasks(assigned_to);
CREATE INDEX idx_tasks_status        ON tasks(status);
CREATE INDEX idx_tasks_public        ON tasks(public_submission);

-- ============================================================
-- TASK COMMENTS
-- ============================================================
CREATE TABLE task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id),
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

-- ============================================================
-- AUDIT LOG
-- Immutable — inserts via service role only
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  actor_id    UUID REFERENCES profiles(id),
  actor_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity     ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);

-- ============================================================
-- Auto-update updated_at on tasks and profiles
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Auto-create profile on new auth user
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'volunteer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
