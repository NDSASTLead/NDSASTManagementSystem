-- Add owner_profile_id to compliance_obligations so obligations can be
-- assigned directly to a specific individual (in addition to a role).

ALTER TABLE compliance_obligations
  ADD COLUMN IF NOT EXISTS owner_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for lookups by assigned person
CREATE INDEX IF NOT EXISTS idx_compliance_obligations_owner_profile
  ON compliance_obligations(owner_profile_id)
  WHERE owner_profile_id IS NOT NULL;
