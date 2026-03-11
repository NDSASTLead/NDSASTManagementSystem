-- Migration 009: Profile prompt dismissal tracking
-- Adds a column to track when a user last dismissed the "complete your profile" banner.
-- The banner re-appears after PROFILE_PROMPT_INTERVAL_DAYS if the profile is still incomplete.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_prompt_dismissed_at TIMESTAMPTZ NULL;
