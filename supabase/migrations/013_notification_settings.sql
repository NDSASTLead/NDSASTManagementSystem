-- Notification settings — per-user preferences for each event type
CREATE TABLE notification_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN (
                'task_assigned',
                'task_overdue',
                'public_submission',
                'compliance_overdue'
              )),
  enabled     BOOLEAN NOT NULL DEFAULT true,
  threshold_days INT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, event_type)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can read + update their own settings
CREATE POLICY "Users manage own notification settings"
  ON notification_settings
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
