import { json, requireUserPermission } from "../../_lib/auth.js";
import { cleanupDuplicatedDataBoxMessages, dataBoxStoreErrorResponse } from "../../_lib/data-box-store.js";

const CLEANUP_CONFIRMATION = "DELETE_DUPLICATE_KS_FROM_NANOLAB_PLUS";

function canCleanupDataBox(user) {
  return ["admin", "management"].includes(String(user?.role || "").trim().toLowerCase());
}

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "data-box", "manage");
  if (response) return response;

  if (!canCleanupDataBox(user)) {
    return json({ error: "Nemate opravneni cistit zpravy Datove schranky." }, 403);
  }

  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const dryRun = String(body?.dryRun ?? url.searchParams.get("dryRun") ?? "true") !== "false";
  const confirm = String(body?.confirm ?? url.searchParams.get("confirm") ?? "");

  if (!dryRun && confirm !== CLEANUP_CONFIRMATION) {
    return json({
      error: "Cleanup vyzaduje potvrzeni.",
      requiredConfirm: CLEANUP_CONFIRMATION
    }, 400);
  }

  try {
    const result = await cleanupDuplicatedDataBoxMessages(env, {
      dryRun,
      sourceDataBoxId: body?.sourceDataBoxId || url.searchParams.get("sourceDataBoxId") || "kaiser-primary",
      targetDataBoxId: body?.targetDataBoxId || url.searchParams.get("targetDataBoxId") || "kaiser-data-box-3",
      changedByUserId: user?.id || user?.email || "system"
    });
    return json(result);
  } catch (error) {
    const result = dataBoxStoreErrorResponse(error);
    return json(result.payload, result.status);
  }
}
