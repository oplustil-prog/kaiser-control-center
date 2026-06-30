CREATE TABLE IF NOT EXISTS fleet_vehicle_assignments (
  vehicle_id TEXT PRIMARY KEY,
  license_plate TEXT,
  vin TEXT,
  assigned_driver_user_id TEXT,
  assigned_driver_name TEXT,
  assigned_driver_phone TEXT,
  assigned_driver_email TEXT,
  note TEXT,
  updated_by_user_id TEXT,
  updated_by_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_assignments_license_plate
  ON fleet_vehicle_assignments(license_plate);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_assignments_driver_user
  ON fleet_vehicle_assignments(assigned_driver_user_id);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_assignments_driver_name
  ON fleet_vehicle_assignments(assigned_driver_name);
