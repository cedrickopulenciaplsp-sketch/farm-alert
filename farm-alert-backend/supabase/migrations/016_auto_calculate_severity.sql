-- Migration 016: Auto-calculate severity for disease_reports
-- =============================================================
-- Severity Matrix (checked top-down; highest threshold wins):
--
--   CRITICAL : Mortality > 20%  OR Morbidity > 60%
--   SEVERE   : Mortality 6–20%  OR Morbidity 30–60%
--   MODERATE : Mortality 1–5%   OR Morbidity 10–30%
--   MILD     : Mortality < 1%  AND Morbidity < 10%
--
-- Morbidity % = (animals_affected / head_count) * 100
-- Mortality % = (mortalities      / head_count) * 100
-- =============================================================

CREATE OR REPLACE FUNCTION trg_calculate_report_severity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_head_count  INTEGER;
  v_morbidity   NUMERIC;
  v_mortality   NUMERIC;
BEGIN
  -- Fetch the farm's total animal count
  SELECT head_count INTO v_head_count
  FROM farms
  WHERE farm_id = NEW.farm_id;

  -- Guard: if head_count is NULL or zero, default to Mild
  IF v_head_count IS NULL OR v_head_count = 0 THEN
    NEW.severity := 'Mild';
    RETURN NEW;
  END IF;

  -- Calculate percentages
  v_morbidity := (NEW.animals_affected::NUMERIC / v_head_count) * 100.0;
  v_mortality  := (NEW.mortalities::NUMERIC      / v_head_count) * 100.0;

  -- Apply matrix (top-down, highest severity wins)
  IF v_mortality > 20 OR v_morbidity > 60 THEN
    NEW.severity := 'Critical';
  ELSIF v_mortality >= 6 OR v_morbidity >= 30 THEN
    NEW.severity := 'Severe';
  ELSIF v_mortality >= 1 OR v_morbidity >= 10 THEN
    NEW.severity := 'Moderate';
  ELSE
    NEW.severity := 'Mild';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger — fires before every INSERT or UPDATE
DROP TRIGGER IF EXISTS trg_disease_report_severity ON disease_reports;

CREATE TRIGGER trg_disease_report_severity
  BEFORE INSERT OR UPDATE
  ON disease_reports
  FOR EACH ROW
  EXECUTE FUNCTION trg_calculate_report_severity();
