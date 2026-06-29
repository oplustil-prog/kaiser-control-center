import { listAbsenceRequests } from "./absence-requests-store.js";
import { getUsers } from "./auth.js";
import { DEFAULT_CZECH_NAMEDAYS } from "./czech-namedays.js";
import { getEmployeeCard } from "./employees-store.js";
import { currentSarlotaWeather } from "./sarlota-weather.js";
import { hasPermission } from "../../src/permissions.js";

const MAX_SUGGESTIONS = 3;
const HOT_WEATHER_CELSIUS = 28;
const RECENT_VACATION_DAYS = 14;

function cleanString(value) {
  return String(value ?? "").trim();
}

function truncate(value, max = 240) {
  const text = cleanString(value).replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trim()}…` : text;
}

function normalizeKey(value) {
  return cleanString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseJson(value, fallback = {}) {
  if (value && typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(cleanString(value));
  } catch {
    return fallback;
  }
}

function boolValue(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = normalizeKey(value);
  return ["true", "1", "yes", "ano", "souhlas", "souhlasim", "public", "verified", "povoleno"].includes(normalized);
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstNonEmpty(...values) {
  return values.map(cleanString).find(Boolean) || "";
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, entryValue]) => {
      if (Array.isArray(entryValue)) {
        return entryValue.length > 0;
      }

      return entryValue !== undefined && entryValue !== null && entryValue !== "";
    })
  );
}

function nestedValue(payload, keys) {
  const queue = [payload];
  const normalizedKeys = new Set(keys.map(normalizeKey));
  const seen = new Set();

  while (queue.length) {
    const item = queue.shift();
    if (!item || typeof item !== "object" || seen.has(item)) {
      continue;
    }
    seen.add(item);

    for (const [key, value] of Object.entries(item)) {
      if (normalizedKeys.has(normalizeKey(key)) && value !== undefined && value !== null && cleanString(value) !== "") {
        return value;
      }

      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return undefined;
}

function pragueIsoDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addIsoDays(isoDate, amount) {
  const match = cleanString(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + amount, 12))
    .toISOString()
    .slice(0, 10);
}

function weekRange(todayIso = pragueIsoDate()) {
  const date = new Date(`${todayIso}T12:00:00Z`);
  const weekday = date.getUTCDay() || 7;
  const from = addIsoDays(todayIso, 1 - weekday);

  return {
    from,
    to: addIsoDays(from, 6)
  };
}

function dateKey(isoDate) {
  return cleanString(isoDate).slice(5, 10);
}

function firstName(value) {
  return cleanString(value).split(/\s+/).filter(Boolean)[0] || "";
}

function dynamicVariables(payload = {}) {
  return payload.dynamic_variables
    || payload.dynamicVariables
    || payload.conversation_initiation_client_data?.dynamic_variables
    || {};
}

function userVocative(user, payload = {}) {
  const dynamic = dynamicVariables(payload);

  return firstNonEmpty(
    dynamic.user_first_name_vocative,
    payload.user_first_name_vocative,
    payload.context?.user_first_name_vocative,
    firstName(user?.name)
  );
}

function configuredHumanTouch(env = {}) {
  return parseJson(env.SARLOTA_HUMAN_TOUCH_JSON, {});
}

function configuredNamedays(env = {}) {
  const config = configuredHumanTouch(env);
  const namedays = config.namedays || parseJson(env.SARLOTA_NAMEDAYS_JSON, {});

  return {
    ...DEFAULT_CZECH_NAMEDAYS,
    ...(namedays && typeof namedays === "object" ? namedays : {})
  };
}

function configuredCelebrations(env = {}) {
  const config = configuredHumanTouch(env);
  const celebrations = [
    ...(Array.isArray(config.birthdays) ? config.birthdays : []),
    ...(Array.isArray(config.celebrations) ? config.celebrations : [])
  ];

  return celebrations;
}

function normalizedWeather(weather) {
  if (!weather || typeof weather !== "object") {
    return null;
  }

  const verified = boolValue(weather.verified || weather.isVerified || weather.sourceVerified || weather.ok);
  if (!verified) {
    return null;
  }

  return {
    temperatureC: numberValue(weather.temperatureC ?? weather.temperature_c ?? weather.tempC, 0),
    apparentTemperatureC: numberValue(weather.apparentTemperatureC ?? weather.apparent_temperature_c, 0),
    summary: truncate(weather.summary || weather.description || weather.text, 120),
    condition: truncate(weather.condition, 80),
    location: weather.location || null,
    source: cleanString(weather.source || "verified_weather")
  };
}

async function verifiedWeather(payload = {}, env = {}) {
  const config = configuredHumanTouch(env);
  const weather = nestedValue(payload, ["verifiedWeather", "weather", "pocasi", "počasí"]) || config.weather || {};
  const providedWeather = normalizedWeather(weather);

  if (providedWeather) {
    return providedWeather;
  }

  return normalizedWeather(await currentSarlotaWeather(env));
}

function isHorko(weather) {
  return weather && weather.temperatureC >= HOT_WEATHER_CELSIUS;
}

function addSuggestion(suggestions, suggestion) {
  if (!suggestion?.text || suggestions.length >= MAX_SUGGESTIONS) {
    return;
  }

  suggestions.push({
    ...suggestion,
    text: truncate(suggestion.text, 180),
    verified: suggestion.verified !== false
  });
}

function namedaySuggestions(env, user, payload, todayIso, suggestions) {
  const namedays = configuredNamedays(env);
  const todayNames = namedays[dateKey(todayIso)];
  const names = Array.isArray(todayNames) ? todayNames : cleanString(todayNames).split(",").map(cleanString).filter(Boolean);
  const currentFirstName = firstName(user?.name);

  if (!names.length || !currentFirstName) {
    return;
  }

  const hasNameday = names.some((name) => normalizeKey(name) === normalizeKey(currentFirstName));
  if (!hasNameday) {
    return;
  }

  addSuggestion(suggestions, {
    id: "nameday-current-user",
    type: "nameday",
    text: `${userVocative(user, payload)}, ještě všechno nejlepší k svátku.`,
    source: "configured_namedays"
  });
}

function celebrationSuggestions(env, payload, todayIso, suggestions) {
  const celebrations = configuredCelebrations(env);

  for (const celebration of celebrations) {
    if (suggestions.length >= MAX_SUGGESTIONS) {
      return;
    }

    if (!celebration || typeof celebration !== "object") {
      continue;
    }

    const isPublic = boolValue(celebration.public || celebration.allowed || celebration.consent);
    const type = cleanString(celebration.type || "birthday");
    const date = cleanString(celebration.date || celebration.dateKey);

    if (!isPublic || dateKey(date.length === 5 ? `2000-${date}` : date) !== dateKey(todayIso)) {
      continue;
    }

    const vocative = firstNonEmpty(celebration.vocative, celebration.firstNameVocative, celebration.name);
    if (type === "birthday") {
      addSuggestion(suggestions, {
        id: `birthday-${normalizeKey(vocative) || suggestions.length}`,
        type: "birthday",
        text: `${vocative}, dneska máš narozeniny, tak ať se ti den povede.`,
        source: "configured_public_celebrations"
      });
    }
  }
}

function verifiedBirthdayFromPayload(payload = {}) {
  const value = nestedValue(payload, ["verifiedBirthday", "verifiedUserBirthday", "verified_user_birthday"]);

  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return boolValue(value.verified || value.isVerified || value.sourceVerified)
      ? cleanString(value.date || value.dateOfBirth || value.birthDate)
      : "";
  }

  return cleanString(value);
}

async function ownBirthdaySuggestions(env, user, payload, todayIso, suggestions) {
  let birthDate = verifiedBirthdayFromPayload(payload);

  if (!birthDate && cleanString(user?.id)) {
    try {
      const users = await getUsers(env);
      const employee = await getEmployeeCard(env, users, user, user.id);
      birthDate = cleanString(employee?.hrProfile?.dateOfBirth || employee?.dateOfBirth);
    } catch {
      birthDate = "";
    }
  }

  if (!birthDate || dateKey(birthDate) !== dateKey(todayIso)) {
    return "unavailable";
  }

  addSuggestion(suggestions, {
    id: "birthday-current-user",
    type: "birthday",
    text: `${userVocative(user, payload)}, dneska máš narozeniny, tak ať se ti den povede.`,
    source: "verified_own_profile"
  });
  return "verified";
}

async function weatherSuggestions(env, user, payload, suggestions) {
  const weather = await verifiedWeather(payload, env);
  if (!isHorko(weather)) {
    return weather ? "verified_not_hot" : "unavailable";
  }

  addSuggestion(suggestions, {
    id: "weather-hot",
    type: "weather",
    text: `${userVocative(user, payload)}, mimochodem, jak zvládáš ta horka?`,
    source: "verified_weather",
    weather: compactObject({
      temperatureC: weather.temperatureC,
      summary: weather.summary,
      condition: weather.condition
    })
  });
  return "verified_hot";
}

function overlapsRange(request, range) {
  const from = cleanString(request?.dateFrom);
  const to = cleanString(request?.dateTo || request?.dateFrom);

  return Boolean(from && to && from <= range.to && to >= range.from);
}

function endedWithinDays(request, todayIso, days) {
  const to = cleanString(request?.dateTo || request?.dateFrom);
  return Boolean(to && to < todayIso && to >= addIsoDays(todayIso, -days));
}

function isApprovedVacation(request) {
  return (
    normalizeKey(request?.type || request?.typeLabel) === "vacation" ||
    normalizeKey(request?.type || request?.typeLabel) === "dovolena"
  ) && (
    normalizeKey(request?.status || request?.statusLabel) === "approved" ||
    normalizeKey(request?.status || request?.statusLabel) === "schvaleno"
  );
}

async function vacationSuggestions(env, user, payload, todayIso, suggestions) {
  if (!hasPermission(user, "absence", "view")) {
    return;
  }

  try {
    const users = await getUsers(env);
    const requests = await listAbsenceRequests(env, users, user, { limit: 200 });
    const range = weekRange(todayIso);
    const approvedVacations = requests.filter(isApprovedVacation);
    const currentWeek = approvedVacations
      .filter((request) => overlapsRange(request, range))
      .filter((request) => cleanString(request.employeeId) !== cleanString(user?.id));
    const recentOwnVacation = approvedVacations.find((request) => (
      cleanString(request.employeeId) === cleanString(user?.id) && endedWithinDays(request, todayIso, RECENT_VACATION_DAYS)
    ));

    if (currentWeek[0]?.employeeName) {
      addSuggestion(suggestions, {
        id: `vacation-week-${cleanString(currentWeek[0].id)}`,
        type: "approved_vacation",
        text: `Jo a drobná firemní vsuvka: ${firstName(currentWeek[0].employeeName)} má tento týden dovolenou.`,
        source: "visible_approved_absence"
      });
    }

    if (recentOwnVacation) {
      addSuggestion(suggestions, {
        id: `vacation-return-${cleanString(recentOwnVacation.id)}`,
        type: "recent_own_vacation",
        text: `${userVocative(user, payload)}, už jsi zpátky z dovolené? Kde bylo dobře?`,
        source: "visible_approved_absence"
      });
    }
  } catch {
    // Missing D1 binding or schema is not a voice failure; it only disables this light context.
  }
}

export async function sarlotaHumanTouchContext(env, user, payload = {}, options = {}) {
  const todayIso = cleanString(options.todayIso) || pragueIsoDate();
  const suggestions = [];
  const weatherStatus = await weatherSuggestions(env, user, payload, suggestions);

  namedaySuggestions(env, user, payload, todayIso, suggestions);
  const ownBirthdayStatus = await ownBirthdaySuggestions(env, user, payload, todayIso, suggestions);
  celebrationSuggestions(env, payload, todayIso, suggestions);
  await vacationSuggestions(env, user, payload, todayIso, suggestions);

  return {
    enabled: suggestions.length > 0,
    mode: "safe_read_only",
    maxPerConversation: 1,
    suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
    safetyRules: [
      "Použij maximálně jednu krátkou poznámku za hovor.",
      "Nepoužívej odlehčení u reklamace, stížnosti, problému, nemoci, OČR, lékaře nebo stresu.",
      "Nikdy nezmiňuj nemoc, OČR, lékaře, důvod absence, věk ani citlivé osobní údaje.",
      "Když se poznámka nehodí, mlč a pokračuj v úkolu.",
      "Nepoužívej texty známých písní; případný popěvek musí být vlastní a krátký."
    ],
    blockedTopics: ["sick", "doctor", "care", "medical", "absence_reason", "age", "private_data"],
    sourceStatus: compactObject({
      weather: weatherStatus,
      namedays: Object.keys(configuredNamedays(env)).length ? "configured" : "unconfigured",
      celebrations: configuredCelebrations(env).length ? "configured_public_only" : "unconfigured",
      ownBirthday: ownBirthdayStatus,
      vacations: hasPermission(user, "absence", "view") ? "visible_approved_only" : "forbidden"
    })
  };
}
