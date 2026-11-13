-- =============================================================================
-- Migration 036: Decouple Outbreak Alerts per Farm Incident (Task 0.4)
-- =============================================================================
-- Purpose:
--   Ensure every reported farm incident gets its own independent Outbreak Alert
--   card and its own independent Epidemiological Testing SOP (Blood Sample
--   Collection Date -> Lab Result -> Quarantine Checkpoint / Resolution),
--   rather than merging multiple farms in the same barangay into one card.
-- =============================================================================

-- 1. Add farm_id and report_id columns to outbreak_alerts
ALTER TABLE public.outbreak_alerts
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(farm_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES public.disease_reports(report_id) ON DELETE SET NULL;

-- 2. Backfill farm_id on existing outbreak_alerts from outbreak_farm_links
UPDATE public.outbreak_alerts oa
SET farm_id = sub.farm_id
FROM (
  SELECT DISTINCT ON (outbreak_id) outbreak_id, farm_id
  FROM public.outbreak_farm_links
  ORDER BY outbreak_id, farm_id
) sub
WHERE oa.outbreak_id = sub.outbreak_id
  AND oa.farm_id IS NULL;

-- 3. Split any previously merged multi-farm outbreak_alerts so each farm has its own card
DO $$
DECLARE
  rec RECORD;
  new_outbreak_id UUID;
BEGIN
  FOR rec IN
    SELECT
      oa.outbreak_id AS old_outbreak_id,
      oa.barangay_id,
      oa.disease_id,
      oa.date_triggered,
      oa.status,
      oa.acknowledged_by,
      oa.blood_sample_taken_date,
      oa.lab_result,
      oa.checkpoint_issued,
      ofl.farm_id
    FROM public.outbreak_alerts oa
    JOIN public.outbreak_farm_links ofl ON ofl.outbreak_id = oa.outbreak_id
    WHERE oa.farm_id IS NOT NULL
      AND ofl.farm_id <> oa.farm_id
  LOOP
    INSERT INTO public.outbreak_alerts (
      barangay_id,
      disease_id,
      farm_id,
      farms_affected_count,
      date_triggered,
      status,
      acknowledged_by,
      blood_sample_taken_date,
      lab_result,
      checkpoint_issued
    ) VALUES (
      rec.barangay_id,
      rec.disease_id,
      rec.farm_id,
      1,
      rec.date_triggered,
      rec.status,
      rec.acknowledged_by,
      rec.blood_sample_taken_date,
      COALESCE(rec.lab_result, 'Pending'),
      COALESCE(rec.checkpoint_issued, false)
    )
    RETURNING outbreak_id INTO new_outbreak_id;

    -- Re-link this farm to its own dedicated outbreak alert
    DELETE FROM public.outbreak_farm_links
    WHERE outbreak_id = rec.old_outbreak_id AND farm_id = rec.farm_id;

    INSERT INTO public.outbreak_farm_links (outbreak_id, farm_id)
    VALUES (new_outbreak_id, rec.farm_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Normalize farms_affected_count = 1 for decoupled farm alerts
  UPDATE public.outbreak_alerts
  SET farms_affected_count = 1
  WHERE farm_id IS NOT NULL;
END;
$$;

-- 4. Replace evaluate_outbreak_trigger() so each farm + disease gets its own independent alert card
CREATE OR REPLACE FUNCTION public.evaluate_outbreak_trigger()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled     BOOLEAN;
  v_barangay_id SMALLINT;
  v_outbreak_id UUID;
BEGIN
  SELECT setting_value::BOOLEAN INTO v_enabled
    FROM public.system_settings WHERE setting_key = 'auto_detection_enabled';

  IF v_enabled IS FALSE THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'Resolved' THEN
    RETURN NEW;
  END IF;

  SELECT barangay_id INTO v_barangay_id
  FROM public.farms
  WHERE farm_id = NEW.farm_id;

  -- Check if THIS specific farm already has an Active/Acknowledged alert for this disease
  SELECT outbreak_id INTO v_outbreak_id
  FROM public.outbreak_alerts
  WHERE farm_id = NEW.farm_id
    AND disease_id = NEW.disease_id
    AND status IN ('Active', 'Acknowledged')
  LIMIT 1;

  IF v_outbreak_id IS NULL THEN
    -- Create an independent outbreak alert card for this farm incident
    INSERT INTO public.outbreak_alerts (
      barangay_id,
      disease_id,
      farm_id,
      report_id,
      farms_affected_count,
      status,
      blood_sample_taken_date,
      lab_result,
      checkpoint_issued
    )
    VALUES (
      v_barangay_id,
      NEW.disease_id,
      NEW.farm_id,
      NEW.report_id,
      1,
      'Active',
      NULL,
      'Pending',
      false
    )
    RETURNING outbreak_id INTO v_outbreak_id;

    INSERT INTO public.outbreak_farm_links (outbreak_id, farm_id)
    VALUES (v_outbreak_id, NEW.farm_id)
    ON CONFLICT DO NOTHING;
  ELSE
    -- Re-escalate this farm's alert if a new report was filed while Acknowledged
    UPDATE public.outbreak_alerts
    SET status = 'Active',
        report_id = NEW.report_id,
        acknowledged_by = NULL
    WHERE outbreak_id = v_outbreak_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Update v_outbreaks_enriched view to expose farm-specific details & counts
DROP VIEW IF EXISTS public.v_outbreaks_enriched;
CREATE VIEW public.v_outbreaks_enriched AS
SELECT
  oa.*,
  b.barangay_name,
  d.disease_name,
  u.full_name AS acknowledged_by_name,
  COALESCE(
    f.farm_name,
    (
      SELECT string_agg(f2.farm_name, ', ')
      FROM public.outbreak_farm_links ofl
      JOIN public.farms f2 ON ofl.farm_id = f2.farm_id
      WHERE ofl.outbreak_id = oa.outbreak_id
    )
  ) AS farm_name,
  COALESCE(
    f.farm_name,
    (
      SELECT string_agg(f2.farm_name, ', ')
      FROM public.outbreak_farm_links ofl
      JOIN public.farms f2 ON ofl.farm_id = f2.farm_id
      WHERE ofl.outbreak_id = oa.outbreak_id
    )
  ) AS affected_farms_list,
  f.owner_name,
  (
    SELECT COALESCE(SUM(dr.animals_affected), 0)
    FROM public.disease_reports dr
    WHERE dr.farm_id = COALESCE(oa.farm_id, dr.farm_id)
      AND (oa.farm_id IS NOT NULL OR dr.farm_id IN (
        SELECT ofl.farm_id FROM public.outbreak_farm_links ofl WHERE ofl.outbreak_id = oa.outbreak_id
      ))
      AND dr.disease_id = oa.disease_id
      AND dr.status != 'Resolved'
  ) AS total_animals_affected,
  (
    SELECT COALESCE(SUM(dr.mortalities), 0)
    FROM public.disease_reports dr
    WHERE dr.farm_id = COALESCE(oa.farm_id, dr.farm_id)
      AND (oa.farm_id IS NOT NULL OR dr.farm_id IN (
        SELECT ofl.farm_id FROM public.outbreak_farm_links ofl WHERE ofl.outbreak_id = oa.outbreak_id
      ))
      AND dr.disease_id = oa.disease_id
      AND dr.status != 'Resolved'
  ) AS total_mortalities
FROM public.outbreak_alerts oa
JOIN public.barangays b ON oa.barangay_id = b.barangay_id
JOIN public.diseases d ON oa.disease_id = d.disease_id
LEFT JOIN public.farms f ON oa.farm_id = f.farm_id
LEFT JOIN public.users u ON oa.acknowledged_by = u.user_id;
