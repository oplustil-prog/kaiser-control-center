import { createSvgIcon } from "./createSvgIcon.js";

export function VistosIcon() {
  return createSvgIcon(`
    <ellipse cx="31" cy="15" rx="19" ry="7" stroke="#3F4A45" stroke-width="3.5"/>
    <path d="M12 15V32C12 36 20 39 31 39C42 39 50 36 50 32V15" stroke="#3F4A45" stroke-width="3.5"/>
    <path d="M12 32V48C12 52 20 55 31 55C42 55 50 52 50 48V32" stroke="#3F4A45" stroke-width="3.5"/>
    <path d="M43 44H56" stroke="#75BD25" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M50 38V50" stroke="#75BD25" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M44 50L50 56L56 50" stroke="#75BD25" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  `);
}
