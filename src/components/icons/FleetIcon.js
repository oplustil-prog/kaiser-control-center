import { createSvgIcon } from "./createSvgIcon.js";

export function FleetIcon() {
  return createSvgIcon(`
    <path d="M9 25H37V43H9V25Z" stroke="#3F4A45" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M37 31H48L55 38V43H37V31Z" stroke="#3F4A45" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M14 20H29" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="20" cy="45" r="5" stroke="#3F4A45" stroke-width="3.5"/>
    <circle cx="47" cy="45" r="5" stroke="#3F4A45" stroke-width="3.5"/>
    <path d="M43 35H49" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round"/>
  `);
}
