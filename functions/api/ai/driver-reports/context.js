import { currentUser, getUsers, json, normalizeIdentifier } from "../../../_lib/auth.js";
import { canCreateDriverPartRequest } from "../../../_lib/driver-part-requests-store.js";
import { listEmployeeCards } from "../../../_lib/employees-store.js";
import {
  fleetVehicleVoiceLabel,
  resolveFleetVehiclesForDriver
} from "../../../_lib/fleet-vehicles-store.js";
import { hasPermission } from "../../../../src/permissions.js";

const MODULE_ID = "hlaseni-ridicu";
const MODULE_KEY = "driver-reports";
const VEHICLE_PICKER_MESSAGE = "Otevřu ti výběr vozidla v aplikaci.";
const VEHICLE_PICKER_OR_SPZ_QUESTION = "Vyber vozidlo v aplikaci, nebo mi řekni SPZ z vozidla.";
const NO_VERIFIED_VEHICLE_QUESTION = "Vozidlo se mi teď nepodařilo bezpečně ověřit. Vyber ho prosím v aplikaci, nebo mi řekni SPZ z vozidla.";
const LOAD_FAILED_QUESTION = "Vozidlo se mi teď nepodařilo ověřit. Vyber ho prosím v aplikaci, nebo mi řekni SPZ z vozidla.";

function cleanString(value) {
  return String(value ?? "").trim();
}

function fullEmployeeName(employee = {}) {
  return [employee.firstName, employee.lastName].map(cleanString).filter(Boolean).join(" ")
    || cleanString(employee.name)
    || cleanString(employee.fullName);
}

function sameValue(left, right) {
  const leftValue = cleanString(left).toLowerCase();
  const rightValue = cleanString(right).toLowerCase();
  return Boolean(leftValue && rightValue && leftValue === rightValue);
}

function sameContact(left, right) {
  const leftValue = normalizeIdentifier(left);
  const rightValue = normalizeIdentifier(right);
  return Boolean(leftValue && rightValue && leftValue === rightValue);
}

function uniqueEmployeeMatch(employees = [], predicate) {
  const matches = employees.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}

async function driverEmployeeFor(env, user) {
  try {
    const users = await getUsers(env);
    const employees = await listEmployeeCards(env, users, user);

    const exactIdMatch = employees.find((employee) => (
      sameValue(employee.userId, user.id) ||
      sameValue(employee.id, user.id)
    ));
    if (exactIdMatch) {
      return exactIdMatch;
    }

    const emailMatch = uniqueEmployeeMatch(employees, (employee) => sameContact(employee.email, user.email));
    if (emailMatch) {
      return emailMatch;
    }

    const phoneMatch = uniqueEmployeeMatch(employees, (employee) => sameContact(employee.phone, user.phone));
    if (phoneMatch) {
      return phoneMatch;
    }

    return uniqueEmployeeMatch(employees, (employee) => sameValue(fullEmployeeName(employee), user.name));
  } catch (error) {
    console.info("driver_reports.context_employee_lookup_skipped", { message: cleanString(error?.message) });
    return null;
  }
}

function vehicleTypeLabel(vehicle = {}) {
  return cleanString(vehicle.vehicleType || vehicle.bodyType || vehicle.vistosVehicleCategory || vehicle.type);
}

function vehicleContextItem(vehicle = {}, displayName = "") {
  return {
    id: cleanString(vehicle.id || vehicle.vehicleId || vehicle.tcarsVehicleId),
    vehicleId: cleanString(vehicle.vehicleId || vehicle.id || vehicle.tcarsVehicleId),
    displayName: cleanString(displayName) || fleetVehicleVoiceLabel(vehicle),
    type: vehicleTypeLabel(vehicle),
    brand: cleanString(vehicle.brand),
    model: cleanString(vehicle.model || vehicle.internalNumber),
    internalName: cleanString(vehicle.internalNumber || vehicle.vehicleName || vehicle.name),
    licensePlate: cleanString(vehicle.licensePlate || vehicle.tcarsLicensePlate),
    vin: cleanString(vehicle.vin),
    assignmentHint: "přiřazené vozidlo",
    source: "fleet_db",
    assignedToCurrentDriver: true,
    existsInFleet: true,
    active: true
  };
}

function vehicleContextItems(match = {}) {
  const vehicles = match.vehicle
    ? [match.vehicle]
    : Array.isArray(match.candidates) ? match.candidates : [];
  const labels = Array.isArray(match.labels) && match.labels.length
    ? match.labels
    : vehicles.map((vehicle) => fleetVehicleVoiceLabel(vehicle));

  return vehicles.map((vehicle, index) => vehicleContextItem(vehicle, labels[index]));
}

function errorPayload(errorCode, message, status = 400, extra = {}) {
  return json({
    ok: false,
    module: MODULE_ID,
    userResolved: false,
    employeeResolved: false,
    driverResolved: false,
    vehiclesVerified: false,
    vehicles: [],
    vehiclesCount: 0,
    vehicleLookupMode: "manual_spz_required",
    errorCode,
    message,
    messageForAssistant: message,
    fallbackQuestion: LOAD_FAILED_QUESTION,
    apiStatus: status >= 500 ? "waiting" : "ready",
    ...extra
  }, status);
}

