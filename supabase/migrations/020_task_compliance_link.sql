-- ============================================================
-- Link tasks back to compliance obligations
-- Allows the system to auto-create and update a scheduled task
-- whenever a compliance record is added, edited or deleted.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS compliance_obligation_id UUID
    REFERENCES compliance_obligations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_compliance_obligation_id_idx
  ON tasks(compliance_obligation_id);

-- Allow the existing tasks RLS policies to cover reads.
-- No new policies needed — the column is simply a FK on an
-- already-protected table.
