import { createSvgIcon } from "./createSvgIcon.js";

export function CollectionRoutesIcon() {
  return createSvgIcon(`
    <path d="M10 15L24 9L40 15L54 9V49L40 55L24 49L10 55V15Z" stroke="#3F4A45" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M24 9V49M40 15V55" stroke="#3F4A45" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M18 39H30" stroke="#75BD25" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M20 39L22 48H28L30 39" stroke="#75BD25" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M22 35H28" stroke="#75BD25" stroke-width="3.2" stroke-linecap="round"/>
  `);
}
