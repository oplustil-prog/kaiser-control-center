import { createSvgIcon } from "./createSvgIcon.js";

export function CostsIcon() {
  return createSvgIcon(`
    <circle cx="24" cy="33" r="16" stroke="#3F4A45" stroke-width="3.5"/>
    <path d="M30 24C27 22 23 22 20 25C15 31 17 42 23 44C26 45 29 44 31 42" stroke="#75BD25" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M16 31H27M16 36H27" stroke="#75BD25" stroke-width="3" stroke-linecap="round"/>
    <path d="M40 18C49 18 55 21 55 26C55 31 49 34 40 34" stroke="#3F4A45" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M40 34C49 34 55 37 55 42C55 47 49 50 40 50" stroke="#3F4A45" stroke-width="3.5" stroke-linecap="round"/>
  `);
}
