import { json, readJson, requireUserPermission } from "../../_lib/auth.js";
import {
  ModuleRulesStoreError,
  createModuleRule,
  listModuleRules,
  moduleRulesApiStatus
} from "../../_lib/module-rules-store.js";

function rulesError(error) {
  if (error instanceof ModuleRulesStoreError) {
    return json({ error: error.message, code: error.code, apiStatus: "waiting" }, error.status);
  }
  console.error("data_box.ds_rules_failed", { message: error.message });
  return json({ error: "DS pravidla se nepodařilo načíst nebo uložit.", apiStatus: "waiting" }, 500);
}

export async function onRequestGet({ request, env }) {
  const { response } = await requireUserPermission(env, request, "data-box", "view");
  if (response) return response;

  try {
    return json({ rules: await listModuleRules(env, "data-box"), apiStatus: moduleRulesApiStatus(env) });
  } catch (error) {
    return rulesError(error);
  }
}

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "data-box", "manage");
  if (response) return response;

  try {
    const rule = await createModuleRule(env, "data-box", await readJson(request), user);
    return json({ rule, apiStatus: "ready" }, 201);
  } catch (error) {
    return rulesError(error);
  }
}
