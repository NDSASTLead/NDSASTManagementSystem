-- ============================================================
-- NDS Maintenance Tracker - Row Level Security Policies
-- ============================================================

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: check if current user is associated with a site
CREATE OR REPLACE FUNCTION user_has_site_access(p_site_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profile_sites
    WHERE profile_id = auth.uid() AND site_id = p_site_id
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: ast_lead/trustee read all"
  ON profiles FOR SELECT
  USING (current_user_role() IN ('ast_lead', 'trustee'));

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles: ast_lead update any"
  ON profiles FOR UPDATE
  USING (current_user_role() = 'ast_lead');

-- ============================================================
-- SITES
-- ============================================================
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites: authenticated read"
  ON sites FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "sites: public read active"
  ON sites FOR SELECT
  TO anon
  USING (is_active = TRUE);

CREATE POLICY "sites: ast_lead write"
  ON sites FOR ALL
  USING (current_user_role() = 'ast_lead');

-- ============================================================
-- PROFILE_SITES
-- ============================================================
ALTER TABLE profile_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_sites: own read"
  ON profile_sites FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "profile_sites: ast_lead read all"
  ON profile_sites FOR SELECT
  USING (current_user_role() IN ('ast_lead', 'trustee'));

CREATE POLICY "profile_sites: ast_lead write"
  ON profile_sites FOR ALL
  USING (current_user_role() = 'ast_lead');

-- ============================================================
-- BUILDINGS
-- ============================================================
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buildings: authenticated read"
  ON buildings FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "buildings: public read"
  ON buildings FOR SELECT
  TO anon
  USING (is_active = TRUE);

CREATE POLICY "buildings: ast_lead write"
  ON buildings FOR ALL
  USING (current_user_role() = 'ast_lead');

-- ============================================================
-- ASSET_CATEGORIES
-- ============================================================
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_categories: all read"
  ON asset_categories FOR SELECT
  USING (TRUE);

CREATE POLICY "asset_categories: ast_lead write"
  ON asset_categories FOR ALL
  USING (current_user_role() = 'ast_lead');

-- ============================================================
-- ASSETS
-- ============================================================
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets: authenticated read"
  ON assets FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "assets: ast_lead write"
  ON assets FOR ALL
  USING (current_user_role() = 'ast_lead');

-- ============================================================
-- TASKS
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Volunteers/owners see tasks at their sites
CREATE POLICY "tasks: site member read"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('ast_lead', 'trustee')
    OR user_has_site_access(site_id)
  );

-- Volunteers/owners can create reactive tasks at their sites
CREATE POLICY "tasks: site member insert"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('ast_lead', 'volunteer', 'owner')
    AND (
      current_user_role() = 'ast_lead'
      OR user_has_site_access(site_id)
    )
  );

-- Volunteers/owners can update their assigned tasks
CREATE POLICY "tasks: assignee update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    current_user_role() = 'ast_lead'
    OR (
      current_user_role() IN ('volunteer', 'owner')
      AND assigned_to = auth.uid()
    )
  );

-- Public (anonymous) can insert public submissions only
CREATE POLICY "tasks: public submission insert"
  ON tasks FOR INSERT
  TO anon
  WITH CHECK (public_submission = TRUE);

-- ============================================================
-- TASK_COMMENTS
-- ============================================================
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Non-internal comments visible to anyone who can see the task
CREATE POLICY "task_comments: read non-internal"
  ON task_comments FOR SELECT
  TO authenticated
  USING (is_internal = FALSE OR current_user_role() = 'ast_lead');

CREATE POLICY "task_comments: insert"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_internal = FALSE OR current_user_role() = 'ast_lead'
  );

CREATE POLICY "task_comments: own update"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- ============================================================
-- AUDIT_LOG
-- ============================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log: ast_lead/trustee read"
  ON audit_log FOR SELECT
  USING (current_user_role() IN ('ast_lead', 'trustee'));

-- Inserts only via service role (no authenticated insert policy)
