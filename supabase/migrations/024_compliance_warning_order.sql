-- Amber warning starts earlier than the red warning, so it must have a
-- strictly larger day count.
UPDATE compliance_obligations
SET red_days = GREATEST(red_days, 0),
    notice_days = GREATEST(notice_days, GREATEST(red_days, 0) + 1)
WHERE red_days < 0
   OR notice_days < 0
   OR notice_days <= red_days;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'compliance_obligations_warning_order_check'
      AND conrelid = 'public.compliance_obligations'::regclass
  ) THEN
    ALTER TABLE compliance_obligations
      ADD CONSTRAINT compliance_obligations_warning_order_check
      CHECK (red_days >= 0 AND notice_days > red_days);
  END IF;
END $$;
