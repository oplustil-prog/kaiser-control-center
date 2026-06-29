import { json, readJson, requireUserPermission } from "../../../_lib/auth.js";
import { runDataBoxAutomation } from "../../../_lib/data-box-automation-runner.js";

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "data-box", "manage");
  if (response) return response;

  try {
    const payload = await readJson(request);
    const result = await runDataBoxAutomation(env, {
      mode: payload.mode || "live",
      confirmed: payload.confirmed === true,
      triggeredBy: "manual",
      currentUser: user
    });
    return json(result);
  } catch (error) {
    console.error("data_box.ds_rules_run_failed", { message: error.message });
    return json({
      error: error.message || "Běh DS pravidel se nepodařilo spustit.",
      code: error.code || "data_box_rules_run_failed",
      apiStatus: "waiting"
    }, error.status || 500);
  }
}
