/* Sutra tags on demand (#126 review): js/sutra-tag.js stays out of the static import graph. app.js loads it a second
   after the page has loaded; a view that draws a tag sooner loads it then. tag(fn, ...args): the tag js/sutra-tag.js's
   fn draws, or until the module is here an empty placeholder of its size, which fillTags(root, signal) fills unless
   the view's signal has aborted. tags(): the module, or null. */
let mod = null, load = null;
export const loadTags = () => load ||= import('./sutra-tag.js').then(m => (mod = m));
export const tags = () => mod;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SIZES = ['full', 'line', 'mini'];

export function tag(fn, ...args) {
  if (mod) return mod[fn](...args);
  loadTags().catch(e => console.error('sutra-tag.js did not load', e));
  const o = args[1] || {}, size = SIZES.includes(o.size) ? o.size : 'line', el = size === 'mini' ? 'span' : size === 'line' ? 'p' : 'div';
  return `<${el} class="sutra-tag sutra-tag--${size} sutra-tag-slot${o.cls ? ' ' + esc(o.cls) : ''}" data-tag-slot="${esc(JSON.stringify([fn, ...args]))}" aria-hidden="true"></${el}>`;
}

export function fillTags(root, signal) {
  if (!root || !root.querySelector('[data-tag-slot]')) return;
  loadTags().then(m => {
    if (signal && signal.aborted) return;
    for (const el of root.querySelectorAll('[data-tag-slot]')) {
      if (!el.isConnected) continue;
      const [fn, ...args] = JSON.parse(el.dataset.tagSlot);
      el.outerHTML = typeof m[fn] === 'function' ? m[fn](...args) : '';
    }
  }, () => {});
}
