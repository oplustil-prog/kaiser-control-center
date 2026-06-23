import { VoiceAssistantButton } from "./VoiceAssistantButton.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function AiVoicePanel({ listening = false, status = "Připraven", notice = "" } = {}) {
  return `
    <section class="ai-voice-panel" aria-label="Hlasový režim Smart pomocníka">
      <span class="ai-voice-panel__badge">SMART ODPADY</span>
      <h3>Smart pomocník</h3>
      <p class="ai-voice-panel__lead">
        Stačí promluvit. Vyzkoušejte: chci dovolenou, nahlásit nemoc, otevřít pneumatiky.
      </p>
      ${VoiceAssistantButton({ listening, status })}
      ${notice ? `<p class="ai-assistant-chat__voice-notice">${escapeHtml(notice)}</p>` : ""}
      <p class="ai-assistant-chat__privacy">
        Hlas se v této testovací verzi neukládá. Slouží pouze pro aktuální pokyn.
      </p>
    </section>
  `;
}
