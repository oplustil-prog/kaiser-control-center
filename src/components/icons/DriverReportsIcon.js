import { createSvgIcon } from "./createSvgIcon.js";

export function DriverReportsIcon() {
  return createSvgIcon(`
    <rect x="18" y="8" width="28" height="48" rx="5" stroke="#3F4A45" stroke-width="3.5"/>
    <path d="M27 15H37" stroke="#3F4A45" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="32" cy="49" r="2" fill="#3F4A45"/>
    <rect x="25" y="25" width="16" height="12" rx="2" stroke="#75BD25" stroke-width="3.2"/>
    <path d="M29 25L31 21H35L37 25" stroke="#75BD25" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="33" cy="31" r="2.4" stroke="#75BD25" stroke-width="2.5"/>
  `);
}
