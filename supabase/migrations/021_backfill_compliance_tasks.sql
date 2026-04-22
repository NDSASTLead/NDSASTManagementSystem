-- ============================================================
-- Backfill: create scheduled tasks for compliance obligations
-- that already have completion records.
--
-- Run AFTER 020_task_compliance_link.sql
--
-- 5 obligations have records. 4 are already past their next due
-- date and are created as 'high' priority open tasks.
-- 1 (Fixed Wire EICR) is future and is 'medium' priority.
-- ============================================================

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
  '[Compliance] ' || o.name                            AS title,
  'scheduled'                                           AS task_type,
  'open'                                                AS status,
  CASE
    WHEN (next_due.due_date < CURRENT_DATE) THEN 'high'
    ELSE 'medium'
  END                                                   AS priority,
  true                                                  AS is_compliance,
  o.legislation_ref,
  o.owner_profile_id                                    AS assigned_to,
  next_due.due_date,
  o.id                                                  AS compliance_obligation_id,
  false                                                 AS public_submission
FROM compliance_obligations o
JOIN LATERAL (
  -- Calculate next due date from the latest completion record
  SELECT
    (r.completed_at::date
      + COALESCE(o.frequency_days,
          CASE o.frequency
            WHEN 'daily'     THEN 1
            WHEN 'weekly'    THEN 7
            WHEN 'monthly'   THEN 30
            WHEN 'quarterly' THEN 90
            WHEN 'biannual'  THEN 180
            WHEN 'annual'    THEN 365
            WHEN '5_yearly'  THEN 1825
            ELSE 365
          END
        ) * INTERVAL '1 day'
    )::date AS due_date
  FROM compliance_records r
  WHERE r.obligation_id = o.id
  ORDER BY r.completed_at DESC
  LIMIT 1
) next_due ON true
WHERE o.is_active = true
-- Skip if a non-closed task already exists for this obligation
AND NOT EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.compliance_obligation_id = o.id
    AND t.status NOT IN ('complete', 'cancelled')
);
