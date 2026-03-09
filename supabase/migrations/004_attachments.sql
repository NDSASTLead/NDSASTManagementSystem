-- ============================================================
-- NDS Maintenance Tracker - Task Attachments & Photo Storage
-- ============================================================

-- ============================================================
-- TASK_ATTACHMENTS
-- Stores metadata for photos attached to tasks.
-- Actual files live in the 'task-photos' Supabase Storage bucket.
-- ============================================================
CREATE TABLE task_attachments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  storage_path      TEXT        NOT NULL,          -- e.g. task-photos/{task_id}/{uuid}.jpg
  original_filename TEXT        NOT NULL,
  file_size         INTEGER     NOT NULL,           -- bytes
  mime_type         TEXT        NOT NULL,
  uploaded_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for public submissions
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);

-- ============================================================
-- ROW LEVEL SECURITY — task_attachments
-- ============================================================
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Read: same access rules as tasks
CREATE POLICY "attachments: ast_lead/trustee read all"
  ON task_attachments FOR SELECT
  USING (current_user_role() IN ('ast_lead', 'trustee'));

CREATE POLICY "attachments: site member read"
  ON task_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
        AND user_has_site_access(t.site_id)
    )
  );

-- Insert: authenticated users with task access + anonymous (public submissions via service role)
CREATE POLICY "attachments: authenticated insert"
  ON task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('ast_lead', 'volunteer', 'owner')
    AND (
      current_user_role() = 'ast_lead'
      OR EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = task_id
          AND user_has_site_access(t.site_id)
      )
    )
  );

-- Delete: ast_lead only
CREATE POLICY "attachments: ast_lead delete"
  ON task_attachments FOR DELETE
  USING (current_user_role() = 'ast_lead');

-- ============================================================
-- STORAGE BUCKET
-- Run this section manually in Supabase SQL Editor, or via
-- the Supabase dashboard Storage UI (create bucket 'task-photos').
-- The INSERT below may fail if the bucket already exists — safe to ignore.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-photos',
  'task-photos',
  false,                    -- private: no public URLs
  5242880,                  -- 5 MB per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS — storage.objects
-- ============================================================

-- Authenticated users can read any photo in the bucket
-- (task-level access is enforced at the application layer via task_attachments table)
CREATE POLICY "task-photos: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-photos');

-- Authenticated users can upload photos
CREATE POLICY "task-photos: authenticated insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-photos');

-- ast_lead can delete photos
CREATE POLICY "task-photos: ast_lead delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ast_lead'
  );