export async function onRequestGet({ request, env }) {
  const user = await currentUser(env, request);

  if (!user) {
    return errorPayload("UNAUTHENTICATED", "Nejsi přihlášený.", 401);
  }

  const permissions = {
    canViewDriverReports: hasPermission(user, MODULE_KEY, "view"),
    canCreateDriverReport: canCreateDriverPartRequest(user),
    canViewFleet: hasPermission(user, "fleet", "view")
  };

  if (!permissions.canViewDriverReports || !permissions.canCreateDriverReport || !permissions.canViewFleet) {
    return errorPayload("FORBIDDEN", "K tomu nemáš oprávnění.", 403, { permissions });
  }

  const url = new URL(request.url);
  const transcriptIntent = cleanString(url.searchParams.get("transcriptIntent") || url.searchParams.get("intent"));
  const sessionId = cleanString(url.searchParams.get("sessionId") || url.searchParams.get("conversationId"));
  const currentModule = cleanString(url.searchParams.get("currentModule")) || MODULE_ID;
  const includeVehiclePicker = ["true", "1", "ano", "vehicle_picker"].includes(
    cleanString(url.searchParams.get("includeVehiclePicker") || url.searchParams.get("vehiclePicker") || url.searchParams.get("mode")).toLowerCase()
  );
  const employee = await driverEmployeeFor(env, user);
  const employeeId = cleanString(employee?.id || user.id);
  const driverUserId = cleanString(employee?.userId || user.id);
  const driverIds = [employee?.id, employee?.userId, user.id].map(cleanString).filter(Boolean);
  const driverName = fullEmployeeName(employee) || cleanString(user.name);

  let match;
  try {
    match = await resolveFleetVehiclesForDriver(env, user, {
      strictDriverAssignment: true,
      driverIds,
      driverEmployeeId: employeeId,
      driverUserId,
      driverName,
      driverPhone: cleanString(employee?.phone || user.phone),
      transcriptIntent,
      currentModule
    });
  } catch (error) {
    console.error("driver_reports.context_vehicle_lookup_failed", { message: cleanString(error?.message) });
    return errorPayload("VEHICLES_UNAVAILABLE", "Vozidla se mi teď nepodařilo načíst.", 500);
  }

  if (match?.status === "failed") {
    return errorPayload("VEHICLES_UNAVAILABLE", "Vozidla se mi teď nepodařilo načíst.", 500);
  }

  const rawVehicles = vehicleContextItems(match);
  const vehiclesAreSafelyVerified = Boolean(
    employee &&
    rawVehicles.length > 0 &&
    match?.fallbackUsed !== true &&
    match?.mockData !== true &&
    match?.status !== "failed" &&
    rawVehicles.every((vehicle) => vehicle.id && vehicle.existsInFleet === true && vehicle.assignedToCurrentDriver === true && vehicle.active === true)
  );
  const vehicles = vehiclesAreSafelyVerified && includeVehiclePicker ? rawVehicles : [];
  const emptyReason = vehiclesAreSafelyVerified
    ? ""
    : employee ? "NO_DRIVER_VEHICLES" : "DRIVER_NOT_MAPPED";
  const fallbackQuestion = vehiclesAreSafelyVerified
    ? VEHICLE_PICKER_OR_SPZ_QUESTION
    : NO_VERIFIED_VEHICLE_QUESTION;
  const vehicleLookupMode = vehiclesAreSafelyVerified
    ? (includeVehiclePicker ? "verified_ui_picker" : "ui_picker_or_manual_spz")
    : "manual_spz_required";
  const messageForAssistant = vehiclesAreSafelyVerified
    ? VEHICLE_PICKER_MESSAGE
    : NO_VERIFIED_VEHICLE_QUESTION;
  const diagnostics = {
    userId: cleanString(user.id),
    userName: cleanString(user.name),
    employeeId,
    driverUserId,
    driverMapped: Boolean(employee),
    driverResolved: vehiclesAreSafelyVerified,
    identitySource: cleanString(match?.identity?.source || (employee ? "employees" : "auth_user")),
    dataSource: cleanString(match?.dataSource),
    vehiclesCountBeforeFilter: includeVehiclePicker ? rawVehicles.length : 0,
    vehiclesCountAfterFilter: vehicles.length,
    vehiclesVerified: vehiclesAreSafelyVerified && includeVehiclePicker,
    vehiclePickerAvailable: vehiclesAreSafelyVerified,
    vehicleLookupMode,
    vehicleListReturned: includeVehiclePicker,
    fallbackUsed: match?.fallbackUsed === true,
    mockData: match?.mockData === true,
    emptyReason
  };

  console.info("driver_reports.context_vehicle_lookup", diagnostics);

  return json({
    ok: true,
    module: MODULE_ID,
    currentModule,
    sessionId,
    status: match?.status || "none",
    errorCode: emptyReason,
    userName: cleanString(user.name),
    userResolved: true,
    employeeResolved: Boolean(employee),
    driverResolved: vehiclesAreSafelyVerified,
    vehiclesVerified: vehiclesAreSafelyVerified && includeVehiclePicker,
    vehiclePickerAvailable: vehiclesAreSafelyVerified,
    vehicleLookupMode,
    user: {
      id: cleanString(user.id),
      name: cleanString(user.name),
      employeeId
    },
    driver: {
      employeeId,
      displayName: driverName,
      source: diagnostics.identitySource
    },
    vehicles,
    vehiclesCount: vehicles.length,
    permissions,
    fallbackQuestion,
    message: messageForAssistant,
    messageForAssistant,
    diagnostics,
    apiStatus: "ready"
  });
}
