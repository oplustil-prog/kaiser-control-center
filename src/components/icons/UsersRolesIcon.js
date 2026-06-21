import { createSvgIcon } from "./createSvgIcon.js";

export function UsersRolesIcon() {
  return createSvgIcon(`
    <circle cx="24" cy="24" r="8" stroke="#3F4A45" stroke-width="3.5"/>
    <path d="M10 51C12 41 18 36 24 36C30 36 36 41 38 51" stroke="#3F4A45" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="44" cy="26" r="6" stroke="#75BD25" stroke-width="3.5"/>
    <path d="M39 42C42 39 48 39 53 47" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round"/>
  `);
}
