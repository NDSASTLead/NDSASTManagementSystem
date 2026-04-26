-- ============================================================
-- Unify site access: user_has_site_access now checks BOTH
-- profile_sites (volunteers / direct assignment) AND
-- profile_responsibilities (responsible_persons assigned via
-- the compliance responsibilities editor).
--
-- Previously a responsible_person given site responsibilities
-- could see compliance items but was blocked from tasks by RLS
-- because user_has_site_access only read profile_sites.
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_has_site_access(p_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profile_sites
    WHERE profile_id = auth.uid()
      AND site_id = p_site_id
  )
  OR EXISTS (
    SELECT 1 FROM profile_responsibilities
    WHERE profile_id = auth.uid()
      AND site_id = p_site_id
  )
$$;
