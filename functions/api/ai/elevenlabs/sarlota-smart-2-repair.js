import { json, readJson, requireUserPermission } from "../../../_lib/auth.js";
import {
  assistantPublicMetadata,
  maskElevenLabsAgentId,
  resolveElevenLabsAssistantConfig
} from "../../../../src/elevenLabsAssistants.js";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1/convai";
const FIRST_MESSAGE_TEMPLATE = "{{intro_announcement}}";
const LLM_MODEL_EXPECTED_IN_ELEVENLABS = "Qwen3.5-397B-A17B";

function cleanString(value) {
  return String(value ?? "").trim();
}

function safeErrorMessage(error) {
  return cleanString(error?.message || error?.name || "unknown_error");
}

function getPathValue(source, path) {
  return path.reduce((value, key) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return value[key];
  }, source);
}

function firstMessageFromAgent(agentConfig) {
  return cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "first_message"]))
    || cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "firstMessage"]))
    || cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "prompt", "first_message"]))
    || cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "prompt", "firstMessage"]));
}

function normalizeModel(value) {
  return cleanString(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function modelFromAgent(agentConfig) {
  return cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "prompt", "llm"]))
    || cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "prompt", "model"]))
    || cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "prompt", "model_id"]))
    || cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "llm"]))
    || cleanString(getPathValue(agentConfig, ["conversation_config", "agent", "model"]));
}

function promptModelPatch(agentConfig) {
  const patch = {
    llm: LLM_MODEL_EXPECTED_IN_ELEVENLABS,
    model: LLM_MODEL_EXPECTED_IN_ELEVENLABS
  };

  if (getPathValue(agentConfig, ["conversation_config", "agent", "prompt", "model_id"]) !== undefined) {
    patch.model_id = LLM_MODEL_EXPECTED_IN_ELEVENLABS;
  }

  return patch;
}

async function elevenLabsRequest({ apiKey, path, method = "GET", body = null }) {
  const response = await fetch(`${ELEVENLABS_API_BASE}${path}`, {
    method,
    headers: {
      "xi-api-key": apiKey,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : null
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error("elevenlabs_request_failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function upstreamErrorSummary(error) {
  const detail = error?.payload?.detail;
  if (Array.isArray(detail)) {
    return detail
      .slice(0, 3)
      .map((item) => cleanString(item?.msg || item?.message || item?.type || "validation_error"))
      .filter(Boolean)
      .join("; ");
  }

  return cleanString(error?.payload?.message || error?.payload?.error || error?.message || "upstream_error");
}

function buildPatch(agentConfig) {
  return {
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGE_TEMPLATE,
        prompt: promptModelPatch(agentConfig)
      }
    }
  };
}

async function repairSmart2(env, user) {
  const apiKey = cleanString(env?.ELEVENLABS_API_KEY);
  const assistantConfig = resolveElevenLabsAssistantConfig("sarlota-smart-2", env);

  if (!apiKey || !assistantConfig?.agentId) {
    return json({
      error: "Chybí ELEVENLABS_API_KEY nebo ELEVENLABS_AGENT_ID_SARLOTA_SMART_2.",
      code: "SMART_2_CONFIGURATION_MISSING",
      apiStatus: "waiting"
    }, 409);
  }

  const agentConfig = await elevenLabsRequest({
    apiKey,
    path: `/agents/${encodeURIComponent(assistantConfig.agentId)}`
  });
  const agentName = cleanString(agentConfig?.name);
  const nameMatches = (assistantConfig.expectedAgentNames || []).includes(agentName);

  if (!nameMatches) {
    return json({
      error: "Smart 2 agent nemá očekávaný název, opravu nespouštím.",
      code: "SMART_2_AGENT_NAME_MISMATCH",
      agentName,
      expectedNames: assistantConfig.expectedAgentNames || [],
      agentIdMasked: maskElevenLabsAgentId(assistantConfig.agentId),
      apiStatus: "waiting"
    }, 409);
  }

  const beforeFirstMessage = firstMessageFromAgent(agentConfig);
  const beforeModel = modelFromAgent(agentConfig);
  const beforeFirstMessageMatches = beforeFirstMessage === FIRST_MESSAGE_TEMPLATE;
  const beforeModelMatches = normalizeModel(beforeModel) === normalizeModel(LLM_MODEL_EXPECTED_IN_ELEVENLABS);

  if (!beforeFirstMessageMatches || !beforeModelMatches) {
    await elevenLabsRequest({
      apiKey,
      path: `/agents/${encodeURIComponent(assistantConfig.agentId)}`,
      method: "PATCH",
      body: buildPatch(agentConfig)
    });
  }

  const verifiedAgentConfig = await elevenLabsRequest({
    apiKey,
    path: `/agents/${encodeURIComponent(assistantConfig.agentId)}`
  });
  const afterFirstMessage = firstMessageFromAgent(verifiedAgentConfig);
  const afterModel = modelFromAgent(verifiedAgentConfig);
  const firstMessageMatches = afterFirstMessage === FIRST_MESSAGE_TEMPLATE;
  const modelMatches = normalizeModel(afterModel) === normalizeModel(LLM_MODEL_EXPECTED_IN_ELEVENLABS);

  console.info("elevenlabs.sarlota_smart_2_repaired", {
    agentIdMasked: maskElevenLabsAgentId(assistantConfig.agentId),
    userId: cleanString(user?.id),
    firstMessageChanged: !beforeFirstMessageMatches,
    modelChanged: !beforeModelMatches,
    timestamp: new Date().toISOString()
  });

  return json({
    status: firstMessageMatches && modelMatches ? "ok" : "partial",
    generatedAt: new Date().toISOString(),
    assistant: assistantPublicMetadata(assistantConfig),
    agent: {
      name: agentName,
      nameMatches,
      agentIdMasked: maskElevenLabsAgentId(assistantConfig.agentId)
    },
    repair: {
      applied: !beforeFirstMessageMatches || !beforeModelMatches,
      firstMessageChanged: !beforeFirstMessageMatches,
      modelChanged: !beforeModelMatches,
      firstMessageMatches,
      modelMatches
    },
    apiStatus: firstMessageMatches && modelMatches ? "ready" : "waiting"
  }, firstMessageMatches && modelMatches ? 200 : 207);
}

export async function onRequestPost({ request, env }) {
  try {
    const { user, response } = await requireUserPermission(env, request, "settings", "manage");

    if (response) {
      return response;
    }

    const payload = await readJson(request);
    if (payload?.apply !== true) {
      return json({
        error: "Oprava Smart 2 vyžaduje potvrzení apply: true.",
        code: "APPLY_REQUIRED",
        apiStatus: "waiting"
      }, 409);
    }

    return await repairSmart2(env, user);
  } catch (error) {
    console.error("elevenlabs.sarlota_smart_2_repair_failed", {
      message: safeErrorMessage(error),
      status: error?.status || 500
    });

    return json({
      error: `Oprava Smart 2 základní konfigurace se nepodařila. ${error.status ? `HTTP ${error.status}. ` : ""}${upstreamErrorSummary(error)}`,
      code: "ELEVENLABS_SMART_2_REPAIR_FAILED",
      upstreamStatus: error?.status || null,
      apiStatus: "waiting"
    }, error?.status && error.status >= 400 && error.status < 600 ? error.status : 500);
  }
}
