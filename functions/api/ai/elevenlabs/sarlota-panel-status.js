import { json, requireUserPermission } from "../../../_lib/auth.js";
import { sarlotaPanelStatusPayload } from "./sarlota-status.js";

export async function onRequestGet({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "dashboard", "view");

  if (response) {
    return response;
  }

  return json(await sarlotaPanelStatusPayload(env, user));
}
