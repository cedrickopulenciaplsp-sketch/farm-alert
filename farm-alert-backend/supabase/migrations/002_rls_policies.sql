-- Returns the role of the current authenticated user
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::TEXT;
$$;

-- Returns the user_id (UUID) from the users table for the current auth session
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT user_id FROM users WHERE auth_id = auth.uid();
$$;

-- FARMS: CVO officers can read/write; Admin has no access
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY farms_cvo_all ON farms
  FOR ALL TO authenticated
  USING (current_user_role() = 'cvo_officer')
  WITH CHECK (current_user_role() = 'cvo_officer');

-- DISEASE REPORTS: CVO officers only
ALTER TABLE disease_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_cvo_all ON disease_reports
  FOR ALL TO authenticated
  USING (current_user_role() = 'cvo_officer')
  WITH CHECK (current_user_role() = 'cvo_officer');

-- OUTBREAK ALERTS: CVO officers can read/acknowledge/resolve
ALTER TABLE outbreak_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY outbreaks_cvo_all ON outbreak_alerts
  FOR ALL TO authenticated
  USING (current_user_role() = 'cvo_officer')
  WITH CHECK (current_user_role() = 'cvo_officer');

-- DISEASES (Library): Both roles can read; Admin can write
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
CREATE POLICY diseases_read_all ON diseases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY diseases_write_admin ON diseases
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- USERS: Admin can manage; CVO can read own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_admin_all ON users
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');
CREATE POLICY users_self_read ON users
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

-- BARANGAYS: Admin can write; both roles can read
ALTER TABLE barangays ENABLE ROW LEVEL SECURITY;
CREATE POLICY barangays_read_all ON barangays
  FOR SELECT TO authenticated USING (true);
CREATE POLICY barangays_admin_write ON barangays
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- SYSTEM SETTINGS: Admin only
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_admin_all ON system_settings
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- AUDIT LOGS: Admin read-only
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT TO authenticated
  USING (current_user_role() = 'admin');

-- PEST CONTROL LOGS: CVO officers only
ALTER TABLE pest_control_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY pest_cvo_all ON pest_control_logs
  FOR ALL TO authenticated
  USING (current_user_role() = 'cvo_officer')
  WITH CHECK (current_user_role() = 'cvo_officer');

-- REPORT FOLLOWUPS: CVO officers only
ALTER TABLE report_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY followups_cvo_all ON report_followups
  FOR ALL TO authenticated
  USING (current_user_role() = 'cvo_officer')
  WITH CHECK (current_user_role() = 'cvo_officer');

-- OUTBREAK FARM LINKS: CVO officers can read
ALTER TABLE outbreak_farm_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY ofl_cvo_read ON outbreak_farm_links
  FOR SELECT TO authenticated
  USING (current_user_role() = 'cvo_officer');

-- LIVESTOCK TYPES: All authenticated users can read
ALTER TABLE livestock_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY lt_read_all ON livestock_types
  FOR SELECT TO authenticated USING (true);
