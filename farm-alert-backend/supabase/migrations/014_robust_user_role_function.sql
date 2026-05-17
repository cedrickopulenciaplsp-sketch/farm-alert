-- Migration 014: Robust current_user_role with DB fallback
-- Problem: Users created via UserManagement have their role stored in public.users,
-- but the JWT at login time may not include the role in app_metadata or user_metadata
-- (Supabase only embeds metadata that was set BEFORE the session token was issued).
-- This causes current_user_role() to return NULL, which fails all RLS checks.
--
-- Solution: Add a third fallback that looks up the user's role directly from the
-- public.users → roles join using auth.uid(). This works regardless of JWT contents.

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    -- 1. Check app_metadata (set by Supabase Auth hooks or Admin API)
    LOWER((auth.jwt() -> 'app_metadata' ->> 'role')::TEXT),
    -- 2. Check user_metadata (set manually in dashboard)
    LOWER((auth.jwt() -> 'user_metadata' ->> 'role')::TEXT),
    -- 3. Email-pattern shortcut for test/admin accounts
    CASE
      WHEN LOWER(auth.jwt() ->> 'email') LIKE 'admin@%' THEN 'admin'
      WHEN LOWER(auth.jwt() ->> 'email') LIKE 'cvo@%'   THEN 'cvo_officer'
      ELSE NULL
    END,
    -- 4. Direct DB lookup — works for users created via UserManagement page
    (
      SELECT LOWER(r.role_name)
      FROM public.users u
      JOIN public.roles r ON u.role_id = r.role_id
      WHERE u.auth_id = auth.uid()
      LIMIT 1
    )
  );
$$;
