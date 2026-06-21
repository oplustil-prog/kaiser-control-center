import { createSvgIcon } from "./createSvgIcon.js";

export function SettingsIcon() {
  return createSvgIcon(`
    <path d="M32 9L36 16L44 14L49 22L44 28C45 31 45 34 44 36L49 42L44 50L36 48L32 55L28 48L20 50L15 42L20 36C19 34 19 31 20 28L15 22L20 14L28 16L32 9Z" stroke="#3F4A45" stroke-width="3.5" stroke-linejoin="round"/>
    <circle cx="32" cy="32" r="8" stroke="#75BD25" stroke-width="3.5"/>
  `);
}
