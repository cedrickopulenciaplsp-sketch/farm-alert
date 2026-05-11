-- Insert Roles
INSERT INTO roles (role_name) VALUES
  ('cvo_officer'),
  ('admin')
ON CONFLICT (role_name) DO NOTHING;

-- Insert Livestock Types
INSERT INTO livestock_types (type_name) VALUES
  ('Swine'),
  ('Poultry'),
  ('Both')
ON CONFLICT (type_name) DO NOTHING;

-- Insert System Settings
INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('system_name', 'FarmAlert'),
  ('institution_name', 'City Veterinary Office'),
  ('outbreak_farm_threshold', '3'),
  ('outbreak_days_window', '7'),
  ('auto_detection_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert Barangays for San Pablo City
INSERT INTO barangays (barangay_name, classification) VALUES
  ('I (Poblacion)', 1),
  ('II-A (Poblacion)', 1),
  ('II-B (Poblacion)', 1),
  ('III-A (Poblacion)', 1),
  ('III-B (Poblacion)', 1),
  ('III-C (Poblacion)', 1),
  ('III-D (Poblacion)', 1),
  ('III-E (Poblacion)', 1),
  ('III-F (Poblacion)', 1),
  ('IV-A (Poblacion)', 1),
  ('IV-B (Poblacion)', 1),
  ('IV-C (Poblacion)', 1),
  ('V-A (Poblacion)', 1),
  ('V-B (Poblacion)', 1),
  ('V-C (Poblacion)', 1),
  ('V-D (Poblacion)', 1),
  ('VI-A (Poblacion)', 1),
  ('VI-B (Poblacion)', 1),
  ('VI-C (Poblacion)', 1),
  ('VI-D (Poblacion)', 1),
  ('VI-E (Poblacion)', 1),
  ('VII-A (Poblacion)', 1),
  ('VII-B (Poblacion)', 1),
  ('VII-C (Poblacion)', 1),
  ('VII-D (Poblacion)', 1),
  ('VII-E (Poblacion)', 1),
  ('Bautista', 0),
  ('Concepcion', 0),
  ('Del Remedio', 1),
  ('Dolores', 0),
  ('San Antonio 1', 0),
  ('San Antonio 2', 0),
  ('San Bartolome', 0),
  ('San Buenaventura', 0),
  ('San Crispin', 0),
  ('San Cristobal', 0),
  ('San Diego', 0),
  ('San Francisco', 1),
  ('San Gabriel', 1),
  ('San Gregorio', 0),
  ('San Ignacio', 0),
  ('San Isidro', 0),
  ('San Joaquin', 0),
  ('San Jose', 1),
  ('San Juan', 0),
  ('San Lorenzo', 0),
  ('San Lucas 1', 1),
  ('San Lucas 2', 0),
  ('San Marcos', 0),
  ('San Mateo', 0),
  ('San Miguel', 0),
  ('San Nicolas', 1),
  ('San Pedro', 0),
  ('San Rafael', 1),
  ('San Roque', 1),
  ('San Vicente', 0),
  ('Santa Ana', 0),
  ('Santa Catalina', 0),
  ('Santa Cruz', 0),
  ('Santa Elena', 0),
  ('Santa Filomena', 0),
  ('Santa Isabel', 0),
  ('Santa Maria', 0),
  ('Santa Maria Magdalena', 0),
  ('Santa Monica', 0),
  ('Santa Veronica', 0),
  ('Santiago I', 0),
  ('Santiago II', 0),
  ('Santisimo Rosario', 0),
  ('Santo Angel', 1),
  ('Santo Cristo', 0),
  ('Santo Niño', 0),
  ('Soledad', 0)
ON CONFLICT (barangay_name) DO NOTHING;
