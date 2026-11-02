-- Require a first due date so compliance tracking works before the first
-- completion record exists.
ALTER TABLE compliance_obligations
  ADD COLUMN IF NOT EXISTS initial_due_date DATE;

-- Preserve a sensible schedule for existing obligations: continue from their
-- latest completion where available, otherwise start their first cycle after
-- the existing notice period.
UPDATE compliance_obligations o
SET initial_due_date = COALESCE(
  (
    SELECT r.completed_at::date + COALESCE(o.frequency_days, CASE o.frequency
      WHEN 'daily'     THEN 1
      WHEN 'weekly'    THEN 7
      WHEN 'monthly'   THEN 30
      WHEN 'quarterly' THEN 90
      WHEN 'biannual'  THEN 180
      WHEN 'annual'    THEN 365
      WHEN '5_yearly'  THEN 1825
      ELSE 365
    END)
    FROM compliance_records r
    WHERE r.obligation_id = o.id
    ORDER BY r.completed_at DESC
    LIMIT 1
  ),
  CURRENT_DATE + o.notice_days
)
WHERE initial_due_date IS NULL;

ALTER TABLE compliance_obligations
  ALTER COLUMN initial_due_date SET NOT NULL;

-- Ensure existing active obligations also have an open task for their current
-- due date, including those that have never had a completion record.
INSERT INTO tasks (
  site_id,
  title,
  task_type,
  status,
  priority,
  is_compliance,
  legislation_ref,
  assigned_to,
  due_date,
  compliance_obligation_id,
  public_submission
)
SELECT
  o.site_id,
  '[Compliance] ' || o.name,
  'scheduled',
  'open',
  CASE WHEN due.due_date < CURRENT_DATE THEN 'high' ELSE 'medium' END,
  TRUE,
  o.legislation_ref,
  o.owner_profile_id,
  due.due_date,
  o.id,
  FALSE
FROM compliance_obligations o
CROSS JOIN LATERAL (
  SELECT COALESCE(
    (
      SELECT r.completed_at::date + COALESCE(o.frequency_days, CASE o.frequency
        WHEN 'daily'     THEN 1
        WHEN 'weekly'    THEN 7
        WHEN 'monthly'   THEN 30
        WHEN 'quarterly' THEN 90
        WHEN 'biannual'  THEN 180
        WHEN 'annual'    THEN 365
        WHEN '5_yearly'  THEN 1825
        ELSE 365
      END)
      FROM compliance_records r
      WHERE r.obligation_id = o.id
      ORDER BY r.completed_at DESC
      LIMIT 1
    ),
    o.initial_due_date
  ) AS due_date
) due
WHERE o.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM tasks t
    WHERE t.compliance_obligation_id = o.id
      AND t.status NOT IN ('complete', 'cancelled')
  );
