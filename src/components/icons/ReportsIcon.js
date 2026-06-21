import { createSvgIcon } from "./createSvgIcon.js";

export function ReportsIcon() {
  return createSvgIcon(`
    <path d="M16 8H38L50 20V56H16V8Z" stroke="#3F4A45" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M38 8V20H50" stroke="#3F4A45" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M24 46V38M32 46V29M40 46V34" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M23 48H43" stroke="#75BD25" stroke-width="3" stroke-linecap="round"/>
    <path d="M24 22H32" stroke="#3F4A45" stroke-width="3" stroke-linecap="round"/>
  `);
}
