import { hasPermission, isFullAccessRole, normalizeRole } from "../../src/permissions.js";

const DB_BINDING = "SMART_ODPADY_DB";
const TERMINAL_ROLES = new Set(["admin", "management", "dispecer", "ridic"]);
const DISPATCHER_ROLES = new Set(["admin", "management", "kancelar", "garazmistr", "dispecer"]);
const OFFLINE_AFTER_MS = 5 * 60 * 1000;
const STALE_LOCATION_AFTER_MS = 2 * 60 * 1000;

export class VehicleTrackingStoreError extends Error {
  constructor(message, status = 400, code = "vehicle_tracking_error") {
    super(message);
    this.name = "VehicleTrackingStoreError";
    this.status = status;
    this.code = code;
  }
}

function vehicleTrackingDatabase(env, required = false) {
  const db = env?.[DB_BINDING] || null;

  if (!db && required) {
    throw new VehicleTrackingStoreError(
      "Databáze sledování vozidel není nastavená. Přidejte Cloudflare D1 binding SMART_ODPADY_DB.",
      503,
      "vehicle_tracking_database_missing"
    );
  }

  return db;
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function nullableString(value) {
  const cleaned = cleanString(value);
  return cleaned || null;
}

function nullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  const id = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${id}`;
}

function normalizeTimestamp(value, fallback = nowIso()) {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return fallback;
  }

  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function role(user) {
  return normalizeRole(user?.role);
}

export function canUseVehicleTerminal(user) {
  return Boolean(user) &&
    hasPermission(user, "vehicle-tracking", "view") &&
    (isFullAccessRole(user) || TERMINAL_ROLES.has(role(user)));
}

export function canViewVehicleTrackingStatus(user) {
  return Boolean(user) &&
    hasPermission(user, "vehicle-tracking", "view") &&
    (isFullAccessRole(user) || DISPATCHER_ROLES.has(role(user)) || role(user) === "ridic");
}

function assertTerminalAccess(user) {
  if (!canUseVehicleTerminal(user)) {
    throw new VehicleTrackingStoreError("Nemáte oprávnění spustit vozidlový terminál.", 403, "vehicle_terminal_forbidden");
  }
}

function assertStatusAccess(user) {
  if (!canViewVehicleTrackingStatus(user)) {
    throw new VehicleTrackingStoreError("Nemáte oprávnění zobrazit sledování vozidel.", 403, "vehicle_tracking_forbidden");
  }
}

function sessionFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: cleanString(row.id),
    vehicleId: cleanString(row.vehicle_id),
    vehicleLicensePlate: cleanString(row.vehicle_license_plate),
    userId: cleanString(row.user_id),
    userName: cleanString(row.user_name),
    deviceName: cleanString(row.device_name),
    deviceType: cleanString(row.device_type),
    startedAt: cleanString(row.started_at),
    stoppedAt: row.stopped_at || null,
    lastLocationAt: row.last_location_at || null,
    lastLatitude: nullableNumber(row.last_latitude),
    lastLongitude: nullableNumber(row.last_longitude),
    lastAccuracyMeters: nullableNumber(row.last_accuracy_meters),
    lastSpeedKmh: nullableNumber(row.last_speed_kmh),
    lastHeading: nullableNumber(row.last_heading),
    status: cleanString(row.status) || "active",
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function pingFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: cleanString(row.id),
    vehicleId: cleanString(row.vehicle_id),
    sessionId: cleanString(row.session_id),
    userId: cleanString(row.user_id),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    accuracyMeters: nullableNumber(row.accuracy_meters),
    speedKmh: nullableNumber(row.speed_kmh),
    heading: nullableNumber(row.heading),
    batteryLevel: nullableNumber(row.battery_level),
    isCharging: row.is_charging === null || row.is_charging === undefined ? null : Boolean(row.is_charging),
    networkType: cleanString(row.network_type),
    recordedAt: cleanString(row.recorded_at),
    receivedAt: cleanString(row.received_at)
  };
}

function normalizeVehicleId(value) {
  const vehicleId = cleanString(value);

  if (!vehicleId) {
    throw new VehicleTrackingStoreError("Nejdřív vyberte vozidlo.", 400, "vehicle_required");
  }

  return vehicleId.slice(0, 120);
}

function normalizeCoordinate(value, label, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < min || number > max) {
    throw new VehicleTrackingStoreError(`${label} není platná.`, 400, "invalid_coordinate");
  }

  return number;
}

function normalizeBatteryLevel(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : null;
}

function normalizeBooleanInteger(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return value === true ? 1 : value === false ? 0 : null;
}

function isDriver(user) {
  return role(user) === "ridic" && !isFullAccessRole(user);
}

function statusForSession(session, now = Date.now()) {
  if (!session) {
    return {
      status: "no_signal",
      statusLabel: "Bez signálu",
      signalState: "Bez aktuální polohy"
    };
  }

  if (session.status === "error") {
    return {
      status: "error",
      statusLabel: "Chyba",
      signalState: "Chyba terminálu"
    };
  }

  const lastLocationAt = session.lastLocationAt ? new Date(session.lastLocationAt).getTime() : 0;
  const ageMs = lastLocationAt ? now - lastLocationAt : Number.POSITIVE_INFINITY;

  if (!lastLocationAt || ageMs > OFFLINE_AFTER_MS) {
    return {
      status: "offline",
      statusLabel: "Offline",
      signalState: "Offline"
    };
  }

  if (!Number.isFinite(Number(session.lastAccuracyMeters)) || ageMs > STALE_LOCATION_AFTER_MS) {
    return {
      status: "no_signal",
      statusLabel: "Bez signálu",
      signalState: "Bez aktuální polohy"
    };
  }

  const moving = Number(session.lastSpeedKmh || 0) > 5;

  return {
    status: moving ? "moving" : "stopped",
    statusLabel: moving ? "Jede" : "Stojí",
    signalState: "Aktuální poloha"
  };
}

function statusItemFromSession(session) {
  const state = statusForSession(session);

  return {
    vehicleId: session.vehicleId,
    licensePlate: session.vehicleLicensePlate,
    driverId: session.userId,
    driverName: session.userName,
    status: state.status,
    statusLabel: state.statusLabel,
    signalState: state.signalState,
    lastLatitude: session.lastLatitude,
    lastLongitude: session.lastLongitude,
    speedKmh: session.lastSpeedKmh,
    heading: session.lastHeading,
    accuracyMeters: session.lastAccuracyMeters,
    source: "Android tablet",
    lastLocationAt: session.lastLocationAt,
    updatedAt: session.updatedAt
  };
}

export async function listTerminalVehicles(env, user) {
  assertTerminalAccess(user);
  const db = vehicleTrackingDatabase(env, true);
  const driverOnly = isDriver(user);
  const query = `
    SELECT
      vehicle_id,
      vehicle_license_plate,
      user_name,
      MAX(updated_at) AS updated_at
    FROM vehicle_device_sessions
    ${driverOnly ? "WHERE user_id = ?" : ""}
    GROUP BY vehicle_id, vehicle_license_plate, user_name
    ORDER BY vehicle_license_plate COLLATE NOCASE ASC, vehicle_id COLLATE NOCASE ASC
    LIMIT 250
  `;
  const statement = db.prepare(query);
  const result = driverOnly
    ? await statement.bind(user.id).all()
    : await statement.all();

  return (result.results || []).map((row) => ({
    id: cleanString(row.vehicle_id),
    vehicleId: cleanString(row.vehicle_id),
    licensePlate: cleanString(row.vehicle_license_plate),
    driverName: cleanString(row.user_name),
    source: "Android tablet",
    updatedAt: cleanString(row.updated_at)
  }));
}

export async function startTerminalSession(env, user, input = {}) {
  assertTerminalAccess(user);
  const db = vehicleTrackingDatabase(env, true);
  const vehicleId = normalizeVehicleId(input.vehicleId);
  const vehicleLicensePlate = nullableString(input.vehicleLicensePlate) || vehicleId;
  const timestamp = nowIso();
  const session = {
    id: newId("vts"),
    vehicleId,
    vehicleLicensePlate,
    userId: cleanString(user.id),
    userName: cleanString(user.name),
    deviceName: nullableString(input.deviceName),
    deviceType: nullableString(input.deviceType) || "android-tablet",
    startedAt: timestamp,
    stoppedAt: null,
    lastLocationAt: null,
    lastLatitude: null,
    lastLongitude: null,
    lastAccuracyMeters: null,
    lastSpeedKmh: null,
    lastHeading: null,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await db
    .prepare(`
      UPDATE vehicle_device_sessions
      SET status = 'stopped', stopped_at = ?, updated_at = ?
      WHERE user_id = ? AND status = 'active'
    `)
    .bind(timestamp, timestamp, session.userId)
    .run();

  await db
    .prepare(`
      INSERT INTO vehicle_device_sessions (
        id,
        vehicle_id,
        vehicle_license_plate,
        user_id,
        user_name,
        device_name,
        device_type,
        started_at,
        stopped_at,
        last_location_at,
        last_latitude,
        last_longitude,
        last_accuracy_meters,
        last_speed_kmh,
        last_heading,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      session.id,
      session.vehicleId,
      session.vehicleLicensePlate,
      session.userId,
      session.userName,
      session.deviceName,
      session.deviceType,
      session.startedAt,
      session.stoppedAt,
      session.lastLocationAt,
      session.lastLatitude,
      session.lastLongitude,
      session.lastAccuracyMeters,
      session.lastSpeedKmh,
      session.lastHeading,
      session.status,
      session.createdAt,
      session.updatedAt
    )
    .run();

  return session;
}

