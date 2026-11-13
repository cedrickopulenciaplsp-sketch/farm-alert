-- =============================================================================
-- Migration 033: User Roles (3-Tier RBAC) & Farmer Holding Linking
-- =============================================================================
-- 1. Ensures 'admin', 'cvo_staff', and 'farmer' roles exist in public.roles.
-- 2. Adds explicit `role` ('admin' | 'cvo_staff' | 'farmer') and `farm_id`
--    columns to public.users so Farmer accounts link directly to their holding.
-- 3. Adds `farmer_email` to public.farms for seamless farmer account matching.
-- 4. Updates the Google OAuth profile sync function to support 3-tier roles.
-- =============================================================================

-- 1. Seed roles in reference table
INSERT INTO public.roles (role_name) VALUES
  ('cvo_officer'),
  ('admin'),
  ('cvo_staff'),
  ('farmer')
ON CONFLICT (role_name) DO NOTHING;

-- 2. Add `role` and `farm_id` columns to public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'cvo_staff'
    CHECK (role IN ('admin', 'cvo_staff', 'farmer')),
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(farm_id) ON DELETE SET NULL;

-- Backfill existing admin rows
UPDATE public.users
SET role = 'admin'
WHERE role_id = 2;

-- 3. Add optional `farmer_email` column to public.farms
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS farmer_email VARCHAR(150);

-- 4. Update profile sync trigger function to assign appropriate 3-tier role
CREATE OR REPLACE FUNCTION public.sync_google_auth_user_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id       SMALLINT;
  v_role_str      VARCHAR(20);
  v_linked_farm   UUID;
  v_display_name  TEXT;
BEGIN
  -- Check if email is linked to a registered farm as a Farmer
  SELECT farm_id INTO v_linked_farm
    FROM public.farms
   WHERE LOWER(TRIM(farmer_email)) = LOWER(TRIM(NEW.email))
   LIMIT 1;

  IF v_linked_farm IS NOT NULL THEN
    v_role_str := 'farmer';
    SELECT role_id INTO v_role_id FROM public.roles WHERE role_name = 'farmer' LIMIT 1;
  ELSIF LOWER(TRIM(NEW.email)) IN ('sanielken2@gmail.com', 'mjhorcelt@gmail.com', 'morenongkups@gmail.com') THEN
    v_role_str := 'admin';
    SELECT role_id INTO v_role_id FROM public.roles WHERE role_name ILIKE 'admin' LIMIT 1;
  ELSE
    v_role_str := 'cvo_staff';
    SELECT role_id INTO v_role_id FROM public.roles WHERE role_name IN ('cvo_staff', 'cvo_officer') LIMIT 1;
  END IF;

  IF v_role_id IS NULL THEN
    v_role_id := 1;
  END IF;

  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (auth_id, full_name, username, role_id, role, farm_id, is_active, requires_password_change)
  VALUES (
    NEW.id,
    v_display_name,
    NEW.email,
    v_role_id,
    v_role_str,
    v_linked_farm,
    true,
    false
  )
  ON CONFLICT (auth_id) DO UPDATE
    SET farm_id = COALESCE(public.users.farm_id, EXCLUDED.farm_id);

  RETURN NEW;
END;
$$;
