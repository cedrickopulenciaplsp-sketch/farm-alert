-- Migration 009: Sync Auth Users and Set Default User IDs
-- Ensures manually created dashboard users exist in the public users table 
-- so foreign keys and views (like v_reports_enriched) work properly.

-- 1. Sync any existing auth.users into the public.users table
INSERT INTO public.users (auth_id, full_name, username, role_id)
SELECT 
  id, 
  COALESCE(email, 'Admin User'), 
  COALESCE(email, id::text), 
  (SELECT role_id FROM roles WHERE role_name = 'admin')
FROM auth.users
WHERE id NOT IN (SELECT auth_id FROM public.users WHERE auth_id IS NOT NULL);

-- 2. Set default values for encoded_by and added_by so the frontend doesn't need to pass them
ALTER TABLE disease_reports ALTER COLUMN encoded_by SET DEFAULT current_user_id();
ALTER TABLE pest_control_logs ALTER COLUMN encoded_by SET DEFAULT current_user_id();
ALTER TABLE report_followups ALTER COLUMN added_by SET DEFAULT current_user_id();
