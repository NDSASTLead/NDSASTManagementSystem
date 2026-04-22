-- ============================================================
-- Expand task_attachments DELETE policy
-- Previously: ast_lead only
-- Now: ast_lead, safety_officer, ast_member
-- ============================================================

DROP POLICY IF EXISTS "attachments: ast_lead delete" ON task_attachments;

CREATE POLICY "attachments: staff delete"
  ON task_attachments FOR DELETE
  USING (current_user_role() IN ('ast_lead', 'safety_officer', 'ast_member'));
