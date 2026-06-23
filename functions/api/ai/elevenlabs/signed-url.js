import { json, requireUserPermission } from "../../../_lib/auth.js";
import { recordAiAction } from "../../../_lib/ai-action-log-store.js";

const ASSISTANTS = {
  sarlota: {
    id: "sarlota",
    name: "Šarlota",
    agentEnvKeys: ["ELEVENLABS_AGENT_ID_SARLOTA", "VITE_ELEVENLABS_AGENT_ID_SARLOTA"]
  },
  marek: {
    id: "marek",
    name: "Marek",
    agentEnvKeys: ["ELEVENLABS_AGENT_ID_MAREK", "VITE_ELEVENLABS_AGENT_ID_MAREK"]
  }
};

function cleanString(value) {
  return String(value ?? "").trim();
}

function assistantFor(request) {
  const url = new URL(request.url);
  const assistantId = cleanString(url.searchParams.get("assistant") || "sarlota").toLowerCase();
  return ASSISTANTS[assistantId] || ASSISTANTS.sarlota;
}

function agentIdFor(env, assistant) {
  return assistant.agentEnvKeys
    .map((key) => cleanString(env?.[key]))
    .find(Boolean) || "";
}

export async function onRequestGet({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "dashboard", "view");

  if (response) {
    return response;
  }

  const assistant = assistantFor(request);
  const apiKey = cleanString(env.ELEVENLABS_API_KEY);
  const agentId = agentIdFor(env, assistant);

  if (!apiKey || !agentId) {
    return json({
      error: "ElevenLabs není nastavený. Doplňte ELEVENLABS_API_KEY a Agent ID pro vybraného asistenta.",
      assistantId: assistant.id,
      assistantName: assistant.name,
      configured: false,
      apiStatus: "waiting"
    }, 503);
  }

  const signedUrl = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
  signedUrl.searchParams.set("agent_id", agentId);
  signedUrl.searchParams.set("include_conversation_id", "true");

  try {
    const responseFromElevenLabs = await fetch(signedUrl.toString(), {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        Accept: "application/json"
      }
    });
    const payload = await responseFromElevenLabs.json().catch(() => ({}));

    if (!responseFromElevenLabs.ok || !payload.signed_url) {
      console.error("elevenlabs.signed_url_failed", {
        status: responseFromElevenLabs.status,
        message: payload.detail || payload.error || "missing_signed_url"
      });
      return json({
        error: "ElevenLabs session se nepodařilo připravit.",
        assistantId: assistant.id,
        assistantName: assistant.name,
        configured: true,
        apiStatus: "waiting"
      }, 502);
    }

    await recordAiAction(env, user, {
      assistantId: assistant.id,
      assistantName: assistant.name,
      actionType: "session",
      toolName: "elevenlabs_signed_url",
      input: { assistantId: assistant.id },
      result: { configured: true },
      status: "ok"
    });

    return json({
      signedUrl: payload.signed_url,
      conversationId: payload.conversation_id || "",
      assistantId: assistant.id,
      assistantName: assistant.name,
      configured: true,
      apiStatus: "ready"
    });
  } catch (error) {
    console.error("elevenlabs.signed_url_error", { message: error.message });
    return json({
      error: "ElevenLabs teď neodpověděl.",
      assistantId: assistant.id,
      assistantName: assistant.name,
      configured: true,
      apiStatus: "waiting"
    }, 502);
  }
}

