CREATE TABLE IF NOT EXISTS vehicle_device_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  vehicle_id TEXT NOT NULL,
  vehicle_license_plate TEXT,
  user_id TEXT NOT NULL,
  user_name TEXT,
  device_name TEXT,
  device_type TEXT,
  started_at TEXT NOT NULL,
  stopped_at TEXT,
  last_location_at TEXT,
  last_latitude REAL,
  last_longitude REAL,
  last_accuracy_meters REAL,
  last_speed_kmh REAL,
  last_heading REAL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicle_device_sessions_vehicle_id
  ON vehicle_device_sessions(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_device_sessions_user_id
  ON vehicle_device_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_device_sessions_status
  ON vehicle_device_sessions(status);

CREATE INDEX IF NOT EXISTS idx_vehicle_device_sessions_last_location_at
  ON vehicle_device_sessions(last_location_at);

CREATE TABLE IF NOT EXISTS vehicle_location_pings (
  id TEXT PRIMARY KEY NOT NULL,
  vehicle_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy_meters REAL,
  speed_kmh REAL,
  heading REAL,
  battery_level REAL,
  is_charging INTEGER,
  network_type TEXT,
  recorded_at TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicle_location_pings_vehicle_id
  ON vehicle_location_pings(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_location_pings_session_id
  ON vehicle_location_pings(session_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_location_pings_recorded_at
  ON vehicle_location_pings(recorded_at);
