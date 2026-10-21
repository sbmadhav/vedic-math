// Expect: no-restricted-properties
export function fill(el: HTMLElement, html: string) {
  el.innerHTML = html;
}
