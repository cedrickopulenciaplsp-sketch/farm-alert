-- Migration 017: Fix farm deletion by adding ON DELETE CASCADE to all
-- foreign keys that reference farms(farm_id).
--
-- Without this, deleting a farm raises:
--   "update or delete on table farms violates foreign key constraint
--    pest_control_logs_farm_id_fkey on table pest_control_logs"
-- (and the same error for disease_reports and outbreak_farm_links)
--
-- CASCADE behaviour:
--   • pest_control_logs  → logs are tied to the farm; delete them with the farm.
--   • disease_reports    → reports are tied to the farm; delete them with the farm.
--   • outbreak_farm_links→ junction rows; delete them with the farm.
--
-- NOTE: outbreak_alerts itself is NOT deleted — it is linked via barangay/disease,
--       not farm_id directly. Only the junction rows are removed.

-- ── pest_control_logs ─────────────────────────────────────────────────────
ALTER TABLE pest_control_logs
  DROP CONSTRAINT pest_control_logs_farm_id_fkey;

ALTER TABLE pest_control_logs
  ADD CONSTRAINT pest_control_logs_farm_id_fkey
  FOREIGN KEY (farm_id)
  REFERENCES farms(farm_id)
  ON DELETE CASCADE;

-- ── disease_reports ───────────────────────────────────────────────────────
ALTER TABLE disease_reports
  DROP CONSTRAINT disease_reports_farm_id_fkey;

ALTER TABLE disease_reports
  ADD CONSTRAINT disease_reports_farm_id_fkey
  FOREIGN KEY (farm_id)
  REFERENCES farms(farm_id)
  ON DELETE CASCADE;

-- ── outbreak_farm_links ───────────────────────────────────────────────────
ALTER TABLE outbreak_farm_links
  DROP CONSTRAINT outbreak_farm_links_farm_id_fkey;

ALTER TABLE outbreak_farm_links
  ADD CONSTRAINT outbreak_farm_links_farm_id_fkey
  FOREIGN KEY (farm_id)
  REFERENCES farms(farm_id)
  ON DELETE CASCADE;
