-- =============================================================================
-- Migration 037: Account Access Management (Admin-Controlled Google Accounts)
-- =============================================================================
-- Replaces the hardcoded 3-email allowlist with a database-driven registry so
-- the City Veterinarian (Admin) can authorize CVO staff and farmers from the UI.
--
-- Onboarding paths (LGU workflow):
--   1. Farm Registration  — when CVO registers a farm with a farmer_email, the
--      farmer is automatically authorized and linked to that holding.
--   2. Admin Authorization — Admin pre-authorizes a staff/farmer Google email
--      in the User Accounts module.
--
-- Objects:
--   * public.authorized_accounts            (registry table)
--   * public.current_app_role()             (helper for RLS)
--   * public.get_my_account_access()        (RPC used by the frontend on login)
--   * restrict_to_authorized_email()        (updated BEFORE INSERT on auth.users)
--   * sync_google_auth_user_to_profile()    (updated AFTER INSERT on auth.users)
--   * trg_farm_farmer_email_authorize       (farms -> authorized_accounts)
--   * trg_authorized_accounts_sync_profile  (authorized_accounts -> users)
-- Safe to re-run (idempotent).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Ensure farmer_email exists on public.farms
-- ---------------------------------------------------------------------------
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS farmer_email VARCHAR(150);


-- ---------------------------------------------------------------------------
-- 1. Registry table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.authorized_accounts (
  account_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            VARCHAR(150) NOT NULL UNIQUE,
  full_name        VARCHAR(150),
  role             VARCHAR(20)  NOT NULL DEFAULT 'cvo_staff'
                   CHECK (role IN ('admin', 'cvo_staff', 'farmer')),
  farm_id          UUID REFERENCES public.farms(farm_id) ON DELETE SET NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_demo_account  BOOLEAN NOT NULL DEFAULT FALSE,
  source           VARCHAR(20) NOT NULL DEFAULT 'admin'
                   CHECK (source IN ('admin', 'farm_registry', 'system')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT authorized_accounts_email_lower CHECK (email = LOWER(TRIM(email)))
);

-- Seed the project team accounts:
-- sanielken2@gmail.com is the sole City Veterinarian (Admin);
-- the other two team accounts default to Veterinary Inspector (Staff) while remaining demo-capable.
INSERT INTO public.authorized_accounts (email, role, is_demo_account, source, notes)
VALUES
  ('sanielken2@gmail.com',   'admin',     TRUE, 'system', 'City Veterinarian (Sole System Administrator)'),
  ('mjhorcelt@gmail.com',    'cvo_staff', TRUE, 'system', 'CVO Veterinary Inspector (Defense demo account)'),
  ('morenongkups@gmail.com', 'cvo_staff', TRUE, 'system', 'CVO Veterinary Inspector (Defense demo account)')
ON CONFLICT (email) DO UPDATE
  SET is_demo_account = TRUE,
      role            = EXCLUDED.role,
      notes           = EXCLUDED.notes;

-- Backfill farmers already linked through the farm registry
INSERT INTO public.authorized_accounts (email, full_name, role, farm_id, source)
SELECT DISTINCT ON (LOWER(TRIM(f.farmer_email)))
       LOWER(TRIM(f.farmer_email)), f.owner_name, 'farmer', f.farm_id, 'farm_registry'
  FROM public.farms f
 WHERE f.farmer_email IS NOT NULL AND TRIM(f.farmer_email) <> ''
ON CONFLICT (email) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. Helper: current user's application role (used by RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT a.role
       FROM public.authorized_accounts a
      WHERE a.email = LOWER(TRIM(auth.jwt() ->> 'email'))
        AND a.is_active
      LIMIT 1),
    (SELECT u.role FROM public.users u WHERE u.auth_id = auth.uid() LIMIT 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. RLS — only Admin can read/manage the registry
-- ---------------------------------------------------------------------------
ALTER TABLE public.authorized_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authorized_accounts_admin_all ON public.authorized_accounts;
CREATE POLICY authorized_accounts_admin_all ON public.authorized_accounts
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');


-- ---------------------------------------------------------------------------
-- 4. RPC: what access does the signed-in Google account have?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_account_access()
RETURNS TABLE (
  authorized       BOOLEAN,
  role             TEXT,
  farm_id          UUID,
  is_demo_account  BOOLEAN,
  is_active        BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(auth.jwt() ->> 'email'));
  v_acc   public.authorized_accounts%ROWTYPE;
  v_farm  UUID;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID, FALSE, FALSE;
    RETURN;
  END IF;

  SELECT * INTO v_acc FROM public.authorized_accounts WHERE email = v_email LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_acc.is_active, v_acc.role::TEXT, v_acc.farm_id,
                        v_acc.is_demo_account, v_acc.is_active;
    RETURN;
  END IF;

  -- Fallback: farmer linked directly via the farm registry
  SELECT f.farm_id INTO v_farm
    FROM public.farms f
   WHERE LOWER(TRIM(f.farmer_email)) = v_email
   LIMIT 1;

  IF v_farm IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 'farmer'::TEXT, v_farm, FALSE, TRUE;
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID, FALSE, FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_account_access() TO authenticated;


-- ---------------------------------------------------------------------------
-- 5. Sign-in gate on auth.users (replaces the hardcoded 3-email list)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restrict_to_authorized_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(NEW.email));
BEGIN
  IF EXISTS (SELECT 1 FROM public.authorized_accounts
              WHERE email = v_email AND is_active) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.farms
              WHERE LOWER(TRIM(farmer_email)) = v_email) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Access restricted: this Google account is not registered with the City Veterinary Office.';
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_to_authorized_email ON auth.users;
CREATE TRIGGER trg_restrict_to_authorized_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_to_authorized_email();


