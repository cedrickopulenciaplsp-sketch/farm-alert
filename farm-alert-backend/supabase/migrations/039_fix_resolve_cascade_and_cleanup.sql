-- =============================================================================
-- Migration 039: Fix Outbreak Resolve Cascade, Backfill Farm Links & Cleanup
-- =============================================================================
-- Purpose:
--   1. Fix resolve_outbreak_cascade() trigger so it checks BOTH outbreak_farm_links
--      AND outbreak_alerts.farm_id directly. Previously, alerts missing a row in
--      outbreak_farm_links skipped resolving their linked disease_reports.
--   2. Backfill missing outbreak_farm_links records for all outbreak alerts.
--   3. One-time data cleanup: resolve any orphaned active disease reports where
--      the corresponding outbreak alert is already 'Resolved' (e.g. FarmFranzy).
--   4. Restore farm status to 'Active' for farms with no remaining open reports.
-- Safe to re-run.
-- =============================================================================

-- 1. Backfill all missing outbreak_farm_links
INSERT INTO public.outbreak_farm_links (outbreak_id, farm_id)
SELECT outbreak_id, farm_id
FROM public.outbreak_alerts
WHERE farm_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. Enhanced resolve_outbreak_cascade function
CREATE OR REPLACE FUNCTION public.resolve_outbreak_cascade()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_farm_id UUID;
  v_remaining_active INTEGER;
BEGIN
  -- Only fire when status transitions TO 'Resolved' from a non-Resolved state
  IF NEW.status != 'Resolved' OR OLD.status = 'Resolved' THEN
    RETURN NEW;
  END IF;

  -- Ensure outbreak_farm_links has the farm linked if NEW.farm_id is present
  IF NEW.farm_id IS NOT NULL THEN
    INSERT INTO public.outbreak_farm_links (outbreak_id, farm_id)
    VALUES (NEW.outbreak_id, NEW.farm_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Iterate over every linked farm (from outbreak_farm_links OR NEW.farm_id)
  FOR v_farm_id IN
    SELECT DISTINCT f_id FROM (
      SELECT farm_id AS f_id FROM public.outbreak_farm_links WHERE outbreak_id = NEW.outbreak_id
      UNION
      SELECT NEW.farm_id AS f_id WHERE NEW.farm_id IS NOT NULL
    ) sub
  LOOP
    -- Step 1: Resolve all non-Resolved reports for this disease on this farm
    UPDATE public.disease_reports
    SET    status = 'Resolved'
    WHERE  farm_id   = v_farm_id
      AND  (disease_id = NEW.disease_id OR NEW.disease_id IS NULL)
      AND  status != 'Resolved';

    -- Step 2: Count remaining active reports across ALL diseases on this farm
    SELECT COUNT(*) INTO v_remaining_active
    FROM   public.disease_reports
    WHERE  farm_id = v_farm_id
      AND  status != 'Resolved';

    -- Step 3: If the farm is fully clear, restore it to Active
    IF v_remaining_active = 0 THEN
      UPDATE public.farms
      SET    status = 'Active'
      WHERE  farm_id = v_farm_id
        AND  status IN ('Quarantine', 'Active/Quarantine');
    END IF;

  END LOOP;

  -- Step 4: Direct report_id resolution safety net
  IF NEW.report_id IS NOT NULL THEN
    UPDATE public.disease_reports
    SET    status = 'Resolved'
    WHERE  report_id = NEW.report_id
      AND  status != 'Resolved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolve_outbreak_cascade ON public.outbreak_alerts;
CREATE TRIGGER trg_resolve_outbreak_cascade
  AFTER UPDATE ON public.outbreak_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_outbreak_cascade();

-- 3. One-time cleanup of orphaned disease reports where outbreak is already Resolved
UPDATE public.disease_reports dr
SET status = 'Resolved'
FROM public.outbreak_alerts oa
WHERE oa.status = 'Resolved'
  AND (
    dr.report_id = oa.report_id
    OR (
      (dr.farm_id = oa.farm_id OR dr.farm_id IN (
        SELECT ofl.farm_id FROM public.outbreak_farm_links ofl WHERE ofl.outbreak_id = oa.outbreak_id
      ))
      AND dr.disease_id = oa.disease_id
    )
  )
  AND dr.status != 'Resolved';

-- 4. Restore farms with no active disease reports back to 'Active'
UPDATE public.farms f
SET status = 'Active'
WHERE f.status IN ('Quarantine', 'Active/Quarantine')
  AND NOT EXISTS (
    SELECT 1 FROM public.disease_reports dr
    WHERE dr.farm_id = f.farm_id
      AND dr.status != 'Resolved'
  );
