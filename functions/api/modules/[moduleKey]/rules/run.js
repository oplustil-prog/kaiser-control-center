import { json, readJson, requireUserPermission } from "../../../../_lib/auth.js";
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
      error: "Ruční běh pravidel je zatím napojený jen pro modul Datová schránka.",
      apiStatus: "ready"
    }, 409);
  }

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
    console.error("data_box.rules_run_failed", { message: error.message });
    return json({
      error: error.message || "Běh DS pravidel se nepodařilo spustit.",
      code: error.code || "data_box_rules_run_failed",
      apiStatus: "waiting"
    }, error.status || 500);
  }
}
