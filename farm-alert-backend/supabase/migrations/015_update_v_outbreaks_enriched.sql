-- Migration 015: Add total_mortalities to v_outbreaks_enriched
-- This surfaces aggregate death counts from linked disease reports
-- so the Outbreak Alerts page can display mortality impact per outbreak.

CREATE OR REPLACE VIEW v_outbreaks_enriched AS
SELECT
  oa.*,
  b.barangay_name,
  d.disease_name,
  u.full_name AS acknowledged_by_name,
  (
    SELECT COALESCE(SUM(dr.mortalities), 0)
    FROM disease_reports dr
    JOIN farms f ON dr.farm_id = f.farm_id
    WHERE f.barangay_id = oa.barangay_id
      AND dr.disease_id = oa.disease_id
      AND dr.status != 'Resolved'
  ) AS total_mortalities
FROM outbreak_alerts oa
JOIN barangays b ON oa.barangay_id = b.barangay_id
JOIN diseases d ON oa.disease_id = d.disease_id
LEFT JOIN users u ON oa.acknowledged_by = u.user_id;
