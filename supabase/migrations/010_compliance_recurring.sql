-- ============================================================
-- Phase 8: Compliance Register, Recurring Maintenance and Roles
-- ============================================================

-- 1. RENAME owner ROLE to responsible_person; ADD safety_officer

UPDATE profiles SET role = 'responsible_person' WHERE role = 'owner';

ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('volunteer','responsible_person','safety_officer','ast_lead','trustee'));

-- Update existing RLS policies that reference 'owner' role
DROP POLICY IF EXISTS "tasks: site member insert" ON tasks;
CREATE POLICY "tasks: site member insert"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('ast_lead', 'safety_officer', 'volunteer', 'responsible_person')
    AND (
      current_user_role() IN ('ast_lead', 'safety_officer')
      OR user_has_site_access(site_id)
    )
  );

DROP POLICY IF EXISTS "tasks: assignee update" ON tasks;
CREATE POLICY "tasks: assignee update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    current_user_role() IN ('ast_lead', 'safety_officer')
    OR (
      current_user_role() IN ('volunteer', 'responsible_person')
      AND assigned_to = auth.uid()
    )
  );

-- 2. NEW TABLE: profile_responsibilities
-- Cross-site/category scope for responsible_person role
-- e.g. a plumber responsible for legionella across all sites

CREATE TABLE profile_responsibilities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  category    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, site_id, category)
);

CREATE INDEX idx_profile_resp_profile ON profile_responsibilities(profile_id);
CREATE INDEX idx_profile_resp_site    ON profile_responsibilities(site_id);

-- 3. NEW TABLE: compliance_obligations

CREATE TABLE compliance_obligations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN (
                    'fire_safety','legionella','electrical','equipment',
                    'first_aid','coshh','risk_assessment','other')),
  legislation_ref TEXT,
  frequency       TEXT NOT NULL CHECK (frequency IN (
                    'daily','weekly','monthly','quarterly',
                    'biannual','annual','5_yearly','custom')),
  frequency_days  INT,
  notice_days     INT NOT NULL DEFAULT 14,
  red_days        INT NOT NULL DEFAULT 0,
  owner_role      TEXT CHECK (owner_role IN (
                    'volunteer','responsible_person','safety_officer',
                    'ast_lead','trustee','contractor')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_site ON compliance_obligations(site_id);

-- 4. NEW TABLE: compliance_buildings (many-to-many)
-- No rows = obligation applies to whole site

CREATE TABLE compliance_buildings (
  obligation_id UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  building_id   UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  PRIMARY KEY (obligation_id, building_id)
);

-- 5. NEW TABLE: compliance_records

CREATE TABLE compliance_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id   UUID NOT NULL REFERENCES compliance_obligations(id) ON DELETE CASCADE,
  completed_at    TIMESTAMPTZ NOT NULL,
  completed_by    UUID REFERENCES profiles(id),
  contractor_name TEXT,
  notes           TEXT,
  certificate_ref TEXT,
  expiry_date     DATE,
  evidence_path   TEXT,
  task_id         UUID REFERENCES tasks(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_records_obligation ON compliance_records(obligation_id);
CREATE INDEX idx_compliance_records_completed  ON compliance_records(completed_at DESC);

-- 6. NEW TABLE: maintenance_templates

CREATE TABLE maintenance_templates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                  UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  building_id              UUID REFERENCES buildings(id),
  asset_id                 UUID REFERENCES assets(id),
  title                    TEXT NOT NULL,
  description              TEXT,
  category_id              UUID REFERENCES asset_categories(id),
  priority                 TEXT NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low','medium','high','critical')),
  is_compliance            BOOLEAN NOT NULL DEFAULT FALSE,
  legislation_ref          TEXT,
  frequency                TEXT NOT NULL CHECK (frequency IN (
                             'daily','weekly','monthly','quarterly',
                             'biannual','annual','5_yearly','custom')),
  frequency_days           INT,
  notice_days              INT NOT NULL DEFAULT 14,
  assign_to_role           TEXT CHECK (assign_to_role IN (
                             'volunteer','responsible_person','safety_officer',
                             'ast_lead','trustee')),
  compliance_obligation_id UUID REFERENCES compliance_obligations(id) ON DELETE SET NULL,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_at        TIMESTAMPTZ,
  next_generate_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_site     ON maintenance_templates(site_id);
CREATE INDEX idx_templates_generate ON maintenance_templates(next_generate_at)
  WHERE is_active = TRUE;

-- 7. ADD template_id TO TASKS

ALTER TABLE tasks
  ADD COLUMN template_id UUID REFERENCES maintenance_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_template ON tasks(template_id);

-- 8. STORAGE BUCKET: compliance-evidence

INSERT INTO storage.buckets (id, name, public)
VALUES ('compliance-evidence', 'compliance-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- 9. ROW LEVEL SECURITY

ALTER TABLE profile_responsibilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_resp: own read"
  ON profile_responsibilities FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR current_user_role() IN ('ast_lead', 'safety_officer'));

CREATE POLICY "profile_resp: ast_lead write"
  ON profile_responsibilities FOR ALL
  USING (current_user_role() = 'ast_lead');

ALTER TABLE compliance_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_obligations: authenticated read"
  ON compliance_obligations FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "compliance_obligations: safety_officer and ast_lead write"
  ON compliance_obligations FOR ALL
  USING (current_user_role() IN ('ast_lead', 'safety_officer'));

ALTER TABLE compliance_buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_buildings: authenticated read"
  ON compliance_buildings FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "compliance_buildings: safety_officer and ast_lead write"
  ON compliance_buildings FOR ALL
  USING (current_user_role() IN ('ast_lead', 'safety_officer'));

ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_records: authenticated read"
  ON compliance_records FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "compliance_records: write"
  ON compliance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('ast_lead', 'safety_officer')
    OR (
      current_user_role() = 'responsible_person'
      AND EXISTS (
        SELECT 1 FROM compliance_obligations co
        JOIN profile_responsibilities pr
          ON pr.profile_id = auth.uid()
         AND pr.site_id = co.site_id
         AND (pr.category IS NULL OR pr.category = co.category)
        WHERE co.id = obligation_id
      )
    )
  );

CREATE POLICY "compliance_records: ast_lead and safety_officer delete"
  ON compliance_records FOR DELETE
  USING (current_user_role() IN ('ast_lead', 'safety_officer'));

ALTER TABLE maintenance_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_templates: authenticated read"
  ON maintenance_templates FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "maintenance_templates: safety_officer and ast_lead write"
  ON maintenance_templates FOR ALL
  USING (current_user_role() IN ('ast_lead', 'safety_officer'));

CREATE POLICY "compliance_evidence: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'compliance-evidence');

CREATE POLICY "compliance_evidence: write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-evidence'
    AND current_user_role() IN ('ast_lead', 'safety_officer', 'responsible_person')
  );

