import { versionInfo, versionStatusBadge, versionStatusText } from "../data/versionInfo.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function infoItem(label, value) {
  return `
    <div class="version-backup-info__item">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

export function VersionBackupInfo() {
  const statusClass = versionInfo.status === "stable" ? "stable" : "development";

  return `
    <section class="version-backup-info" aria-labelledby="version-backup-title">
      <div class="version-backup-info__header">
        <div>
          <p class="version-backup-info__eyebrow">${escapeHtml(versionInfo.appName)}</p>
          <h2 id="version-backup-title">Verze a záloha</h2>
        </div>
        <span class="version-backup-info__badge version-backup-info__badge--${statusClass}">
          ${escapeHtml(versionStatusBadge(versionInfo.status))}
        </span>
      </div>
      <dl class="version-backup-info__grid">
        ${infoItem("Aktuální verze", versionInfo.version)}
        ${infoItem("Stav", versionStatusText(versionInfo.status))}
        ${infoItem("Poslední záloha", versionInfo.backupName)}
        ${infoItem("Datum zálohy", versionInfo.backupDate)}
        ${infoItem("Pneumatiky", versionInfo.tyreModuleStatus)}
        ${infoItem("Branch", versionInfo.branch)}
        ${infoItem("Commit", versionInfo.commit)}
      </dl>
      <p class="version-backup-info__note">Poznámka: Modul Pneumatiky je hotový a neměnit.</p>
    </section>
  `;
}
