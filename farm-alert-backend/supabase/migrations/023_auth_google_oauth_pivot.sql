-- =============================================================================
-- Migration 023: Google OAuth Single-Account Pivot
-- =============================================================================
-- 1. Adds a BEFORE INSERT trigger on auth.users that rejects any Google sign-in
--    from an email address other than sanielken2@gmail.com.
-- 2. Adds an AFTER INSERT trigger on auth.users that automatically syncs the
--    newly authenticated Google user into the public.users table with the
--    default admin role, so manual user creation is no longer needed.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- PART 1: Email Allowlist Enforcement
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.restrict_to_authorized_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM 'sanielken2@gmail.com' THEN
    RAISE EXCEPTION 'Access restricted to authorized personnel only.';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-running (idempotent)
DROP TRIGGER IF EXISTS trg_restrict_to_authorized_email ON auth.users;

CREATE TRIGGER trg_restrict_to_authorized_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_to_authorized_email();


-- ---------------------------------------------------------------------------
-- PART 2: Automatic Profile Sync into public.users
-- ---------------------------------------------------------------------------
-- When the authorized Google user signs in for the first time, Supabase
-- inserts a row in auth.users. This trigger immediately creates the matching
-- row in public.users so the app profile is ready without any manual setup.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_google_auth_user_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role_id  integer;
  v_display_name   text;
BEGIN
  -- Resolve the admin role id (role_name = 'Admin' or fallback to id=2)
  SELECT role_id INTO v_admin_role_id
    FROM public.roles
   WHERE role_name ILIKE 'admin'
   LIMIT 1;

  -- Fallback: if roles table has no 'admin' row, use role_id = 2
  IF v_admin_role_id IS NULL THEN
    v_admin_role_id := 2;
  END IF;

  -- Use the Google display name from user_metadata, fall back to email prefix
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert profile row — skip if one already exists for this auth_id
  INSERT INTO public.users (auth_id, full_name, username, role_id, is_active, requires_password_change)
  VALUES (
    NEW.id,
    v_display_name,
    NEW.email,             -- use email as username for the single-account model
    v_admin_role_id,
    true,
    false                  -- Google OAuth users never need a password change
  )
  ON CONFLICT (auth_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if re-running (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_google_auth_user_to_profile();
