-- Split the generic Overstone "Fire Alarm System Test" into three building-specific obligations:
-- Will Smith Building, Knights Lodge, and Toilet Block - Field

DO $$
DECLARE
  v_site_id UUID;
BEGIN
  SELECT id INTO v_site_id FROM sites WHERE slug = 'overstone';

  IF v_site_id IS NULL THEN
    RAISE NOTICE 'Overstone site not found — skipping migration 014';
    RETURN;
  END IF;

  -- 1. Deactivate the existing generic obligation
  UPDATE compliance_obligations
  SET is_active = false
  WHERE site_id = v_site_id
    AND name = 'Fire Alarm System Test';

  -- 2. Insert three new obligations and link each to its building
  WITH new_obs AS (
    INSERT INTO compliance_obligations (site_id, name, category, frequency, notice_days, red_days, legislation_ref)
    VALUES
      (v_site_id, 'Fire Alarm Test – Will Smith Building',  'fire_safety', 'weekly', 3, 0, 'Regulatory Reform (Fire Safety) Order 2005'),
      (v_site_id, 'Fire Alarm Test – Knights Lodge',        'fire_safety', 'weekly', 3, 0, 'Regulatory Reform (Fire Safety) Order 2005'),
      (v_site_id, 'Fire Alarm Test – Toilet Block (Field)', 'fire_safety', 'weekly', 3, 0, 'Regulatory Reform (Fire Safety) Order 2005')
    RETURNING id, name
  )
  INSERT INTO compliance_buildings (obligation_id, building_id)
  SELECT o.id, b.id
  FROM new_obs o
  JOIN buildings b ON b.site_id = v_site_id
    AND (
      (o.name = 'Fire Alarm Test – Will Smith Building'  AND b.name = 'Will Smith Building')
      OR (o.name = 'Fire Alarm Test – Knights Lodge'        AND b.name = 'Knights Lodge')
      OR (o.name = 'Fire Alarm Test – Toilet Block (Field)' AND b.name = 'Toilet Block - Field')
    );
END $$;
