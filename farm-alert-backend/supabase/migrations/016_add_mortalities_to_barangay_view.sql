-- Migration 016: Add total_mortalities to v_analytics_by_barangay
-- This allows the Analytics Hotspot chart to display both
-- case counts and death counts per barangay side-by-side.

CREATE OR REPLACE VIEW v_analytics_by_barangay AS
SELECT
  b.barangay_name,
  COUNT(*) AS case_count,
  COALESCE(SUM(dr.mortalities), 0) AS total_mortalities
FROM disease_reports dr
JOIN farms f ON dr.farm_id = f.farm_id
JOIN barangays b ON f.barangay_id = b.barangay_id
GROUP BY b.barangay_name
ORDER BY case_count DESC;