-- 10. SEED DATA - 16 obligations for ALL active sites

INSERT INTO compliance_obligations
  (site_id, name, category, frequency, notice_days, red_days, legislation_ref)
SELECT
  s.id,
  v.name,
  v.cat,
  v.freq,
  v.notice,
  v.red,
  v.legis
FROM sites s
CROSS JOIN (VALUES
  ('Fire Alarm System Test',            'fire_safety',     'weekly',    3,  0,  'Regulatory Reform (Fire Safety) Order 2005'),
  ('Emergency Lighting Test',           'fire_safety',     'monthly',   7,  0,  'BS 5266'),
  ('Fire Exit Door Check',              'fire_safety',     'weekly',    3,  0,  'RRO 2005'),
  ('Fire Evacuation Drill',             'fire_safety',     'biannual', 14,  0,  'RRO 2005'),
  ('Fire Extinguisher Internal Check',  'fire_safety',     'monthly',   7,  0,  'BS 5306'),
  ('Fire Extinguisher Annual Service',  'fire_safety',     'annual',   30,  7,  'BS 5306'),
  ('PAT Testing',                       'electrical',      'annual',   30,  7,  'Electricity at Work Regs 1989'),
  ('Fixed Wire Testing (EICR)',         'electrical',      '5_yearly', 60, 14,  'Electricity at Work Regs 1989 / BS 7671'),
  ('Ladder Inspection',                 'equipment',       'quarterly',14,  0,  'PUWER 1998'),
  ('Legionella Water Temperature Check','legionella',      'monthly',   7,  0,  'L8 ACOP / HSG274'),
  ('Legionella Shower / Tap Flush',     'legionella',      'weekly',    3,  0,  'L8 ACOP / HSG274'),
  ('Shower Head Descale',               'legionella',      'monthly',   7,  0,  'L8 ACOP / HSG274'),
  ('First Aid Box Inspection',          'first_aid',       'monthly',   7,  0,  'Health and Safety (First Aid) Regs 1981'),
  ('AED (Defibrillator) Check',         'equipment',       'weekly',    3,  0,  'Resuscitation Council guidelines'),
  ('Risk Assessment Review',            'risk_assessment', 'annual',   30,  7,  'Management of H and S at Work Regs 1999'),
  ('COSHH Assessment Review',           'coshh',           'annual',   30,  7,  'COSHH Regs 2002')
) AS v(name, cat, freq, notice, red, legis)
WHERE s.is_active = TRUE;