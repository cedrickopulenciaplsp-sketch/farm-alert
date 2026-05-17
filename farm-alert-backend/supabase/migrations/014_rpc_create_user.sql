-- Migration 014: Admin RPC for Creating Users
-- Allows an authenticated Admin to securely create a new user account
-- and sync it to the public.users table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role_id int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid;
  v_caller_role int;
BEGIN
  -- 1. Ensure the caller is logged in
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify the caller is an admin (role_id = 2)
  SELECT role_id INTO v_caller_role FROM public.users WHERE auth_id = auth.uid();
  IF v_caller_role != 2 THEN
    RAISE EXCEPTION 'Permission denied: Only admins can create users';
  END IF;

  -- 3. Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  -- 4. Generate a new UUID for the user
  v_auth_id := gen_random_uuid();

  -- 5. Insert into auth.users (Supabase Authentication)
  -- Uses pgcrypto to hash the password exactly as Supabase expects
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_auth_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    '',
    '',
    '',
    ''
  );

  -- 6. Insert into public.users (Application Profile)
  -- They are automatically flagged to change their password on first login
  INSERT INTO public.users (
    auth_id,
    full_name,
    username,
    role_id,
    is_active,
    requires_password_change
  ) VALUES (
    v_auth_id,
    p_full_name,
    p_email,
    p_role_id,
    true,
    true
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_auth_id,
    'email', p_email
  );
END;
$$;
