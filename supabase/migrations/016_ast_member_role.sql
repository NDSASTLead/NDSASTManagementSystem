-- ============================================================
-- Add ast_member role
-- Full read access across all sites; can create and update
-- assigned tasks, but no admin/write access to system config.
-- ============================================================

-- 1. UPDATE ROLE CHECK CONSTRAINT ON PROFILES
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'volunteer',
    'responsible_person',
    'safety_officer',
    'ast_member',
    'ast_lead',
    'trustee'
  ));

-- 2. UPDATE owner_role CHECK ON COMPLIANCE_OBLIGATIONS
ALTER TABLE compliance_obligations DROP CONSTRAINT compliance_obligations_owner_role_check;
ALTER TABLE compliance_obligations ADD CONSTRAINT compliance_obligations_owner_role_check
  CHECK (owner_role IN (
    'volunteer', 'responsible_person', 'safety_officer',
    'ast_member', 'ast_lead', 'trustee', 'contractor'
  ));

-- 3. UPDATE assign_to_role CHECK ON MAINTENANCE_TEMPLATES
ALTER TABLE maintenance_templates DROP CONSTRAINT maintenance_templates_assign_to_role_check;
ALTER TABLE maintenance_templates ADD CONSTRAINT maintenance_templates_assign_to_role_check
  CHECK (assign_to_role IN (
    'volunteer', 'responsible_person', 'safety_officer',
    'ast_member', 'ast_lead', 'trustee'
  ));

-- 4. TASKS: district-wide read (ast_member + safety_officer added)
DROP POLICY IF EXISTS "tasks: site member read" ON tasks;
CREATE POLICY "tasks: site member read"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('ast_lead', 'trustee', 'safety_officer', 'ast_member')
    OR user_has_site_access(site_id)
  );

-- 5. TASKS: insert at any site (ast_member added alongside safety_officer)
DROP POLICY IF EXISTS "tasks: site member insert" ON tasks;
CREATE POLICY "tasks: site member insert"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('ast_lead', 'safety_officer', 'ast_member', 'volunteer', 'responsible_person')
    AND (
      current_user_role() IN ('ast_lead', 'safety_officer', 'ast_member')
      OR user_has_site_access(site_id)
    )
  );

-- 6. TASKS: update — ast_member can update any task (like ast_lead/safety_officer)
DROP POLICY IF EXISTS "tasks: assignee update" ON tasks;
CREATE POLICY "tasks: assignee update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    current_user_role() IN ('ast_lead', 'safety_officer', 'ast_member')
    OR (
      current_user_role() IN ('volunteer', 'responsible_person')
      AND assigned_to = auth.uid()
    )
  );

-- 7. PROFILES: ast_member can read all profiles (needed for assignee lookups etc.)
DROP POLICY IF EXISTS "profiles: ast_lead/trustee read all" ON profiles;
CREATE POLICY "profiles: ast_lead/trustee read all"
  ON profiles FOR SELECT
  USING (current_user_role() IN ('ast_lead', 'trustee', 'ast_member'));

-- 8. PROFILE_SITES: ast_member can read all site assignments
DROP POLICY IF EXISTS "profile_sites: ast_lead read all" ON profile_sites;
CREATE POLICY "profile_sites: ast_lead read all"
  ON profile_sites FOR SELECT
  USING (current_user_role() IN ('ast_lead', 'trustee', 'ast_member'));

-- 9. TASK_COMMENTS: ast_member can read and post internal comments
DROP POLICY IF EXISTS "task_comments: read non-internal" ON task_comments;
CREATE POLICY "task_comments: read non-internal"
  ON task_comments FOR SELECT
  TO authenticated
  USING (is_internal = FALSE OR current_user_role() IN ('ast_lead', 'ast_member'));

DROP POLICY IF EXISTS "task_comments: insert" ON task_comments;
CREATE POLICY "task_comments: insert"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_internal = FALSE OR current_user_role() IN ('ast_lead', 'ast_member')
  );

-- 10. AUDIT LOG: ast_member can read (internal staff visibility)
DROP POLICY IF EXISTS "audit_log: ast_lead/trustee read" ON audit_log;
CREATE POLICY "audit_log: ast_lead/trustee read"
  ON audit_log FOR SELECT
  USING (current_user_role() IN ('ast_lead', 'trustee', 'ast_member'));

-- 11. TASK ATTACHMENTS: ast_member can read all and upload
DROP POLICY IF EXISTS "attachments: ast_lead/trustee read all" ON task_attachments;
CREATE POLICY "attachments: ast_lead/trustee read all"
  ON task_attachments FOR SELECT
  USING (current_user_role() IN ('ast_lead', 'trustee', 'ast_member'));

DROP POLICY IF EXISTS "attachments: authenticated insert" ON task_attachments;
CREATE POLICY "attachments: authenticated insert"
  ON task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('ast_lead', 'ast_member', 'safety_officer', 'volunteer', 'responsible_person')
    AND (
      current_user_role() IN ('ast_lead', 'ast_member', 'safety_officer')
      OR EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_id
          AND user_has_site_access(t.site_id)
      )
    )
  );
