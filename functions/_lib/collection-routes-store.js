const COLLECTION_ROUTES_DB_BINDING = "SMART_ODPADY_DB";
const VISTOS_NOT_CONFIGURED_MESSAGE = "Vistos API není nakonfigurováno";

export class CollectionRoutesStoreError extends Error {
  constructor(message, status = 400, code = "collection_routes_error") {
    super(message);
    this.name = "CollectionRoutesStoreError";
    this.status = status;
    this.code = code;
  }
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function numericValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function booleanValue(value, fallback = false) {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }

  return fallback;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function jsonString(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

function randomId(prefix) {
  const suffix = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${suffix}`;
}

function nowIso() {
  return new Date().toISOString();
}

function collectionRoutesDatabase(env, required = false) {
  const db = env?.[COLLECTION_ROUTES_DB_BINDING] || null;

  if (!db && required) {
    throw new CollectionRoutesStoreError(
      "Databáze pilotu Tras svozu není nastavená. Přidejte Cloudflare D1 binding SMART_ODPADY_DB.",
      503,
      "collection_routes_database_missing"
    );
  }

  return db;
}

export function collectionRoutesApiStatus(env) {
  return collectionRoutesDatabase(env) ? "ready" : "waiting";
}

export function isVistosApiConfigured(env) {
  return Boolean(
    cleanString(env?.VISTOS_API_BASE_URL) &&
    (
      cleanString(env?.VISTOS_API_TOKEN) ||
      cleanString(env?.VISTOS_API_USERNAME) ||
      cleanString(env?.VISTOS_API_CLIENT_ID)
    )
  );
}

export function collectionRoutesDbError(error) {
  const message = cleanString(error?.message);
  if (message.includes("no such table")) {
    return new CollectionRoutesStoreError(
      "Pilotní tabulky Tras svozu nejsou v D1 připravené. Spusťte aditivní migraci Fáze 1A.",
      503,
      "collection_routes_migration_missing"
    );
  }

  console.error("collection_routes.store_failed", { message });
  return new CollectionRoutesStoreError(
    "Pilot Tras svozu se teď nepodařilo načíst nebo auditovat.",
    500,
    "collection_routes_store_failed"
  );
}

function rowToBatch(row) {
  return {
    id: cleanString(row?.id),
    source: cleanString(row?.source),
    sourceMode: cleanString(row?.source_mode),
    status: cleanString(row?.status),
    apiStatus: cleanString(row?.api_status),
    message: cleanString(row?.message),
    rowCount: numericValue(row?.row_count),
    issueCount: numericValue(row?.issue_count),
    createdByUserId: cleanString(row?.created_by_user_id),
    createdAt: cleanString(row?.created_at),
    finishedAt: cleanString(row?.finished_at),
    metadata: parseJson(row?.metadata_json, {})
  };
}

function rowToImportRow(row) {
  return {
    id: cleanString(row?.id),
    batchId: cleanString(row?.batch_id),
    rowNumber: numericValue(row?.row_number),
    sourceEntity: cleanString(row?.source_entity),
    sourceId: cleanString(row?.source_id),
    status: cleanString(row?.status),
    summary: parseJson(row?.summary_json, {}),
    issues: parseJson(row?.issues_json, []),
    createdAt: cleanString(row?.created_at)
  };
}

function rowToSite(row) {
  return {
    id: cleanString(row?.id),
    sourceSystem: cleanString(row?.source_system),
    sourceCustomerId: cleanString(row?.source_customer_id),
    sourceSiteId: cleanString(row?.source_site_id),
    customerName: cleanString(row?.customer_name),
    siteName: cleanString(row?.site_name),
    addressText: cleanString(row?.address_text),
    city: cleanString(row?.city),
    postalCode: cleanString(row?.postal_code),
    status: cleanString(row?.status),
    active: booleanValue(row?.active, true),
    locationQuality: cleanString(row?.location_quality || row?.location_quality_location || "missing"),
    lastImportBatchId: cleanString(row?.last_import_batch_id),
    createdAt: cleanString(row?.created_at),
    updatedAt: cleanString(row?.updated_at),
    location: row?.location_id ? {
      id: cleanString(row.location_id),
      latitude: row.latitude === null || row.latitude === undefined ? null : numericValue(row.latitude),
      longitude: row.longitude === null || row.longitude === undefined ? null : numericValue(row.longitude),
      quality: cleanString(row.location_quality_location),
      status: cleanString(row.location_status),
      source: cleanString(row.location_source),
      note: cleanString(row.location_note),
      confirmedAt: cleanString(row.confirmed_at)
    } : null
  };
}

function rowToService(row) {
  return {
    id: cleanString(row?.id),
    siteId: cleanString(row?.site_id),
    sourceContractId: cleanString(row?.source_contract_id),
    wasteType: cleanString(row?.waste_type),
    wasteCode: cleanString(row?.waste_code),
    frequencyCode: cleanString(row?.frequency_code),
    stablePattern: cleanString(row?.stable_pattern),
    validFrom: cleanString(row?.valid_from),
    validTo: cleanString(row?.valid_to),
    status: cleanString(row?.status)
  };
}

function rowToContainer(row) {
  return {
    id: cleanString(row?.id),
    siteId: cleanString(row?.site_id),
    serviceId: cleanString(row?.service_id),
    containerType: cleanString(row?.container_type),
    volumeLiters: numericValue(row?.volume_liters),
    quantity: numericValue(row?.quantity),
    wasteType: cleanString(row?.waste_type),
    status: cleanString(row?.status)
  };
}

function rowToIssue(row) {
  return {
    id: cleanString(row?.id),
    batchId: cleanString(row?.batch_id),
    siteId: cleanString(row?.site_id),
    issueType: cleanString(row?.issue_type),
    severity: cleanString(row?.severity),
    message: cleanString(row?.message),
    status: cleanString(row?.status),
    createdAt: cleanString(row?.created_at),
    resolvedAt: cleanString(row?.resolved_at)
  };
}

export async function listCollectionImportBatches(env, limit = 20) {
  const db = collectionRoutesDatabase(env, true);
  try {
    const result = await db
      .prepare(`
        SELECT *
        FROM collection_import_batches
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(Math.max(1, Math.min(Number(limit) || 20, 100)))
      .all();
    return (result.results || []).map(rowToBatch);
  } catch (error) {
    throw collectionRoutesDbError(error);
  }
}

export async function getCollectionImportBatch(env, id) {
  const db = collectionRoutesDatabase(env, true);
  const batchId = cleanString(id);
  try {
    const batchRow = await db
      .prepare("SELECT * FROM collection_import_batches WHERE id = ? LIMIT 1")
      .bind(batchId)
      .first();

    if (!batchRow) {
      throw new CollectionRoutesStoreError("Importní batch nebyl nalezen.", 404, "collection_routes_batch_not_found");
    }

    const rowsResult = await db
      .prepare(`
        SELECT *
        FROM collection_import_rows
        WHERE batch_id = ?
        ORDER BY row_number ASC
        LIMIT 500
      `)
      .bind(batchId)
      .all();

    return {
      batch: rowToBatch(batchRow),
      rows: (rowsResult.results || []).map(rowToImportRow)
    };
  } catch (error) {
    if (error instanceof CollectionRoutesStoreError) {
      throw error;
    }
    throw collectionRoutesDbError(error);
  }
}

export async function listCollectionSites(env, limit = 100) {
  const db = collectionRoutesDatabase(env, true);
  try {
    const result = await db
      .prepare(`
        SELECT
          s.*,
          l.id AS location_id,
          l.latitude,
          l.longitude,
          l.quality AS location_quality_location,
          l.status AS location_status,
          l.source AS location_source,
          l.note AS location_note,
          l.confirmed_at
        FROM collection_customer_sites s
        LEFT JOIN collection_site_locations l ON l.site_id = s.id
        ORDER BY s.updated_at DESC
        LIMIT ?
      `)
      .bind(Math.max(1, Math.min(Number(limit) || 100, 500)))
      .all();
    return (result.results || []).map(rowToSite);
  } catch (error) {
    throw collectionRoutesDbError(error);
  }
}

export async function getCollectionSite(env, id) {
  const db = collectionRoutesDatabase(env, true);
  const siteId = cleanString(id);
  try {
    const siteRow = await db
      .prepare(`
        SELECT
          s.*,
          l.id AS location_id,
          l.latitude,
          l.longitude,
          l.quality AS location_quality_location,
          l.status AS location_status,
          l.source AS location_source,
          l.note AS location_note,
          l.confirmed_at
        FROM collection_customer_sites s
        LEFT JOIN collection_site_locations l ON l.site_id = s.id
        WHERE s.id = ?
        LIMIT 1
      `)
      .bind(siteId)
      .first();

    if (!siteRow) {
      throw new CollectionRoutesStoreError("Stanoviště nebylo nalezeno.", 404, "collection_routes_site_not_found");
    }

    const [servicesResult, containersResult, issuesResult] = await Promise.all([
      db.prepare("SELECT * FROM collection_contract_services WHERE site_id = ? ORDER BY waste_type, waste_code").bind(siteId).all(),
      db.prepare("SELECT * FROM collection_containers WHERE site_id = ? ORDER BY waste_type, volume_liters").bind(siteId).all(),
      db.prepare("SELECT * FROM collection_data_issues WHERE site_id = ? ORDER BY created_at DESC LIMIT 100").bind(siteId).all()
    ]);

    return {
      site: rowToSite(siteRow),
      services: (servicesResult.results || []).map(rowToService),
      containers: (containersResult.results || []).map(rowToContainer),
      issues: (issuesResult.results || []).map(rowToIssue)
    };
  } catch (error) {
    if (error instanceof CollectionRoutesStoreError) {
      throw error;
    }
    throw collectionRoutesDbError(error);
  }
}

export async function listCollectionLocationIssues(env, limit = 100) {
  const db = collectionRoutesDatabase(env, true);
  try {
    const result = await db
      .prepare(`
        SELECT *
        FROM collection_data_issues
        WHERE status = 'open'
          AND (issue_type LIKE '%location%' OR issue_type LIKE '%address%' OR issue_type = 'vistos-api')
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(Math.max(1, Math.min(Number(limit) || 100, 500)))
      .all();
    return (result.results || []).map(rowToIssue);
  } catch (error) {
    throw collectionRoutesDbError(error);
  }
}

export async function createCollectionRoutesImportPreview(env, user) {
  const db = collectionRoutesDatabase(env, true);
  const createdAt = nowIso();
  const batchId = randomId("collection-import-batch");
  const issueId = randomId("collection-data-issue");
  const configured = isVistosApiConfigured(env);
  const message = configured
    ? "Vistos API je nakonfigurované, Fáze 1A zatím čeká na schválené mapování endpointů. Ostré trasy nebyly vytvořené."
    : VISTOS_NOT_CONFIGURED_MESSAGE;
  const metadata = {
    phase: "1A",
    mode: "read-only-pilot",
    source: "vistos-api-discovery",
    vistosConfigured: configured,
    createsOperationalRoutes: false,
    sendsEmailOrSms: false,
    startsAutomation: false
  };

  try {
    await db
      .prepare(`
        INSERT INTO collection_import_batches (
          id,
          source,
          source_mode,
          status,
          api_status,
          message,
          row_count,
          issue_count,
          created_by_user_id,
          created_at,
          finished_at,
          metadata_json
        )
        VALUES (?, 'vistos', 'api-discovery', ?, ?, ?, 0, ?, ?, ?, ?, ?)
      `)
      .bind(
        batchId,
        configured ? "waiting" : "waiting_configuration",
        configured ? "waiting" : "not_configured",
        message,
        configured ? 0 : 1,
        cleanString(user?.id),
        createdAt,
        createdAt,
        jsonString(metadata)
      )
      .run();

    if (!configured) {
      await db
        .prepare(`
          INSERT INTO collection_data_issues (
            id,
            batch_id,
            issue_type,
            severity,
            message,
            status,
            created_at
          )
          VALUES (?, ?, 'vistos-api', 'warning', ?, 'open', ?)
        `)
        .bind(issueId, batchId, message, createdAt)
        .run();
    }

    const { batch } = await getCollectionImportBatch(env, batchId);
    return {
      batch,
      summary: {
        status: batch.status,
        message,
        rowCount: 0,
        issueCount: configured ? 0 : 1,
        createsOperationalRoutes: false,
        sendsEmailOrSms: false,
        startsAutomation: false
      },
      apiStatus: configured ? "waiting" : "not_configured"
    };
  } catch (error) {
    if (error instanceof CollectionRoutesStoreError) {
      throw error;
    }
    throw collectionRoutesDbError(error);
  }
}
