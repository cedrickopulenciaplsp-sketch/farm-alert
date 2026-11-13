-- =============================================================================
-- Migration 038: Disease Incident Response Workflow (Dispatch + Lab-Driven Stage)
-- =============================================================================
-- Purpose (Final Defense revision):
--   * A reported case is a SUSPECTED INCIDENT, not an outbreak.
--   * The City Veterinarian issues a "Dispatch Inspector" order (digital
--     mission order). We record WHEN it was issued for Citizen's Charter
--     response-time compliance.
--   * An incident only becomes a CONFIRMED OUTBREAK when the RADDL lab result
--     is Positive. Negative = Lab Cleared.
--
-- DB status values are unchanged (Active / Acknowledged / Resolved) so existing
-- triggers, the Farmer Portal and the map keep working:
--     Active        -> Suspected Incident (awaiting dispatch)
--     Acknowledged  -> Inspector Dispatched / Under Investigation
--     Resolved      -> Resolved by City Veterinarian
-- The displayed stage is derived in the UI from status + lab_result.
--
-- Also fixes the "0 sick" display: counts now come from the incident's own
-- intake report(s) regardless of later report status.
-- Safe to re-run.
-- =============================================================================

-- 1. Dispatch timestamp
ALTER TABLE public.outbreak_alerts
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

-- Backfill: alerts already acknowledged get their trigger date as a best-effort dispatch time
UPDATE public.outbreak_alerts
   SET dispatched_at = COALESCE(dispatched_at, date_triggered)
 WHERE status IN ('Acknowledged', 'Resolved')
   AND dispatched_at IS NULL;


-- 2. Record who dispatched and when (extends the existing acknowledge trigger)
CREATE OR REPLACE FUNCTION public.trg_set_acknowledged_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Acknowledged' AND OLD.status IS DISTINCT FROM 'Acknowledged' THEN
    NEW.acknowledged_by := current_user_id();
    NEW.dispatched_at   := COALESCE(NEW.dispatched_at, now());
  END IF;

  -- Re-escalation back to Active (new report while under investigation) clears the dispatch
  IF NEW.status = 'Active' AND OLD.status IS DISTINCT FROM 'Active' THEN
    NEW.dispatched_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_outbreak_acknowledge ON public.outbreak_alerts;
CREATE TRIGGER trg_outbreak_acknowledge
  BEFORE UPDATE ON public.outbreak_alerts
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_acknowledged_by();


-- 3. Rebuild the enriched view (DROP + CREATE because oa.* gained a column)
DROP VIEW IF EXISTS public.v_outbreaks_enriched;
CREATE VIEW public.v_outbreaks_enriched AS
SELECT
  oa.*,
  b.barangay_name,
  d.disease_name,
  u.full_name AS acknowledged_by_name,
  u.full_name AS dispatched_by_name,
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
  f.head_count AS farm_head_count,
  -- Intake morbidity: the incident's own report, else all reports of this farm + disease
  COALESCE(
    (SELECT dr.animals_affected FROM public.disease_reports dr WHERE dr.report_id = oa.report_id),
    (
      SELECT SUM(dr.animals_affected)
      FROM public.disease_reports dr
      WHERE dr.disease_id = oa.disease_id
        AND (
          dr.farm_id = oa.farm_id
          OR (oa.farm_id IS NULL AND dr.farm_id IN (
            SELECT ofl.farm_id FROM public.outbreak_farm_links ofl WHERE ofl.outbreak_id = oa.outbreak_id
          ))
        )
    ),
    0
  ) AS total_animals_affected,
  COALESCE(
    (SELECT dr.mortalities FROM public.disease_reports dr WHERE dr.report_id = oa.report_id),
    (
      SELECT SUM(dr.mortalities)
      FROM public.disease_reports dr
      WHERE dr.disease_id = oa.disease_id
        AND (
          dr.farm_id = oa.farm_id
          OR (oa.farm_id IS NULL AND dr.farm_id IN (
            SELECT ofl.farm_id FROM public.outbreak_farm_links ofl WHERE ofl.outbreak_id = oa.outbreak_id
          ))
        )
    ),
    0
  ) AS total_mortalities
FROM public.outbreak_alerts oa
JOIN public.barangays b      ON oa.barangay_id = b.barangay_id
JOIN public.diseases d       ON oa.disease_id = d.disease_id
LEFT JOIN public.farms f     ON oa.farm_id = f.farm_id
LEFT JOIN public.users u     ON oa.acknowledged_by = u.user_id;

GRANT SELECT ON public.v_outbreaks_enriched TO authenticated;
