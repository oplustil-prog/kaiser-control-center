import { json, readJson, requireUserPermission } from "../../../_lib/auth.js";
import {
  VehicleTrackingStoreError,
  stopTerminalSession
} from "../../../_lib/vehicle-tracking-store.js";

function vehicleTrackingError(error) {
  if (error instanceof VehicleTrackingStoreError) {
    return json({ error: error.message, apiStatus: "waiting", missingEndpoint: "POST /api/vehicle-tracking/terminal/stop" }, error.status);
  }

  console.error("vehicle_tracking.terminal_stop_failed", { message: error.message });
  return json({ error: "Sledování se nepodařilo zastavit.", apiStatus: "waiting" }, 500);
}

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "vehicle-tracking", "view");

  if (response) {
    return response;
  }

  try {
    const payload = await readJson(request);
    const session = await stopTerminalSession(env, user, payload);
    return json({ session, apiStatus: "ready" });
  } catch (error) {
    return vehicleTrackingError(error);
  }
}
