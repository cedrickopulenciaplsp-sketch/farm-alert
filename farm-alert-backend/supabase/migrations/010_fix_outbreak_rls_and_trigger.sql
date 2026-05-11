-- Migration 010: Fix Outbreak RLS and Trigger Permissions
-- 1. Update the outbreak evaluation function to run with elevated privileges (SECURITY DEFINER)
-- This ensures that automated system tasks (like linking farms to outbreaks) 
-- are not blocked by individual user RLS policies.
CREATE OR REPLACE FUNCTION evaluate_outbreak_trigger()
RETURNS TRIGGER LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_threshold   INTEGER;
  v_days_window INTEGER;
  v_enabled     BOOLEAN;
  v_barangay_id SMALLINT;
  v_farm_count  INTEGER;
  v_outbreak_id UUID;
BEGIN
  -- Load configurable settings
  SELECT setting_value::INT INTO v_threshold
    FROM system_settings WHERE setting_key = 'outbreak_farm_threshold';
  SELECT setting_value::INT INTO v_days_window
    FROM system_settings WHERE setting_key = 'outbreak_days_window';
  SELECT setting_value::BOOLEAN INTO v_enabled
    FROM system_settings WHERE setting_key = 'auto_detection_enabled';

  IF NOT v_enabled THEN RETURN NEW; END IF;

  -- Get barangay of the newly reported farm
  SELECT barangay_id INTO v_barangay_id FROM farms WHERE farm_id = NEW.farm_id;

  -- Count qualifying farms
  SELECT COUNT(DISTINCT dr.farm_id) INTO v_farm_count
  FROM disease_reports dr
  JOIN farms f ON dr.farm_id = f.farm_id
  WHERE f.barangay_id = v_barangay_id
    AND dr.disease_id = NEW.disease_id
    AND dr.date_reported >= CURRENT_DATE - v_days_window
    AND dr.status != 'Resolved';

  -- Check threshold and no existing active outbreak
  IF v_farm_count >= v_threshold THEN
    SELECT outbreak_id INTO v_outbreak_id
    FROM outbreak_alerts
    WHERE barangay_id = v_barangay_id
      AND disease_id = NEW.disease_id
      AND status = 'Active'
    LIMIT 1;

    IF v_outbreak_id IS NULL THEN
      -- Create outbreak alert
      INSERT INTO outbreak_alerts (barangay_id, disease_id, farms_affected_count)
      VALUES (v_barangay_id, NEW.disease_id, v_farm_count)
      RETURNING outbreak_id INTO v_outbreak_id;

      -- Link all qualifying farms
      INSERT INTO outbreak_farm_links (outbreak_id, farm_id)
      SELECT DISTINCT v_outbreak_id, dr.farm_id
      FROM disease_reports dr
      JOIN farms f ON dr.farm_id = f.farm_id
      WHERE f.barangay_id = v_barangay_id
        AND dr.disease_id = NEW.disease_id
        AND dr.date_reported >= CURRENT_DATE - v_days_window
        AND dr.status != 'Resolved'
      ON CONFLICT DO NOTHING;
    ELSE
      -- Update affected farm count if outbreak already exists
      UPDATE outbreak_alerts 
      SET farms_affected_count = v_farm_count 
      WHERE outbreak_id = v_outbreak_id;
      
      -- Ensure current farm is linked
      INSERT INTO outbreak_farm_links (outbreak_id, farm_id)
      VALUES (v_outbreak_id, NEW.farm_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Expand RLS policies for outbreak_farm_links
-- Allow CVO officers to perform all actions on outbreak links
DROP POLICY IF EXISTS ofl_cvo_read ON outbreak_farm_links;

CREATE POLICY ofl_cvo_all ON outbreak_farm_links
  FOR ALL TO authenticated
  USING (current_user_role() IN ('cvo_officer', 'admin'))
  WITH CHECK (current_user_role() IN ('cvo_officer', 'admin'));

-- 3. Ensure outbreak_alerts also allows both roles
DROP POLICY IF EXISTS outbreaks_cvo_all ON outbreak_alerts;

CREATE POLICY outbreaks_authorized_all ON outbreak_alerts
  FOR ALL TO authenticated
  USING (current_user_role() IN ('cvo_officer', 'admin'))
  WITH CHECK (current_user_role() IN ('cvo_officer', 'admin'));
