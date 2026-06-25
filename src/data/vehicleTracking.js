export const VEHICLE_TRACKING_ROUTE = "/sledovani-vozidel";
export const VEHICLE_TRACKING_GPS_WAITING = "Čeká na napojení GPS poskytovatele.";
export const VEHICLE_TRACKING_API_ERROR = "Sledování vozidel se nepodařilo načíst.";
export const VEHICLE_TRACKING_EMPTY = "Nejsou dostupná žádná sledovaná vozidla.";
export const VEHICLE_TRACKING_LOADING = "Načítám sledování vozidel…";
export const VEHICLE_TRACKING_NO_SIGNAL = "Vozidlo nemá aktuální GPS signál.";
export const VEHICLE_TRACKING_TCAR_PROVIDER = "tcars";
export const VEHICLE_TRACKING_TCAR_SOURCE = "T-Cars jednotka";
export const VEHICLE_TRACKING_TCAR_WAITING = "T-Cars napojení čeká na konfiguraci.";
export const VEHICLE_TRACKING_TCAR_UNAVAILABLE = "T-Cars není aktuálně dostupný.";
export const VEHICLE_TRACKING_TCAR_API_DOCUMENTATION_MISSING = "Chybí API dokumentace T-Cars. Prosím dodat dokumentaci nebo potvrdit způsob napojení.";
export const VEHICLE_TRACKING_TCAR_LAST_KNOWN = "Poslední známá poloha";
export const VEHICLE_TRACKING_TABLET_ROLE = "Primární poloha vozidla je z T-Cars jednotky. Android tablet slouží jako vozidlový terminál.";

export const VEHICLE_TRACKING_SOURCE_MODES = [
  {
    id: "demo",
    label: "Demo",
    badge: "DEMO REŽIM – ukázkový pohyb vozidel, nejde o reálná GPS data.",
    description: "Používá demo data a animaci bez reálných GPS poloh."
  },
  {
    id: "tcars",
    label: "T-Cars",
    badge: "T-CARS – poloha z vozidlové jednotky",
    description: "Používá vlastní Smart odpady API, které bude serverově napojené na T-Cars."
  },
  {
    id: "fallback",
    label: "Fallback",
    badge: "Poslední známá poloha",
    description: "Zapne se při výpadku T-Cars a zobrazí poslední známou polohu, pokud existuje."
  }
];

export const VEHICLE_TRACKING_STATUS_OPTIONS = [
  { value: "moving", label: "Jede", tone: "moving" },
  { value: "stopped", label: "Stojí", tone: "stopped" },
  { value: "off", label: "Vypnuté", tone: "off" },
  { value: "no_signal", label: "Bez signálu", tone: "no-signal" },
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
  "POST /api/vehicle-tracking/tcars/sync",
  "GET /api/vehicle-tracking/tcars/vehicles",
  "PATCH /api/vehicles/:id/tcars-link",
  "DELETE /api/vehicles/:id/tcars-link",
  "GET /api/vehicle-tracking/vehicles/:vehicleId",
  "GET /api/vehicle-tracking/vehicles/:vehicleId/today-trip",
  "GET /api/vehicle-tracking/vehicles/:vehicleId/trips",
  "GET /api/vehicle-tracking/trips/:tripId"
];

export const VEHICLE_TRACKING_STATUS_FIELDS = [
  "id",
  "vehicleId",
  "externalProvider",
  "externalVehicleId",
  "externalUnitId",
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
  "source",
  "gpsProvider",
  "gpsUnitId",
  "lastGpsAt",
  "receivedAt",
  "updatedAt"
];

export const VEHICLE_TRACKING_TCAR_LINK_FIELDS = [
  "tcarsVehicleId",
  "tcarsUnitId",
  "tcarsLicensePlate",
  "gpsProvider"
];

export const VEHICLE_TRACKING_TCAR_PAIRING_COLUMNS = [
  "Vozidlo Smart odpady",
  "SPZ Smart odpady",
  "T-Cars vozidlo",
  "T-Cars ID",
  "T-Cars jednotka",
  "Stav párování",
  "Akce"
];

export const VEHICLE_TRACKING_TCAR_SYNC_LOG_FIELDS = [
  "id",
  "status",
  "startedAt",
  "finishedAt",
  "vehiclesFetched",
  "locationsFetched",
  "errorMessage",
  "createdAt"
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
