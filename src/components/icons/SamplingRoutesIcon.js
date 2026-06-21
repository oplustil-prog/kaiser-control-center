import { createSvgIcon } from "./createSvgIcon.js";

export function SamplingRoutesIcon() {
  return createSvgIcon(`
    <path d="M21 34C21 24 32 12 32 12C32 12 43 24 43 34C43 41 38 46 32 46C26 46 21 41 21 34Z" stroke="#3F4A45" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M45 18L52 30" stroke="#75BD25" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M49 30H43L39 49H55L49 30Z" stroke="#75BD25" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M42 41H53" stroke="#75BD25" stroke-width="3" stroke-linecap="round"/>
    <path d="M29 36C30 38 32 39 35 38" stroke="#3F4A45" stroke-width="3" stroke-linecap="round"/>
  `);
}
