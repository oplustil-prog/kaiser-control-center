ALTER TABLE driver_part_requests ADD COLUMN oe_part_number TEXT;
ALTER TABLE driver_part_requests ADD COLUMN part_name TEXT;
ALTER TABLE driver_part_requests ADD COLUMN part_verification_status TEXT NOT NULL DEFAULT 'waiting_manual_verification';
ALTER TABLE driver_part_requests ADD COLUMN part_verification_source TEXT;
ALTER TABLE driver_part_requests ADD COLUMN parts_provider_id TEXT;
ALTER TABLE driver_part_requests ADD COLUMN parts_provider_status TEXT;
ALTER TABLE driver_part_requests ADD COLUMN parts_provider_message TEXT;
ALTER TABLE driver_part_requests ADD COLUMN parts_provider_error TEXT;
ALTER TABLE driver_part_requests ADD COLUMN part_lookup_query TEXT;
ALTER TABLE driver_part_requests ADD COLUMN part_lookup_result_json TEXT;
ALTER TABLE driver_part_requests ADD COLUMN mercedes_manual_portal_url TEXT;
ALTER TABLE driver_part_requests ADD COLUMN mercedes_mypartshub_url TEXT;
ALTER TABLE driver_part_requests ADD COLUMN price_boost_status TEXT NOT NULL DEFAULT 'not_requested';
ALTER TABLE driver_part_requests ADD COLUMN price_boost_note TEXT;
ALTER TABLE driver_part_requests ADD COLUMN price_boost_checked_at TEXT;
ALTER TABLE driver_part_requests ADD COLUMN price_boost_result_json TEXT;

UPDATE driver_part_requests
SET part_verification_status = CASE
  WHEN part_identification_status IN ('verified_daimler') THEN 'verified_daimler'
  WHEN part_identification_status IN ('verified', 'verified_manual') THEN 'verified_manual'
  WHEN part_identification_status IN ('probable_part', 'probable_waiting_verification') THEN 'probable_part'
  ELSE 'waiting_manual_verification'
END
WHERE part_verification_status = 'waiting_manual_verification';

CREATE INDEX IF NOT EXISTS idx_driver_part_requests_verification_status
  ON driver_part_requests(part_verification_status);

CREATE INDEX IF NOT EXISTS idx_driver_part_requests_vehicle_brand
  ON driver_part_requests(vehicle_brand);
