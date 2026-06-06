-- Migration 021: Single Shared Account RLS Pivot
-- Drops all role-based RLS policies and replaces them with a single
-- policy per table that grants full access to any authenticated user.

-- FARMS
DROP POLICY IF EXISTS farms_cvo_all ON farms;
DROP POLICY IF EXISTS farms_admin_all ON farms;
CREATE POLICY farms_all ON farms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DISEASE REPORTS
DROP POLICY IF EXISTS reports_cvo_all ON disease_reports;
DROP POLICY IF EXISTS reports_admin_all ON disease_reports;
CREATE POLICY reports_all ON disease_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- OUTBREAK ALERTS
DROP POLICY IF EXISTS outbreaks_cvo_all ON outbreak_alerts;
DROP POLICY IF EXISTS outbreaks_admin_all ON outbreak_alerts;
CREATE POLICY outbreaks_all ON outbreak_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DISEASES
DROP POLICY IF EXISTS diseases_read_all ON diseases;
DROP POLICY IF EXISTS diseases_write_admin ON diseases;
CREATE POLICY diseases_all ON diseases FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- USERS
DROP POLICY IF EXISTS users_admin_all ON users;
DROP POLICY IF EXISTS users_self_read ON users;
CREATE POLICY users_all ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BARANGAYS
DROP POLICY IF EXISTS barangays_read_all ON barangays;
DROP POLICY IF EXISTS barangays_admin_write ON barangays;
CREATE POLICY barangays_all ON barangays FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SYSTEM SETTINGS
DROP POLICY IF EXISTS settings_admin_all ON system_settings;
CREATE POLICY settings_all ON system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AUDIT LOGS
DROP POLICY IF EXISTS audit_logs_admin_read ON audit_logs;
CREATE POLICY audit_logs_all ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PEST CONTROL LOGS
DROP POLICY IF EXISTS pest_cvo_all ON pest_control_logs;
DROP POLICY IF EXISTS pest_admin_all ON pest_control_logs;
CREATE POLICY pest_all ON pest_control_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- REPORT FOLLOWUPS
DROP POLICY IF EXISTS followups_cvo_all ON report_followups;
DROP POLICY IF EXISTS followups_admin_all ON report_followups;
CREATE POLICY followups_all ON report_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- OUTBREAK FARM LINKS
DROP POLICY IF EXISTS ofl_cvo_read ON outbreak_farm_links;
DROP POLICY IF EXISTS ofl_admin_read ON outbreak_farm_links;
CREATE POLICY ofl_all ON outbreak_farm_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- LIVESTOCK TYPES
DROP POLICY IF EXISTS lt_read_all ON livestock_types;
CREATE POLICY lt_all ON livestock_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
