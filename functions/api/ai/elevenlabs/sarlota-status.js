import { json, requireUserPermission } from "../../../_lib/auth.js";
import { sarlotaIntroAnnouncementForAi } from "../../../_lib/ai-session-announcements.js";
import { normalizeAiSearch, userDynamicVariablesForAi } from "../../../_lib/ai-people-summary.js";
import { ELEVENLABS_CLIENT_TOOL_SCHEMAS } from "../../../../src/elevenLabsClientTools.js";

const SARLOTA_AGENT_NAME = "Chytré odpadky – Šarlota";
const OPENAI_MODEL_EXPECTED_IN_ELEVENLABS = "GPT-5.1";
const SARLOTA_ASSISTANT = {
  id: "sarlota",
  name: "Šarlota",
  agentEnvKeys: ["ELEVENLABS_AGENT_ID_SARLOTA", "VITE_ELEVENLABS_AGENT_ID_SARLOTA"]
};
const REQUIRED_DYNAMIC_VARIABLES = [
  "user_name",
  "user_first_name",
  "user_first_name_vocative",
  "user_role",
  "available_modules",
  "user_permissions",
  "user_department",
  "user_position",
  "time_of_day_greeting",
  "user_greeting",
  "intro_announcement",
  "intro_announcement_enabled"
];
const EXPECTED_CLIENT_TOOL_NAMES = [
  "navigate_to",
  "open_module",
  "show_confirmation",
  "show_toast",
  "highlight_element",
  "search_employee",
  "get_employee_detail",
  "open_employee_card",
  "get_employee_manager",
  "get_employee_absence_summary",
  "search_user",
  "get_user_access_summary"
];

function cleanString(value) {
  return String(value ?? "").trim();
}

function agentIdFor(env) {
  return SARLOTA_ASSISTANT.agentEnvKeys
    .map((key) => cleanString(env?.[key]))
    .find(Boolean) || "";
}

function missingRequiredVariables(dynamicVariables) {
  return REQUIRED_DYNAMIC_VARIABLES.filter((key) => !cleanString(dynamicVariables?.[key]));
}

function compareToolNames(actualNames) {
  const actualSet = new Set(actualNames);
  const expectedSet = new Set(EXPECTED_CLIENT_TOOL_NAMES);
  const missingTools = EXPECTED_CLIENT_TOOL_NAMES.filter((name) => !actualSet.has(name));
  const extraTools = actualNames.filter((name) => !expectedSet.has(name));

  return {
    missingTools,
    extraTools,
    matchesDocumentation: missingTools.length === 0 && extraTools.length === 0
  };
}

function radimVocativeFixtureOk() {
  const variables = userDynamicVariablesForAi({
    id: "fixture-radim",
    name: "Radim",
    role: "readonly",
    status: "active"
  });

  return cleanString(variables.user_first_name_vocative) === "Radime";
}

export async function sarlotaStatusPayload(env, user) {
  const apiKeyPresent = Boolean(cleanString(env?.ELEVENLABS_API_KEY));
  const agentIdPresent = Boolean(agentIdFor(env));
  const configured = apiKeyPresent && agentIdPresent;
  const introAnnouncement = await sarlotaIntroAnnouncementForAi(env, user, SARLOTA_ASSISTANT);
  const dynamicVariables = {
    ...userDynamicVariablesForAi(user),
    ...introAnnouncement.variables
  };
  const missingVariables = missingRequiredVariables(dynamicVariables);
  const clientToolNames = ELEVENLABS_CLIENT_TOOL_SCHEMAS
    .map((tool) => cleanString(tool.name))
    .filter(Boolean);
  const toolComparison = compareToolNames(clientToolNames);
  const userFirstName = cleanString(user?.name).split(/\s+/).filter(Boolean)[0] || "";
  const currentUserIsRadim = normalizeAiSearch(userFirstName) === "radim";
  const currentVocativePresent = Boolean(cleanString(dynamicVariables.user_first_name_vocative));
  const radimFixtureOk = radimVocativeFixtureOk();

  return {
    generatedAt: new Date().toISOString(),
    panel: {
      title: "Šarlota",
      readOnly: true
    },
    agent: {
      assistantId: "sarlota",
      name: SARLOTA_AGENT_NAME,
      status: "ok"
    },
    elevenLabs: {
      status: configured ? "configured" : "error",
      configured,
      apiKeyPresent,
      agentIdPresent,
      upstreamVerified: false
    },
    firstMessage: {
      status: cleanString(dynamicVariables.intro_announcement) ? "ok" : "error",
      variable: "intro_announcement",
      template: "{{intro_announcement}}",
      source: "dynamic_variables"
    },
    personalization: {
      status: missingVariables.length ? "error" : "ok",
      source: "authenticated_user_profile",
      dynamicVariablesRequired: REQUIRED_DYNAMIC_VARIABLES,
      dynamicVariablesPresent: REQUIRED_DYNAMIC_VARIABLES.filter((key) => !missingVariables.includes(key)),
      missingVariables,
      valuesReturnedToPanel: false
    },
    vocative: {
      status: currentVocativePresent && radimFixtureOk ? "ok" : "error",
      currentUserVocativePresent: currentVocativePresent,
      currentUserIsRadim,
      radimFixtureOk
    },
    openAiModelInElevenLabs: {
      status: "unverified",
      expectedModel: OPENAI_MODEL_EXPECTED_IN_ELEVENLABS,
      verifiedInElevenLabs: false
    },
    tools: {
      status: toolComparison.matchesDocumentation ? "unverified" : "error",
      localSchemaStatus: toolComparison.matchesDocumentation ? "ok" : "error",
      verifiedInElevenLabs: false,
      verificationMethod: "local_client_schema_vs_documentation",
      expectedToolNames: EXPECTED_CLIENT_TOOL_NAMES,
      configuredClientToolNames: clientToolNames,
      missingTools: toolComparison.missingTools,
      extraTools: toolComparison.extraTools
    },
    signedUrlEndpoint: {
      status: configured ? "ok" : "error",
      exists: true,
      method: "GET",
      path: "/api/ai/elevenlabs/signed-url?assistant=sarlota",
      configured,
      returnsConfiguredBoolean: true,
      dynamicVariablesChecked: true,
      signedUrlOmittedFromStatus: true
    }
  };
}

export async function onRequestGet({ request, env }) {
  const { user, response } = await requireUserPermission(env, request, "settings", "manage");

  if (response) {
    return response;
  }

  return json(await sarlotaStatusPayload(env, user));
}
