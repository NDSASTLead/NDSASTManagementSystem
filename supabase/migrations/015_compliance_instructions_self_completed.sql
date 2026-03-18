-- Migration 015: Add instructions + self_completed, split Overstone emergency lighting by building

DO $$
DECLARE
  v_site_id UUID;
BEGIN
  -- 1. Add new columns (safe to run on existing DB)
  ALTER TABLE compliance_obligations
    ADD COLUMN IF NOT EXISTS instructions   TEXT,
    ADD COLUMN IF NOT EXISTS self_completed BOOLEAN NOT NULL DEFAULT FALSE;

  -- 2. Locate Overstone site
  SELECT id INTO v_site_id FROM sites WHERE slug = 'overstone';

  IF v_site_id IS NULL THEN
    RAISE NOTICE 'Overstone site not found — skipping Overstone-specific changes';
    RETURN;
  END IF;

  -- 3. Mark the three split fire-alarm obligations as self_completed
  UPDATE compliance_obligations
  SET self_completed = TRUE
  WHERE site_id = v_site_id
    AND name IN (
      'Fire Alarm Test – Will Smith Building',
      'Fire Alarm Test – Knights Lodge',
      'Fire Alarm Test – Toilet Block (Field)'
    );

  -- 4. Deactivate the generic Emergency Lighting Test for Overstone
  UPDATE compliance_obligations
  SET is_active = FALSE
  WHERE site_id = v_site_id
    AND name = 'Emergency Lighting Test';

  -- 5. Insert three building-specific emergency lighting obligations
  WITH new_obs AS (
    INSERT INTO compliance_obligations
      (site_id, name, category, frequency, notice_days, red_days, legislation_ref, self_completed)
    VALUES
      (v_site_id, 'Emergency Lighting Test – Will Smith Building',  'fire_safety', 'monthly', 7, 0, 'BS 5266', TRUE),
      (v_site_id, 'Emergency Lighting Test – Knights Lodge',        'fire_safety', 'monthly', 7, 0, 'BS 5266', TRUE),
      (v_site_id, 'Emergency Lighting Test – Toilet Block (Field)', 'fire_safety', 'monthly', 7, 0, 'BS 5266', TRUE)
    RETURNING id, name
  )
  INSERT INTO compliance_buildings (obligation_id, building_id)
  SELECT o.id, b.id
  FROM new_obs o
  JOIN buildings b ON b.site_id = v_site_id
    AND (
      (o.name = 'Emergency Lighting Test – Will Smith Building'  AND b.name = 'Will Smith Building')
      OR (o.name = 'Emergency Lighting Test – Knights Lodge'        AND b.name = 'Knights Lodge')
      OR (o.name = 'Emergency Lighting Test – Toilet Block (Field)' AND b.name = 'Toilet Block - Field')
    );

END $$;