async function findSession(db, sessionId) {
  const row = await db
    .prepare("SELECT * FROM vehicle_device_sessions WHERE id = ?")
    .bind(sessionId)
    .first();

  return sessionFromRow(row);
}

function assertSessionOwner(user, session) {
  if (!session) {
    throw new VehicleTrackingStoreError("Sledovací session neexistuje.", 404, "session_not_found");
  }

  if (session.userId !== cleanString(user.id) && !isFullAccessRole(user)) {
    throw new VehicleTrackingStoreError("Nemáte oprávnění k této sledovací session.", 403, "session_forbidden");
  }
}

export async function createLocationPing(env, user, input = {}) {
  assertTerminalAccess(user);
  const db = vehicleTrackingDatabase(env, true);
  const sessionId = cleanString(input.sessionId);
  const vehicleId = normalizeVehicleId(input.vehicleId);
  const latitude = normalizeCoordinate(input.latitude, "Zeměpisná šířka", -90, 90);
  const longitude = normalizeCoordinate(input.longitude, "Zeměpisná délka", -180, 180);
  const session = await findSession(db, sessionId);
  assertSessionOwner(user, session);

  if (session.vehicleId !== vehicleId) {
    throw new VehicleTrackingStoreError("Vozidlo neodpovídá aktivní session.", 400, "vehicle_session_mismatch");
  }

  const receivedAt = nowIso();
  const ping = {
    id: newId("vlp"),
    vehicleId,
    sessionId,
    userId: cleanString(user.id),
    latitude,
    longitude,
    accuracyMeters: nullableNumber(input.accuracyMeters),
    speedKmh: nullableNumber(input.speedKmh),
    heading: nullableNumber(input.heading),
    batteryLevel: normalizeBatteryLevel(input.batteryLevel),
    isCharging: normalizeBooleanInteger(input.isCharging),
    networkType: nullableString(input.networkType),
    recordedAt: normalizeTimestamp(input.recordedAt, receivedAt),
    receivedAt
  };

  await db
    .prepare(`
      INSERT INTO vehicle_location_pings (
        id,
        vehicle_id,
        session_id,
        user_id,
        latitude,
        longitude,
        accuracy_meters,
        speed_kmh,
        heading,
        battery_level,
        is_charging,
        network_type,
        recorded_at,
        received_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      ping.id,
      ping.vehicleId,
      ping.sessionId,
      ping.userId,
      ping.latitude,
      ping.longitude,
      ping.accuracyMeters,
      ping.speedKmh,
      ping.heading,
      ping.batteryLevel,
      ping.isCharging,
      ping.networkType,
      ping.recordedAt,
      ping.receivedAt
    )
    .run();

  await db
    .prepare(`
      UPDATE vehicle_device_sessions
      SET
        last_location_at = ?,
        last_latitude = ?,
        last_longitude = ?,
        last_accuracy_meters = ?,
        last_speed_kmh = ?,
        last_heading = ?,
        status = 'active',
        updated_at = ?
      WHERE id = ?
    `)
    .bind(
      ping.recordedAt,
      ping.latitude,
      ping.longitude,
      ping.accuracyMeters,
      ping.speedKmh,
      ping.heading,
      ping.receivedAt,
      ping.sessionId
    )
    .run();

  const updatedSession = await findSession(db, sessionId);

  return {
    ping: pingFromRow({
      id: ping.id,
      vehicle_id: ping.vehicleId,
      session_id: ping.sessionId,
      user_id: ping.userId,
      latitude: ping.latitude,
      longitude: ping.longitude,
      accuracy_meters: ping.accuracyMeters,
      speed_kmh: ping.speedKmh,
      heading: ping.heading,
      battery_level: ping.batteryLevel,
      is_charging: ping.isCharging,
      network_type: ping.networkType,
      recorded_at: ping.recordedAt,
      received_at: ping.receivedAt
    }),
    session: updatedSession
  };
}

export async function stopTerminalSession(env, user, input = {}) {
  assertTerminalAccess(user);
  const db = vehicleTrackingDatabase(env, true);
  const sessionId = cleanString(input.sessionId);
  const session = await findSession(db, sessionId);
  assertSessionOwner(user, session);

  const timestamp = nowIso();
  await db
    .prepare(`
      UPDATE vehicle_device_sessions
      SET status = 'stopped', stopped_at = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(timestamp, timestamp, sessionId)
    .run();

  return await findSession(db, sessionId);
}

export async function listVehicleTrackingStatus(env, user) {
  assertStatusAccess(user);
  const db = vehicleTrackingDatabase(env, true);
  const driverOnly = isDriver(user);
  const query = `
    SELECT *
    FROM vehicle_device_sessions
    ${driverOnly ? "WHERE user_id = ?" : ""}
    ORDER BY COALESCE(last_location_at, started_at) DESC
    LIMIT 250
  `;
  const statement = db.prepare(query);
  const result = driverOnly
    ? await statement.bind(user.id).all()
    : await statement.all();

  return (result.results || [])
    .map(sessionFromRow)
    .filter(Boolean)
    .map(statusItemFromSession);
}
