import { currentUser, json } from "../../_lib/auth.js";
import { normalizeRole } from "../../../src/permissions.js";
import {
  CollectionRoutesStoreError,
  createCollectionRoutesImportPreview
} from "../../_lib/collection-routes-store.js";

function collectionRoutesError(error) {
  if (error instanceof CollectionRoutesStoreError) {
    return json({ error: error.message, code: error.code, apiStatus: "waiting" }, error.status);
  }

  console.error("collection_routes.import_preview_failed", { message: error.message });
  return json({ error: "Import preview Tras svozu se teď nepodařilo spustit.", apiStatus: "waiting" }, 500);
}

async function requireCollectionRoutesAdmin(env, request) {
  const user = await currentUser(env, request);

  if (!user) {
    return { user: null, response: json({ error: "Nepřihlášeno." }, 401) };
  }

  if (normalizeRole(user.role) !== "admin") {
    return { user, response: json({ error: "Nemáte oprávnění." }, 403) };
  }

  return { user, response: null };
}

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireCollectionRoutesAdmin(env, request);

  if (response) {
    return response;
  }

  try {
    const preview = await createCollectionRoutesImportPreview(env, user);
    return json({ preview, apiStatus: preview.apiStatus || "waiting" });
  } catch (error) {
    return collectionRoutesError(error);
  }
}
