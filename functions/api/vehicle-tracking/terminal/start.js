import { json, readJson, requireUserPermission } from "../../../_lib/auth.js";
import {
  VehicleTrackingStoreError,
  startTerminalSession
} from "../../../_lib/vehicle-tracking-store.js";

function vehicleTrackingError(error) {
  if (error instanceof VehicleTrackingStoreError) {
    return json({ error: error.message, apiStatus: "waiting", missingEndpoint: "POST /api/vehicle-tracking/terminal/start" }, error.status);
  }

  console.error("vehicle_tracking.terminal_start_failed", { message: error.message });
  return json({ error: "Sledování se nepodařilo spustit.", apiStatus: "waiting" }, 500);
}

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "vehicle-tracking", "view");

  if (response) {
    return response;
  }

  try {
    const payload = await readJson(request);
    const session = await startTerminalSession(env, user, payload);
    return json({ session, apiStatus: "ready" }, 201);
  } catch (error) {
    return vehicleTrackingError(error);
  }
}
