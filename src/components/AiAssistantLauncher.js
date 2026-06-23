export function AiAssistantLauncher({ visible = false } = {}) {
  if (!visible) {
    return "";
  }

  return `
    <button class="ai-assistant-launcher" type="button" data-ai-launcher aria-label="Otevřít Smart pomocníka">
      <span class="ai-assistant-launcher__icon" aria-hidden="true"></span>
      <span>Pomocník</span>
    </button>
  `;
}
