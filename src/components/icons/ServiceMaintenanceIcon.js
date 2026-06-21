import { createSvgIcon } from "./createSvgIcon.js";

export function ServiceMaintenanceIcon() {
  return createSvgIcon(`
    <path d="M43 10C47 12 50 16 50 21C50 25 48 28 46 30L55 39L48 46L39 37C36 39 32 39 29 38C25 37 22 34 20 31L30 21L24 15L14 25C13 21 14 16 18 12C22 8 28 8 32 11" stroke="#3F4A45" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M25 39L13 51" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M11 53L16 48" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round"/>
  `);
}
