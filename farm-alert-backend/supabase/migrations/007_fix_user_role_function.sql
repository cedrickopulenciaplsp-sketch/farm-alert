-- Migration 007: Fix current_user_role function to check user_metadata and email
-- When manually creating users in the Supabase Dashboard, custom fields often
-- end up in `user_metadata` rather than `app_metadata`. Sometimes they might
-- even be missing entirely. This update ensures the RLS policies check both 
-- locations, and falls back to matching the email address for testing accounts.

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    LOWER((auth.jwt() -> 'app_metadata' ->> 'role')::TEXT),
    LOWER((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT),
    CASE 
      WHEN LOWER(auth.jwt() ->> 'email') LIKE 'admin@%' THEN 'admin'
      WHEN LOWER(auth.jwt() ->> 'email') LIKE 'cvo@%' THEN 'cvo_officer'
      ELSE NULL
    END
  );
$$;
