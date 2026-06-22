import { json, requireAdmin } from "../../../_lib/auth.js";

export async function onRequestPatch({ request, env }) {
  const { response } = await requireAdmin(env, request);

  if (response) {
    return response;
  }

  return json(
    {
      error: "Trvalá deaktivace uživatele vyžaduje D1 databázi. Endpoint je připravený pro další krok."
    },
    501
  );
}
