import { createSvgIcon } from "./createSvgIcon.js";

export function DashboardIcon() {
  return createSvgIcon(`
    <rect x="10" y="12" width="42" height="40" rx="4" stroke="#3F4A45" stroke-width="3.5"/>
    <path d="M18 42L28 32L36 38L46 24" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M42 24H46V28" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 22H25" stroke="#3F4A45" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M18 28H22" stroke="#3F4A45" stroke-width="3.5" stroke-linecap="round"/>
  `);
}
