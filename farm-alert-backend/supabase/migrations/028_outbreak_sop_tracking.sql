-- Migration 028: Outbreak SOP Tracker
-- Replaces generic checklists with the official testing protocol
-- (Blood Draw -> Lab Result -> Action/Checkpoint)

-- 1. Drop old JSONB column used for the checklist UI
ALTER TABLE outbreak_alerts
  DROP COLUMN IF EXISTS response_checklist;

-- 2. Add SOP specific tracking columns
ALTER TABLE outbreak_alerts
  ADD COLUMN IF NOT EXISTS blood_sample_taken_date DATE,
  ADD COLUMN IF NOT EXISTS lab_result VARCHAR(20) DEFAULT 'Pending' 
      CHECK (lab_result IN ('Pending', 'Positive', 'Negative')),
  ADD COLUMN IF NOT EXISTS checkpoint_issued BOOLEAN NOT NULL DEFAULT false;

-- 3. Retroactively set default lab_result to Pending
UPDATE outbreak_alerts SET lab_result = 'Pending' WHERE lab_result IS NULL;

-- 4. Recreate outbreak view so it picks up the new columns
CREATE OR REPLACE VIEW v_outbreaks_enriched AS
SELECT
  oa.*,
  b.barangay_name,
  d.disease_name,
  u.full_name AS acknowledged_by_name
FROM outbreak_alerts oa
JOIN barangays b ON oa.barangay_id = b.barangay_id
JOIN diseases d ON oa.disease_id = d.disease_id
LEFT JOIN users u ON oa.acknowledged_by = u.user_id;

-- 5. Expose active checkpoint status to the farms view for the Dossier
CREATE OR REPLACE VIEW v_farms_enriched AS
SELECT
  f.*,
  b.barangay_name,
  b.classification,
  lt.type_name AS livestock_type_name,
  EXISTS (
    SELECT 1 FROM outbreak_alerts oa 
    WHERE oa.barangay_id = f.barangay_id 
      AND oa.status != 'Resolved'
      AND oa.checkpoint_issued = true
  ) AS has_active_checkpoint
FROM farms f
JOIN barangays b ON f.barangay_id = b.barangay_id
JOIN livestock_types lt ON f.livestock_type_id = lt.livestock_type_id;
