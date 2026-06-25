import { json, requireUserPermission } from "../../../_lib/auth.js";
import {
  VehicleTrackingStoreError,
  listTerminalVehicles
} from "../../../_lib/vehicle-tracking-store.js";

function vehicleTrackingError(error) {
  if (error instanceof VehicleTrackingStoreError) {
    return json({ error: error.message, apiStatus: "waiting", missingEndpoint: "GET /api/vehicle-tracking/terminal/vehicles" }, error.status);
  }

  console.error("vehicle_tracking.terminal_vehicles_failed", { message: error.message });
  return json({ error: "Seznam vozidel se teď nepodařilo načíst.", apiStatus: "waiting" }, 500);
}

export async function onRequestGet({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "vehicle-tracking", "view");

  if (response) {
    return response;
  }

  try {
    const vehicles = await listTerminalVehicles(env, user);
    return json({ vehicles, apiStatus: "ready" });
  } catch (error) {
    return vehicleTrackingError(error);
  }
}
