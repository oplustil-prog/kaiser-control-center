import { json, requireUserPermission } from "../../../_lib/auth.js";
import { runDataBoxAutomation } from "../../../_lib/data-box-automation-runner.js";

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "data-box", "manage");
  if (response) return response;

  try {
    const result = await runDataBoxAutomation(env, {
      mode: "dry-run",
      confirmed: false,
      triggeredBy: "manual-dry-run",
      currentUser: user
    });
    return json(result);
  } catch (error) {
    console.error("data_box.ds_rules_dry_run_failed", { message: error.message });
    return json({
      error: error.message || "Dry-run DS pravidel se nepodařilo spustit.",
      code: error.code || "data_box_rules_dry_run_failed",
      apiStatus: "waiting"
    }, error.status || 500);
  }
}
