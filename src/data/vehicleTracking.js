export const VEHICLE_TRACKING_ROUTE = "/sledovani-vozidel";
export const VEHICLE_TRACKING_GPS_WAITING = "Čeká na napojení GPS poskytovatele.";
export const VEHICLE_TRACKING_TERMINAL_ROUTE = `${VEHICLE_TRACKING_ROUTE}/terminal`;
export const VEHICLE_TRACKING_API_ERROR = "Sledování vozidel se nepodařilo načíst.";
export const VEHICLE_TRACKING_EMPTY = "Nejsou dostupná žádná sledovaná vozidla.";
export const VEHICLE_TRACKING_LOADING = "Načítám sledování vozidel…";
export const VEHICLE_TRACKING_NO_SIGNAL = "Vozidlo nemá aktuální GPS signál.";

export const VEHICLE_TERMINAL_TEXTS = {
  title: "Vozidlový terminál",
  subtitle: "Toto zařízení odesílá polohu vozidla do Smart odpady.",
  vehicleSelect: "Vyberte vozidlo",
  start: "Spustit sledování",
  stop: "Zastavit sledování",
  gpsAllowed: "Poloha je povolená",
  gpsDenied: "Poloha není povolená. Povolte polohu v zařízení.",
  online: "Zařízení je online",
  offline: "Zařízení je offline. Poloha se teď neodesílá.",
  sent: "Poloha odeslána",
  error: "Polohu se nepodařilo odeslat.",
  noVehicle: "Nejdřív vyberte vozidlo.",
  consent: "Zapnutím sledování souhlasíte s odesíláním polohy tohoto zařízení pro účely provozního sledování vozidla.",
  confirm: "Opravdu chcete spustit sledování polohy tohoto vozidla?",
  pwaOpen: "Sledování ve webové aplikaci funguje nejlépe, když je aplikace otevřená a zařízení je připojené k napájení.",
  pwaNative: "Pro dlouhodobé sledování na pozadí může být později potřeba Android aplikace nebo kiosk režim."
};

export const VEHICLE_TRACKING_STATUS_OPTIONS = [
  { value: "moving", label: "Jede", tone: "moving" },
  { value: "stopped", label: "Stojí", tone: "stopped" },
  { value: "offline", label: "Offline", tone: "offline" },
  { value: "off", label: "Vypnuté", tone: "off" },
  { value: "no_signal", label: "Bez signálu", tone: "no-signal" },
  { value: "error", label: "Chyba", tone: "error" },
  { value: "service", label: "V servisu", tone: "service" },
  { value: "out_of_order", label: "Mimo provoz", tone: "out-of-order" }
];

export const VEHICLE_TRACKING_FILTERS = [
  "Stav",
  "Typ vozidla",
  "Řidič",
  "Středisko",
  "Vozidla v pohybu",
  "Vozidla stojící",
  "Bez GPS signálu",
  "SPZ / řidič / interní číslo"
];

export const VEHICLE_TRACKING_LIST_COLUMNS = [
  "SPZ",
  "Interní číslo",
  "Řidič",
  "Stav",
  "Rychlost",
  "Poslední aktualizace",
  "Lokalita",
  "Akce"
];

export const VEHICLE_TRACKING_API_ENDPOINTS = [
  "GET /api/vehicle-tracking/status",
  "GET /api/vehicle-tracking/terminal/vehicles",
  "POST /api/vehicle-tracking/terminal/start",
  "POST /api/vehicle-tracking/location",
  "POST /api/vehicle-tracking/terminal/stop",
  "GET /api/vehicle-tracking/vehicles/:vehicleId",
  "GET /api/vehicle-tracking/vehicles/:vehicleId/today-trip",
  "GET /api/vehicle-tracking/vehicles/:vehicleId/trips",
  "GET /api/vehicle-tracking/trips/:tripId"
];

export const VEHICLE_TRACKING_STATUS_FIELDS = [
  "id",
  "vehicleId",
  "licensePlate",
  "internalNumber",
  "driverId",
  "driverName",
  "status",
  "latitude",
  "longitude",
  "speedKmh",
  "heading",
  "address",
  "gpsProvider",
  "gpsUnitId",
  "source",
  "signalState",
  "accuracyMeters",
  "lastGpsAt",
  "updatedAt"
];

export const VEHICLE_DEVICE_SESSION_FIELDS = [
  "id",
  "vehicleId",
  "vehicleLicensePlate",
  "userId",
  "userName",
  "deviceName",
  "deviceType",
  "startedAt",
  "stoppedAt",
  "lastLocationAt",
  "lastLatitude",
  "lastLongitude",
  "lastAccuracyMeters",
  "status",
  "createdAt",
  "updatedAt"
];

export const VEHICLE_LOCATION_PING_FIELDS = [
  "id",
  "vehicleId",
  "sessionId",
  "userId",
  "latitude",
  "longitude",
  "accuracyMeters",
  "speedKmh",
  "heading",
  "batteryLevel",
  "isCharging",
  "networkType",
  "recordedAt",
  "receivedAt"
];

export const VEHICLE_TRIP_FIELDS = [
  "id",
  "vehicleId",
  "driverId",
  "startedAt",
  "endedAt",
  "startLatitude",
  "startLongitude",
  "endLatitude",
  "endLongitude",
  "startAddress",
  "endAddress",
  "distanceKm",
  "drivingTimeMinutes",
  "idleTimeMinutes",
  "maxSpeedKmh",
  "averageSpeedKmh",
  "createdAt"
];

export const VEHICLE_TRIP_POINT_FIELDS = [
  "id",
  "tripId",
  "vehicleId",
  "latitude",
  "longitude",
  "speedKmh",
  "heading",
  "recordedAt"
];

export const VEHICLE_STOP_FIELDS = [
  "id",
  "tripId",
  "vehicleId",
  "latitude",
  "longitude",
  "address",
  "startedAt",
  "endedAt",
  "durationMinutes"
];

export function vehicleTrackingStatusLabel(status) {
  return VEHICLE_TRACKING_STATUS_OPTIONS.find((option) => option.value === status)?.label || "Bez GPS dat";
}

export function vehicleTrackingStatusTone(status) {
  return VEHICLE_TRACKING_STATUS_OPTIONS.find((option) => option.value === status)?.tone || "waiting";
}
