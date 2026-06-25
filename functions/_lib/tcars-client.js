const TCARS_DEFAULT_BASE_URL = "https://webservice.t-cars.cz/v2/";
const TCARS_MIN_POLL_INTERVAL_SECONDS = 30;
const TCARS_DEFAULT_POLL_INTERVAL_SECONDS = 60;

export class TcarsClientError extends Error {
  constructor(message, status = 503, code = "tcars_unavailable") {
    super(message);
    this.name = "TcarsClientError";
    this.status = status;
    this.code = code;
  }
}

function present(value) {
  return String(value || "").trim() !== "";
}

function pollIntervalSeconds(env) {
  const value = Number(env.TCARS_POLL_INTERVAL_SECONDS || TCARS_DEFAULT_POLL_INTERVAL_SECONDS);
  if (!Number.isFinite(value)) {
    return TCARS_DEFAULT_POLL_INTERVAL_SECONDS;
  }

  return Math.max(TCARS_MIN_POLL_INTERVAL_SECONDS, Math.round(value));
}

export function tcarsConfig(env = {}) {
  const baseUrl = String(env.TCARS_BASE_URL || TCARS_DEFAULT_BASE_URL).trim();
  const apiMode = String(env.TCARS_API_MODE || "").trim();
  const hasCustomerNumber = present(env.TCARS_CUSTOMER_NUMBER);
  const hasUsernamePassword = present(env.TCARS_USERNAME) && present(env.TCARS_PASSWORD);
  const hasApiToken = present(env.TCARS_API_TOKEN);
  const hasCredentials = hasUsernamePassword || hasApiToken;

  return {
    baseUrl,
    apiMode,
    configured: Boolean(baseUrl && apiMode && hasCustomerNumber && hasCredentials),
    hasCustomerNumber,
    hasCredentials,
    hasApiToken,
    hasUsernamePassword,
    pollIntervalSeconds: pollIntervalSeconds(env),
    documentationStatus: "missing"
  };
}

export function tcarsStatusPayload(env = {}) {
  const config = tcarsConfig(env);
  const waitingReason = config.configured
    ? "api-documentation"
    : "configuration";

  return {
    provider: "tcars",
    mode: config.configured ? "tcars" : "waiting",
    apiStatus: "waiting",
    configured: config.configured,
    waitingReason,
    message: config.configured
      ? "Chybí API dokumentace T-Cars. Prosím dodat dokumentaci nebo potvrdit způsob napojení."
      : "T-Cars napojení čeká na konfiguraci.",
    source: "T-Cars jednotka",
    tabletRole: "Primární poloha vozidla je z T-Cars jednotky. Android tablet slouží jako vozidlový terminál.",
    pollIntervalSeconds: config.pollIntervalSeconds,
    vehicles: [],
    locations: [],
    lastKnownLocations: [],
    fallback: {
      enabled: false,
      message: "Poslední známá poloha zatím není k dispozici."
    },
    config: {
      baseUrl: config.baseUrl,
      apiMode: config.apiMode || "",
      hasCustomerNumber: config.hasCustomerNumber,
      hasCredentials: config.hasCredentials,
      hasApiToken: config.hasApiToken,
      hasUsernamePassword: config.hasUsernamePassword,
      documentationStatus: config.documentationStatus
    }
  };
}

export function tcarsVehiclesPayload(env = {}) {
  const status = tcarsStatusPayload(env);
  return {
    provider: status.provider,
    apiStatus: status.apiStatus,
    configured: status.configured,
    message: status.message,
    vehicles: [],
    units: []
  };
}

export async function syncTcarsLocations(env = {}) {
  const status = tcarsStatusPayload(env);

  if (!status.configured) {
    throw new TcarsClientError(status.message, 409, "tcars_not_configured");
  }

  throw new TcarsClientError(status.message, 501, "tcars_api_documentation_missing");
}