-- ---------------------------------------------------------------------------
-- 6. Profile sync on first sign-in (role comes from the registry)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_google_auth_user_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email         TEXT := LOWER(TRIM(NEW.email));
  v_role_str      VARCHAR(20);
  v_role_id       SMALLINT;
  v_linked_farm   UUID;
  v_display_name  TEXT;
BEGIN
  SELECT a.role, a.farm_id INTO v_role_str, v_linked_farm
    FROM public.authorized_accounts a
   WHERE a.email = v_email
   LIMIT 1;

  IF v_role_str IS NULL THEN
    SELECT f.farm_id INTO v_linked_farm
      FROM public.farms f
     WHERE LOWER(TRIM(f.farmer_email)) = v_email
     LIMIT 1;
    v_role_str := CASE WHEN v_linked_farm IS NOT NULL THEN 'farmer' ELSE 'cvo_staff' END;
  END IF;

  SELECT role_id INTO v_role_id
    FROM public.roles
   WHERE role_name = CASE v_role_str
                       WHEN 'admin'  THEN 'admin'
                       WHEN 'farmer' THEN 'farmer'
                       ELSE 'cvo_staff'
                     END
   LIMIT 1;
  IF v_role_id IS NULL THEN v_role_id := 1; END IF;

  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (auth_id, full_name, username, role_id, role, farm_id, is_active, requires_password_change)
  VALUES (NEW.id, v_display_name, v_email, v_role_id, v_role_str, v_linked_farm, TRUE, FALSE)
  ON CONFLICT (auth_id) DO UPDATE
    SET role    = EXCLUDED.role,
        role_id = EXCLUDED.role_id,
        farm_id = COALESCE(EXCLUDED.farm_id, public.users.farm_id);

  -- Fill in the display name on the registry row if Admin left it blank
  UPDATE public.authorized_accounts
     SET full_name = COALESCE(full_name, v_display_name)
   WHERE email = v_email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_google_auth_user_to_profile();


-- ---------------------------------------------------------------------------
-- 7. Farm registry -> automatically authorize the farmer's Google email
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authorize_farmer_from_farm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(NEW.farmer_email));
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.authorized_accounts (email, full_name, role, farm_id, source)
  VALUES (v_email, NEW.owner_name, 'farmer', NEW.farm_id, 'farm_registry')
  ON CONFLICT (email) DO UPDATE
    SET farm_id    = EXCLUDED.farm_id,
        updated_at = now()
    WHERE public.authorized_accounts.role = 'farmer';   -- never downgrade staff/admin

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_farm_farmer_email_authorize ON public.farms;
CREATE TRIGGER trg_farm_farmer_email_authorize
  AFTER INSERT OR UPDATE OF farmer_email ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.authorize_farmer_from_farm();


-- ---------------------------------------------------------------------------
-- 8. Registry changes -> mirror role / farm / status onto public.users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_authorized_account_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id SMALLINT;
BEGIN
  NEW.updated_at := now();

  SELECT role_id INTO v_role_id
    FROM public.roles
   WHERE role_name = NEW.role
   LIMIT 1;

  UPDATE public.users
     SET role      = NEW.role,
         role_id   = COALESCE(v_role_id, role_id),
         farm_id   = CASE WHEN NEW.role = 'farmer' THEN NEW.farm_id ELSE NULL END,
         is_active = NEW.is_active
   WHERE LOWER(TRIM(username)) = NEW.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_authorized_accounts_sync_profile ON public.authorized_accounts;
CREATE TRIGGER trg_authorized_accounts_sync_profile
  BEFORE UPDATE ON public.authorized_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_authorized_account_to_profile();
