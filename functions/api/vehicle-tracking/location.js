import { json, readJson, requireUserPermission } from "../../_lib/auth.js";
import {
  VehicleTrackingStoreError,
  createLocationPing
} from "../../_lib/vehicle-tracking-store.js";

function vehicleTrackingError(error) {
  if (error instanceof VehicleTrackingStoreError) {
    return json({ error: error.message, apiStatus: "waiting", missingEndpoint: "POST /api/vehicle-tracking/location" }, error.status);
  }

  console.error("vehicle_tracking.location_failed", { message: error.message });
  return json({ error: "Polohu se nepodařilo odeslat.", apiStatus: "waiting" }, 500);
}

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "vehicle-tracking", "view");

  if (response) {
    return response;
  }

  try {
    const payload = await readJson(request);
    const result = await createLocationPing(env, user, payload);
    return json({ ...result, apiStatus: "ready" }, 201);
  } catch (error) {
    return vehicleTrackingError(error);
  }
}
