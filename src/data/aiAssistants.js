export const AI_ASSISTANT_AVATAR_PLACEHOLDER = "Čeká na avatar od Radima/Martina";

export const AI_ASSISTANTS = [
  {
    id: "sarlota",
    name: "Šarlota",
    role: "Smart pomocník",
    intro: "Jsem Šarlota. Pomůžu vám ve Smart odpadech.",
    avatarPath: "/avatars/sarlota.png",
    agentIdEnv: "VITE_ELEVENLABS_AGENT_ID_SARLOTA"
  },
  {
    id: "marek",
    name: "Marek",
    role: "Zástupce Smart pomocníka",
    intro: "Jsem Marek. Zastupuji Šarlotu, když je potřeba.",
    avatarPath: "/avatars/marek.png",
    agentIdEnv: "VITE_ELEVENLABS_AGENT_ID_MAREK"
  }
];

export const DEFAULT_AI_ASSISTANT_ID = "sarlota";

export function assistantById(assistantId) {
  return AI_ASSISTANTS.find((assistant) => assistant.id === assistantId) || AI_ASSISTANTS[0];
}

