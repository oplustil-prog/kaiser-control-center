import { json, requireUserPermission } from "../../../../_lib/auth.js";
import { runDataBoxAutomation } from "../../../../_lib/data-box-automation-runner.js";
import { normalizeModuleRuleModuleKey } from "../../../../_lib/module-rules-store.js";

function moduleKey(request, params) {
  const fallback = new URL(request.url).pathname.split("/").at(-3);
  return normalizeModuleRuleModuleKey(params?.moduleKey || fallback);
}

export async function onRequestPost({ request, env, params }) {
  const key = moduleKey(request, params);
  const { user, response } = await requireUserPermission(env, request, key, "manage");
  if (response) return response;

  if (key !== "data-box") {
    return json({
      error: "Dry-run pravidel je zatím napojený jen pro modul Datová schránka.",
      apiStatus: "ready"
    }, 409);
  }

  try {
    const result = await runDataBoxAutomation(env, {
      mode: "dry-run",
      confirmed: false,
      triggeredBy: "manual-dry-run",
      currentUser: user
    });
    return json(result);
  } catch (error) {
    console.error("data_box.rules_dry_run_failed", { message: error.message });
    return json({
      error: error.message || "Dry-run DS pravidel se nepodařilo spustit.",
      code: error.code || "data_box_rules_dry_run_failed",
      apiStatus: "waiting"
    }, error.status || 500);
  }
}
