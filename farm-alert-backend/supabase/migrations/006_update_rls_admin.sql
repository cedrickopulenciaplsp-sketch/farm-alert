-- Migration 006: Grant Admin access to operational tables
-- Previously, only cvo_officer could access these tables. This update allows
-- admins to also perform CRUD operations for testing and system oversight.

-- FARMS
CREATE POLICY farms_admin_all ON farms
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- DISEASE REPORTS
CREATE POLICY reports_admin_all ON disease_reports
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- OUTBREAK ALERTS
CREATE POLICY outbreaks_admin_all ON outbreak_alerts
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- PEST CONTROL LOGS
CREATE POLICY pest_admin_all ON pest_control_logs
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- REPORT FOLLOWUPS
CREATE POLICY followups_admin_all ON report_followups
  FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- OUTBREAK FARM LINKS
CREATE POLICY ofl_admin_read ON outbreak_farm_links
  FOR SELECT TO authenticated
  USING (current_user_role() = 'admin');
