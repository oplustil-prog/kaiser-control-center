const DEFAULT_LOCATION = {
  name: "Brno",
  latitude: 49.1951,
  longitude: 16.6068
};
const WEATHER_CACHE_MS = 15 * 60 * 1000;
const WEATHER_TIMEOUT_MS = 900;
const weatherCache = new Map();

function cleanString(value) {
  return String(value ?? "").trim();
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolValue(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = cleanString(value).toLowerCase();
  if (["true", "1", "yes", "ano", "enabled", "zapnuto"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "ne", "disabled", "vypnuto"].includes(normalized)) {
    return false;
  }

  return fallback;
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

function configuredWeather(env = {}) {
  const config = parseJson(env.SARLOTA_HUMAN_TOUCH_JSON, {});
  const weatherConfig = parseJson(env.SARLOTA_WEATHER_JSON, {});
  return {
    ...(config.weatherProvider && typeof config.weatherProvider === "object" ? config.weatherProvider : {}),
    ...(weatherConfig && typeof weatherConfig === "object" ? weatherConfig : {})
  };
}

function weatherLocation(env = {}) {
  const config = configuredWeather(env);

  return {
    name: cleanString(config.locationName || config.name || env.SARLOTA_WEATHER_LOCATION_NAME) || DEFAULT_LOCATION.name,
    latitude: numberValue(config.latitude || env.SARLOTA_WEATHER_LATITUDE, DEFAULT_LOCATION.latitude),
    longitude: numberValue(config.longitude || env.SARLOTA_WEATHER_LONGITUDE, DEFAULT_LOCATION.longitude)
  };
}

function weatherCodeLabel(code) {
  const numeric = numberValue(code, -1);
  const labels = {
    0: "jasno",
    1: "skoro jasno",
    2: "polojasno",
    3: "zataženo",
    45: "mlha",
    48: "námraza v mlze",
    51: "slabé mrholení",
    53: "mrholení",
    55: "silné mrholení",
    61: "slabý déšť",
    63: "déšť",
    65: "silný déšť",
    71: "slabé sněžení",
    73: "sněžení",
    75: "silné sněžení",
    80: "slabé přeháňky",
    81: "přeháňky",
    82: "silné přeháňky",
    95: "bouřka",
    96: "bouřka s kroupami",
    99: "silná bouřka s kroupami"
  };

  return labels[numeric] || "";
}

function cacheKey(location) {
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await fetch(url, controller ? { signal: controller.signal } : {});
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function currentSarlotaWeather(env = {}) {
  const config = configuredWeather(env);
  if (boolValue(config.disabled ?? env.SARLOTA_WEATHER_DISABLED, false)) {
    return { ok: false, status: "disabled", location: weatherLocation(env) };
  }

  const location = weatherLocation(env);
  const key = cacheKey(location);
  const cached = weatherCache.get(key);

  if (cached && Date.now() - cached.cachedAt < WEATHER_CACHE_MS) {
    return cached.value;
  }

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,apparent_temperature,weather_code",
    timezone: "Europe/Prague"
  });
  const timeoutMs = numberValue(config.timeoutMs || env.SARLOTA_WEATHER_TIMEOUT_MS, WEATHER_TIMEOUT_MS);

  try {
    const response = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, timeoutMs);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, status: "error", location };
    }

    const current = payload.current || {};
    const temperatureC = numberValue(current.temperature_2m, NaN);
    if (!Number.isFinite(temperatureC)) {
      return { ok: false, status: "missing_temperature", location };
    }

    const condition = weatherCodeLabel(current.weather_code);
    const weather = {
      ok: true,
      status: "verified",
      verified: true,
      source: "open_meteo",
      location,
      temperatureC,
      apparentTemperatureC: numberValue(current.apparent_temperature, temperatureC),
      condition,
      summary: condition
        ? `${location.name}: ${Math.round(temperatureC)} °C, ${condition}`
        : `${location.name}: ${Math.round(temperatureC)} °C`
    };

    weatherCache.set(key, {
      cachedAt: Date.now(),
      value: weather
    });
    return weather;
  } catch (error) {
    console.error("sarlota_weather.fetch_failed", { message: error.message });
    return { ok: false, status: "unavailable", location };
  }
}
