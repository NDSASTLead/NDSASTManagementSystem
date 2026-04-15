-- ============================================================
-- Compliance Comments
-- Allows ast_lead, safety_officer, ast_member to post comments
-- on compliance obligations.
-- ============================================================

CREATE TABLE IF NOT EXISTS compliance_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  author_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body          TEXT NOT NULL CHECK (char_length(body) > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX compliance_comments_obligation_id_idx ON compliance_comments(obligation_id);
CREATE INDEX compliance_comments_created_at_idx   ON compliance_comments(created_at);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE compliance_comments ENABLE ROW LEVEL SECURITY;

-- Read: anyone who can view compliance can read comments
CREATE POLICY "compliance_comments: read"
  ON compliance_comments FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('ast_lead', 'safety_officer', 'ast_member', 'trustee', 'responsible_person')
  );

-- Insert: only ast_lead, safety_officer, ast_member
CREATE POLICY "compliance_comments: insert"
  ON compliance_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('ast_lead', 'safety_officer', 'ast_member')
    AND author_id = auth.uid()
  );

-- Delete: author can delete own comment; ast_lead can delete any
CREATE POLICY "compliance_comments: delete"
  ON compliance_comments FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR current_user_role() = 'ast_lead'
  );
