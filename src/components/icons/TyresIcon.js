import { createSvgIcon } from "./createSvgIcon.js";

export function TyresIcon() {
  return createSvgIcon(`
    <circle cx="32" cy="32" r="22" stroke="#3F4A45" stroke-width="3.5"/>
    <circle cx="32" cy="32" r="11" stroke="#75BD25" stroke-width="3.5"/>
    <path d="M32 10V18M32 46V54M10 32H18M46 32H54" stroke="#3F4A45" stroke-width="3" stroke-linecap="round"/>
    <path d="M17 17L23 23M41 41L47 47M47 17L41 23M23 41L17 47" stroke="#3F4A45" stroke-width="3" stroke-linecap="round"/>
    <path d="M32 25V39M25 32H39" stroke="#75BD25" stroke-width="3" stroke-linecap="round"/>
  `);
}
