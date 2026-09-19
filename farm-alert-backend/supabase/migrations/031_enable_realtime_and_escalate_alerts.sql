
-- Migration 031: Enable Realtime and Auto-Escalate Acknowledged Outbreaks

-- 1. Enable Supabase Realtime for core tables so the frontend UI updates instantly
begin;
  -- Create the publication if it doesn't exist (Supabase creates this by default, but just in case)
  -- DO NOT CREATE IT, Supabase manages it. Just add the tables.
  alter publication supabase_realtime add table outbreak_alerts;
  alter publication supabase_realtime add table disease_reports;
commit;

-- 2. Update the trigger again. If an Acknowledged outbreak gets a NEW case,
-- we must bump it back to 'Active' so the CVO officer is alerted to the escalation.
CREATE OR REPLACE FUNCTION evaluate_outbreak_trigger()
RETURNS TRIGGER LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$$
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

  SELECT barangay_id INTO v_barangay_id FROM farms WHERE farm_id = NEW.farm_id;

  SELECT COUNT(DISTINCT dr.farm_id) INTO v_farm_count
  FROM disease_reports dr
  JOIN farms f ON dr.farm_id = f.farm_id
  WHERE f.barangay_id = v_barangay_id
    AND dr.disease_id = NEW.disease_id
    AND dr.date_reported >= CURRENT_DATE - v_days_window
    AND dr.status != 'Resolved';

  IF v_farm_count >= v_threshold THEN
    SELECT outbreak_id INTO v_outbreak_id
    FROM outbreak_alerts
    WHERE barangay_id = v_barangay_id
      AND disease_id = NEW.disease_id
      AND status IN ('Active', 'Acknowledged')
    LIMIT 1;

    IF v_outbreak_id IS NULL THEN
      -- Create outbreak alert
      INSERT INTO outbreak_alerts (barangay_id, disease_id, farms_affected_count)
      VALUES (v_barangay_id, NEW.disease_id, v_farm_count)
      RETURNING outbreak_id INTO v_outbreak_id;

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
      -- ESCALATION: If outbreak exists, update count AND bump status back to Active
      -- This alerts the CVO that the previously acknowledged outbreak has spread to a new farm.
      UPDATE outbreak_alerts 
      SET farms_affected_count = v_farm_count,
          status = 'Active',
          acknowledged_by = NULL
      WHERE outbreak_id = v_outbreak_id;
      
      INSERT INTO outbreak_farm_links (outbreak_id, farm_id)
      VALUES (v_outbreak_id, NEW.farm_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$$;
