import { assistantById, DEFAULT_AI_ASSISTANT_ID } from "./data/aiAssistants.js";

function cleanApiBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function signedUrlEndpoint(apiBaseUrl, assistantId) {
  const base = cleanApiBaseUrl(apiBaseUrl);
  const query = new URLSearchParams({ assistant: assistantId || DEFAULT_AI_ASSISTANT_ID });
  return `${base}/api/ai/elevenlabs/signed-url?${query.toString()}`;
}

export function useElevenLabsAssistant({
  apiBaseUrl = "",
  clientTools = {},
  fetchJson = null
} = {}) {
  async function defaultFetchJson(path) {
    const response = await fetch(path, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(payload.error || "ElevenLabs session se nepodařilo připravit.");
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  async function prepareSignedUrl(assistantId = DEFAULT_AI_ASSISTANT_ID) {
    const assistant = assistantById(assistantId);
    const loadJson = fetchJson || defaultFetchJson;
    return loadJson(signedUrlEndpoint(apiBaseUrl, assistant.id));
  }

  return {
    clientTools,
    prepareSignedUrl
  };
}

