const SVG_BASE_ATTRIBUTES =
  'class="module-icon__svg" viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"';

export function createSvgIcon(children) {
  return `<svg ${SVG_BASE_ATTRIBUTES}>${children}</svg>`;
}
