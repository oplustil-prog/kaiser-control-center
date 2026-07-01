import { currentUser, getUsers, json, normalizeIdentifier } from "../../../_lib/auth.js";
import { canCreateDriverPartRequest } from "../../../_lib/driver-part-requests-store.js";
import { listEmployeeCards } from "../../../_lib/employees-store.js";
import {
  fleetVehicleSelectionQuestion,
  fleetVehicleVoiceLabel,
  resolveFleetVehiclesForDriver
} from "../../../_lib/fleet-vehicles-store.js";
import { hasPermission } from "../../../../src/permissions.js";

const MODULE_ID = "hlaseni-ridicu";
const MODULE_KEY = "driver-reports";
const NO_VEHICLE_QUESTION = "Nemám u tebe teď přiřazené žádné vozidlo. Můžeš mi říct SPZ, ke které chceš závadu nahlásit?";
const LOAD_FAILED_QUESTION = "Vozidla se mi teď nepodařilo načíst. Řekni mi prosím typ, značku nebo SPZ.";
const VERIFIED_VEHICLE_STATUSES = new Set(["single", "selected", "multiple"]);

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
    assignmentHint: "přiřazené vozidlo"
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

function responseMessage(vehicles = [], fallbackQuestion = NO_VEHICLE_QUESTION) {
  if (vehicles.length === 1) {
    return `Vidím u tebe ${vehicles[0].displayName}. Mám hlášení zapsat k němu?`;
  }

  if (vehicles.length > 1) {
    const names = vehicles.slice(0, 5).map((vehicle) => vehicle.displayName).join(", ");
    const suffix = vehicles.length > 5 ? " a další" : "";
    return `Vidím u tebe víc vozidel: ${names}${suffix}. Kterého se to týká?`;
  }

  return fallbackQuestion;
}

function safeVehicleContext(match = {}, driverResolved = false) {
  const rawVehicles = vehicleContextItems(match);
  const fallbackUsed = match?.fallbackUsed === true;
  const isDemoData = match?.mockData === true;
  const status = cleanString(match?.status);
  const vehiclesVerified = Boolean(
    driverResolved &&
    rawVehicles.length &&
    !fallbackUsed &&
    !isDemoData &&
    VERIFIED_VEHICLE_STATUSES.has(status)
  );

  return {
    vehicles: vehiclesVerified ? rawVehicles : [],
    rawVehiclesCount: rawVehicles.length,
    vehiclesVerified,
    status,
    fallbackUsed,
    isDemoData
  };
}

function emptyErrorCode({ driverResolved, vehiclesVerified, rawVehiclesCount, fallbackUsed, isDemoData }) {
  if (vehiclesVerified) {
    return "";
  }

  if (!driverResolved) {
    return "DRIVER_NOT_MAPPED";
  }

  if (isDemoData) {
    return "DEMO_VEHICLES_BLOCKED";
  }

  if (fallbackUsed || rawVehiclesCount) {
    return "NO_VERIFIED_DRIVER_VEHICLES";
  }

  return "NO_VEHICLES_ASSIGNED";
}

function errorPayload(errorCode, message, status = 400, extra = {}) {
  return json({
    ok: false,
    module: MODULE_ID,
    errorCode,
    message,
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
  const employee = await driverEmployeeFor(env, user);
  const driverResolved = Boolean(employee);
  const employeeId = cleanString(employee?.id || user.id);
  const resolvedEmployeeId = driverResolved ? employeeId : "";
  const driverUserId = cleanString(employee?.userId || user.id);
  const resolvedDriverUserId = driverResolved ? driverUserId : "";
  const driverIds = [employee?.id, employee?.userId, user.id].map(cleanString).filter(Boolean);
  const driverName = fullEmployeeName(employee) || cleanString(user.name);

  let match;
  try {
    match = driverResolved
      ? await resolveFleetVehiclesForDriver(env, user, {
        strictDriverAssignment: true,
        driverIds,
        driverEmployeeId: employeeId,
        driverUserId,
        driverName,
        driverPhone: cleanString(employee?.phone || user.phone),
        transcriptIntent,
        currentModule
      })
      : {
        status: "driver_not_mapped",
        vehicle: null,
        candidates: [],
        question: "",
        fallbackUsed: false,
        mockData: false,
        dataSource: "",
        identity: { source: "auth_user" }
      };
  } catch (error) {
    console.error("driver_reports.context_vehicle_lookup_failed", { message: cleanString(error?.message) });
    return errorPayload("VEHICLES_UNAVAILABLE", "Vozidla se mi teď nepodařilo načíst.", 500);
  }

  if (match?.status === "failed") {
    return errorPayload("VEHICLES_UNAVAILABLE", "Vozidla se mi teď nepodařilo načíst.", 500);
  }

  const safeContext = safeVehicleContext(match, driverResolved);
  const vehicles = safeContext.vehicles;
  const vehiclesSource = cleanString(match?.dataSource);
  const emptyReason = emptyErrorCode({
    driverResolved,
    vehiclesVerified: safeContext.vehiclesVerified,
    rawVehiclesCount: safeContext.rawVehiclesCount,
    fallbackUsed: safeContext.fallbackUsed,
    isDemoData: safeContext.isDemoData
  });
  const fallbackQuestion = safeContext.vehiclesVerified && vehicles.length > 1
    ? (match.question || fleetVehicleSelectionQuestion(vehicles))
    : safeContext.vehiclesVerified && vehicles.length === 1
      ? "Kterého vozidla se to týká?"
      : NO_VEHICLE_QUESTION;
  const diagnostics = {
    userId: cleanString(user.id),
    employeeId: resolvedEmployeeId,
    driverUserId: resolvedDriverUserId,
    driverMapped: driverResolved,
    driverResolved,
    identitySource: cleanString(match?.identity?.source || (employee ? "employees" : "auth_user")),
    dataSource: vehiclesSource,
    vehiclesCount: vehicles.length,
    rawVehiclesCount: safeContext.rawVehiclesCount,
    vehiclesVerified: safeContext.vehiclesVerified,
    fallbackUsed: safeContext.fallbackUsed,
    mockData: safeContext.isDemoData,
    isDemoData: safeContext.isDemoData,
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
    driverResolved,
    driverId: driverResolved ? employeeId : "",
    vehiclesVerified: safeContext.vehiclesVerified,
    vehiclesSource,
    isDemoData: safeContext.isDemoData,
    fallbackUsed: safeContext.fallbackUsed,
    user: {
      id: cleanString(user.id),
      name: cleanString(user.name),
      employeeId: resolvedEmployeeId
    },
    driver: {
      employeeId: resolvedEmployeeId,
      displayName: driverName,
      source: diagnostics.identitySource
    },
    vehicles,
    vehiclesCount: vehicles.length,
    permissions,
    fallbackQuestion,
    message: responseMessage(vehicles, fallbackQuestion),
    diagnostics,
    apiStatus: "ready"
  });
}
