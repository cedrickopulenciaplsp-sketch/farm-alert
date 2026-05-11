-- Enriched farm list with barangay and livestock type names
CREATE OR REPLACE VIEW v_farms_enriched AS
SELECT
  f.*,
  b.barangay_name,
  b.classification,
  lt.type_name AS livestock_type_name
FROM farms f
JOIN barangays b ON f.barangay_id = b.barangay_id
JOIN livestock_types lt ON f.livestock_type_id = lt.livestock_type_id;

-- Enriched disease reports with farm, disease, barangay info
CREATE OR REPLACE VIEW v_reports_enriched AS
SELECT
  dr.*,
  f.farm_name,
  f.owner_name,
  b.barangay_name,
  d.disease_name,
  lt.type_name AS livestock_type_name,
  u.full_name AS encoded_by_name
FROM disease_reports dr
JOIN farms f ON dr.farm_id = f.farm_id
JOIN barangays b ON f.barangay_id = b.barangay_id
JOIN diseases d ON dr.disease_id = d.disease_id
JOIN livestock_types lt ON d.livestock_type_id = lt.livestock_type_id
JOIN users u ON dr.encoded_by = u.user_id;

-- Outbreak alerts with barangay and disease names
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

-- Map data: farms with latest report status
CREATE OR REPLACE VIEW v_map_farms AS
SELECT
  f.farm_id,
  f.farm_name,
  f.owner_name,
  f.latitude,
  f.longitude,
  f.status AS farm_status,
  b.barangay_name,
  lt.type_name AS livestock_type_name,
  dr.disease_name AS latest_disease,
  dr.severity AS latest_severity,
  dr.status AS latest_report_status
FROM farms f
JOIN barangays b ON f.barangay_id = b.barangay_id
JOIN livestock_types lt ON f.livestock_type_id = lt.livestock_type_id
LEFT JOIN LATERAL (
  SELECT d.disease_name, r.severity, r.status
  FROM disease_reports r
  JOIN diseases d ON r.disease_id = d.disease_id
  WHERE r.farm_id = f.farm_id AND r.status != 'Resolved'
  ORDER BY r.created_at DESC
  LIMIT 1
) dr ON true;

-- Analytics: monthly case counts
CREATE OR REPLACE VIEW v_analytics_monthly AS
SELECT
  DATE_TRUNC('month', date_reported) AS report_month,
  COUNT(*) AS case_count
FROM disease_reports
GROUP BY report_month
ORDER BY report_month;

-- Analytics: cases by disease
CREATE OR REPLACE VIEW v_analytics_by_disease AS
SELECT
  d.disease_name,
  COUNT(*) AS case_count
FROM disease_reports dr
JOIN diseases d ON dr.disease_id = d.disease_id
GROUP BY d.disease_name
ORDER BY case_count DESC;

-- Analytics: cases by barangay
CREATE OR REPLACE VIEW v_analytics_by_barangay AS
SELECT
  b.barangay_name,
  COUNT(*) AS case_count
FROM disease_reports dr
JOIN farms f ON dr.farm_id = f.farm_id
JOIN barangays b ON f.barangay_id = b.barangay_id
GROUP BY b.barangay_name
ORDER BY case_count DESC;

-- Analytics: cases by severity
CREATE OR REPLACE VIEW v_analytics_by_severity AS
SELECT
  severity,
  COUNT(*) AS case_count
FROM disease_reports
GROUP BY severity;
