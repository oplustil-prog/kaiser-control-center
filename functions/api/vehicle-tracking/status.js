import { json, requireUserPermission } from "../../_lib/auth.js";
import {
  VehicleTrackingStoreError,
  listVehicleTrackingStatus
} from "../../_lib/vehicle-tracking-store.js";

function vehicleTrackingError(error) {
  if (error instanceof VehicleTrackingStoreError) {
    return json({ error: error.message, apiStatus: "waiting", missingEndpoint: "GET /api/vehicle-tracking/status" }, error.status);
  }

  console.error("vehicle_tracking.status_failed", { message: error.message });
  return json({ error: "Sledování vozidel se nepodařilo načíst.", apiStatus: "waiting" }, 500);
}

export async function onRequestGet({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "vehicle-tracking", "view");

  if (response) {
    return response;
  }

  try {
    const items = await listVehicleTrackingStatus(env, user);
    return json({ items, apiStatus: "ready" });
  } catch (error) {
    return vehicleTrackingError(error);
  }
}
