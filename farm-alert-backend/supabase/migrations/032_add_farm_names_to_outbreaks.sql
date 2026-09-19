
-- Migration 032: Add farm names list to outbreaks view

CREATE OR REPLACE VIEW v_outbreaks_enriched AS
SELECT
  oa.*,
  b.barangay_name,
  d.disease_name,
  u.full_name AS acknowledged_by_name,
  (
    SELECT string_agg(f.farm_name, ', ')
    FROM outbreak_farm_links ofl
    JOIN farms f ON ofl.farm_id = f.farm_id
    WHERE ofl.outbreak_id = oa.outbreak_id
  ) AS affected_farms_list,
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
