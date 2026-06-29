import { json, requireUserPermission } from "../../_lib/auth.js";
import {
  getSystemCheckStatus,
  productionMonitorApiStatus,
  productionMonitorErrorResponse
} from "../../_lib/production-monitor-store.js";

export async function onRequestGet({ request, env }) {
  const { response } = await requireUserPermission(env, request, "system-check", "view");
  if (response) return response;

  try {
    const status = await getSystemCheckStatus(env);
    return json({
      ...status,
      apiStatus: productionMonitorApiStatus(env)
    });
  } catch (error) {
    const result = productionMonitorErrorResponse(error);
    return json(result.payload, result.status);
  }
}
