function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusMeta(status) {
  const normalized = String(status || "unverified").trim().toLowerCase();
  const labels = {
    configured: "nakonfigurováno",
    ok: "OK",
    error: "chyba",
    unverified: "neověřeno",
    waiting: "neověřeno"
  };

  return {
    status: normalized,
    label: labels[normalized] || "neověřeno"
  };
}

function statusBadge(status) {
  const meta = statusMeta(status);
  const tone = meta.status === "configured" ? "ok" : meta.status;

  return `<span class="sarlota-status__badge sarlota-status__badge--${escapeHtml(tone)}">${escapeHtml(meta.label)}</span>`;
}

function statusRow(label, status, detail = "") {
  return `
    <div class="sarlota-status__row">
      <dt>${escapeHtml(label)}</dt>
      <dd>
        ${statusBadge(status)}
        <span>${escapeHtml(detail || "neověřeno")}</span>
      </dd>
    </div>
  `;
}

function toolDetail(tools = null) {
  if (!tools) {
    return "neověřeno";
  }

  const localStatus = tools.localSchemaStatus === "ok" ? "lokální schémata OK" : "lokální schémata mají rozdíl";
  const count = Array.isArray(tools.configuredClientToolNames) ? tools.configuredClientToolNames.length : 0;

  return `${localStatus}, ElevenLabs dashboard neověřen, ${count} toolů v kódu`;
}

export function SarlotaStatusPanel({
  status = null,
  loading = false,
  error = ""
} = {}) {
  const data = status || {};
  const generatedAt = data.generatedAt ? new Date(data.generatedAt).toLocaleString("cs-CZ") : "neověřeno";
  const elevenLabsDetail = data.elevenLabs
    ? (data.elevenLabs.configured ? "server má potřebnou konfiguraci" : "chybí serverová konfigurace")
    : "neověřeno";
  const vocativeDetail = data.vocative
    ? (data.vocative.radimFixtureOk ? "test vocativu OK" : "čeká na ověření")
    : "neověřeno";
  const rows = [
    statusRow(
      "ElevenLabs",
      data.elevenLabs?.status || "unverified",
      elevenLabsDetail
    ),
    statusRow("Agent", data.agent?.status || "unverified", data.agent?.name || "Chytré odpadky – Šarlota"),
    statusRow("První zpráva", data.firstMessage?.status || "unverified", data.firstMessage?.variable || "intro_announcement"),
    statusRow("Personalizace", data.personalization?.status || "unverified", data.personalization?.source || "přihlášený uživatel"),
    statusRow("Vocativ uživatele", data.vocative?.status || "unverified", vocativeDetail),
    statusRow("OpenAI model v EL", data.openAiModelInElevenLabs?.status || "unverified", `${data.openAiModelInElevenLabs?.expectedModel || "GPT-5.1"} / neověřeno`),
    statusRow("Tools", data.tools?.status || "unverified", toolDetail(data.tools)),
    statusRow(
      "Signed-url endpoint",
      data.signedUrlEndpoint?.status || "unverified",
      data.signedUrlEndpoint?.exists ? "/api/ai/elevenlabs/signed-url?assistant=sarlota" : "neověřeno"
    )
  ].join("");

  return `
    <section class="sarlota-status users-panel" aria-labelledby="sarlota-status-title">
      <div class="users-panel__head sarlota-status__head">
        <div>
          <h2 id="sarlota-status-title">Šarlota</h2>
          <p>Read-only stav pro ElevenLabs agenta a signed-url napojení.</p>
        </div>
        <button class="secondary-link" type="button" data-sarlota-status-refresh ${loading ? "disabled" : ""}>
          ${loading ? "Načítám..." : "Obnovit"}
        </button>
      </div>
      ${error ? `<p class="module-feedback__error" role="alert">${escapeHtml(error)}</p>` : ""}
      <dl class="sarlota-status__grid">
        ${rows}
      </dl>
      <p class="sarlota-status__meta">
        Aktualizováno: ${escapeHtml(generatedAt)}. Panel nemění agenta, prompt, první zprávu ani tools.
      </p>
    </section>
  `;
}
