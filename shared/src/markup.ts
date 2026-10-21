/* The markup allow-list (openspec change react-typescript, task 3.1; design B1). Question text, Trick steps and the
   pictures from viz.ts are HTML strings. Once views move to React they reach the page only through the Markup
   component, which renders the tree this parser returns: it reads the string without running anything (no DOMParser,
   so the browser and the Worker's server render build the same tree), keeps only the elements, attributes and
   classes listed here, and drops everything else. Text is always text: a React text node can never become markup.
   It fails closed: a tag it cannot read is shown as plain text, and a script or style element is dropped with its
   content. The online Duel client uses the same list (duel-online, its safe-html step). */

export interface MarkupElement { tag: string; attrs: Record<string, string>; children: MarkupNode[] }
/* A text run (entities decoded) or an element */
export type MarkupNode = string | MarkupElement;
/* What the parser left out, for tests and development warnings: an element, an attribute or a class */
export interface Dropped { kind: 'tag' | 'attr' | 'class'; name: string; value?: string }

/* Elements kept, by lower-case name, with the name React needs (SVG keeps its camelCase names) */
const TAGS: Record<string, string> = Object.fromEntries([
  'b', 'i', 'sup', 'sub', 'span', 'br', 'small', 'em', 'strong', 'div',
  'svg', 'g', 'circle', 'ellipse', 'rect', 'line', 'path', 'text', 'tspan', 'polygon', 'polyline', 'defs', 'clipPath',
].map(t => [t.toLowerCase(), t]));
/* Elements that never hold anything to show: dropped with everything inside them */
const DROP_WITH_CONTENT = new Set(['script', 'style', 'template', 'iframe', 'object', 'embed', 'noscript', 'textarea', 'title', 'foreignobject', 'math', 'xmp', 'noembed', 'noframes', 'plaintext']);
const VOID = new Set(['br']);

/* Attribute values: geometry is numbers and path commands only; a transform is translate, rotate or scale of numbers */
const NUM = /^-?\d*\.?\d+(?:e-?\d+)?(?:px)?$/i;
const PATH = /^[\d\s.,+\-eEMmLlHhVvCcSsQqTtAaZz]*$/;
const TRANSFORM = /^(?:\s*(?:translate|rotate|scale)\(\s*-?[\d.]+(?:[\s,]+-?[\d.]+){0,2}\s*\))+\s*$/;
const ID = /^[A-Za-z][\w-]{0,40}$/;
const geometry = (v: string) => NUM.test(v.trim());
const ATTRS: Record<string, (v: string) => boolean> = {
  x: geometry, y: geometry, x1: geometry, y1: geometry, x2: geometry, y2: geometry, cx: geometry, cy: geometry,
  r: geometry, rx: geometry, ry: geometry, width: geometry, height: geometry,
  d: v => PATH.test(v), points: v => PATH.test(v), viewbox: v => PATH.test(v), transform: v => TRANSFORM.test(v),
  'text-anchor': v => /^(start|middle|end)$/.test(v), 'dominant-baseline': v => /^(middle|central|auto|hanging)$/.test(v),
  fill: v => v === 'none',
  id: v => ID.test(v),
  'clip-path': v => /^url\(#[A-Za-z][\w-]{0,40}\)$/.test(v),
  role: v => /^(img|presentation|group|note)$/.test(v),
  /* Only the two inline styles content uses: a picture's max width, and wrapping a long decimal */
  style: v => v.split(';').map(d => d.trim()).filter(Boolean).every(d => /^max-width:\s*\d+(\.\d+)?px$/.test(d) || d === 'overflow-wrap:anywhere'),
};
/* The attribute names React and SVG expect, for the ones whose HTML name differs */
const ATTR_NAMES: Record<string, string> = { viewbox: 'viewBox' };
/* Classes from the design system's content styles: pictures (vz-), highlights (hl-), fractions, roots, the balance and
   Sutra card marks. Any other class is dropped, so content cannot dress itself up as the game's own controls. */
const CLASS = /^(?:vz|hl|fr|ov|bal|sc|mx)(?:-[a-z0-9]+)*$/;

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', minus: '−', times: '×', divide: '÷',
  radic: '√', middot: '·', pi: 'π', prime: '′', Prime: '″', hellip: '…', le: '≤',
  ge: '≥', asymp: '≈', plusmn: '±', lang: '⟨', rang: '⟩', rarr: '→', larr: '←',
  int: '∫', frac13: '⅓', frac12: '½', frac14: '¼', frac34: '¾', deg: '°', ne: '≠',
  infin: '∞', theta: 'θ', alpha: 'α', beta: 'β', sup2: '²', sup3: '³', ndash: '–',
  mdash: '—', hairsp: ' ', thinsp: ' ', sum: '∑', cent: '¢', check: '✓',
};
/* Entities to text; an entity it does not know stays as it was written (it is still only text) */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z][a-z0-9]{1,15});/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

const TAG_OPEN = /^<([a-zA-Z][a-zA-Z0-9]*)/;
const TAG_CLOSE = /^<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/;
const ATTR = /^\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/;

/* Parses one HTML string into allowed nodes. onDrop hears each element, attribute or class left out. */
export function parseMarkup(html: string, onDrop?: (d: Dropped) => void): MarkupNode[] {
  const root: MarkupElement = { tag: '#root', attrs: {}, children: [] };
  const stack: MarkupElement[] = [root];
  /* An element on the stack that is not kept: its children go to the nearest kept parent */
  const open: { name: string; el: MarkupElement | null }[] = [];
  const top = (): MarkupElement => stack[stack.length - 1] as MarkupElement;
  const text = (t: string) => {
    if (!t) return;
    const kids = top().children, last = kids[kids.length - 1];
    if (typeof last === 'string') kids[kids.length - 1] = last + decodeEntities(t);
    else kids.push(decodeEntities(t));
  };
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { text(html.slice(i)); break; }
    text(html.slice(i, lt));
    const rest = html.slice(lt);
    if (rest.startsWith('<!--')) {
      const end = html.indexOf('-->', lt + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    const close = TAG_CLOSE.exec(rest);
    if (close) {
      const name = (close[1] as string).toLowerCase();
      for (let k = open.length - 1; k >= 0; k--) {
        if ((open[k] as { name: string }).name !== name) continue;
        // close everything opened after it, then it
        for (const o of open.splice(k)) if (o.el) stack.pop();
        break;
      }
      i = lt + close[0].length;
      continue;
    }
    const start = TAG_OPEN.exec(rest);
    if (!start) { text('<'); i = lt + 1; continue; }
    // Read the attributes up to the end of the tag; a tag that never ends is shown as text
    let j = start[0].length;
    const attrs: [string, string][] = [];
    let ok = false, selfClose = false;
    for (;;) {
      const m = ATTR.exec(rest.slice(j));
      if (m) { attrs.push([(m[1] as string).toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '']); j += m[0].length; continue; }
      const end = /^\s*(\/?)>/.exec(rest.slice(j));
      if (end) { ok = true; selfClose = end[1] === '/'; j += end[0].length; }
      break;
    }
    if (!ok) { text('<'); i = lt + 1; continue; }
    const lower = (start[1] as string).toLowerCase();
    i = lt + j;
    if (DROP_WITH_CONTENT.has(lower)) {
      onDrop?.({ kind: 'tag', name: lower });
      if (!selfClose) {
        const end = html.toLowerCase().indexOf(`</${lower}`, i);
        const gt = end < 0 ? -1 : html.indexOf('>', end);
        i = gt < 0 ? html.length : gt + 1;
      }
      continue;
    }
    const tag = TAGS[lower];
    if (!tag) {
      onDrop?.({ kind: 'tag', name: lower });
      if (!selfClose && !VOID.has(lower) && !['img', 'input', 'hr', 'meta', 'link', 'source', 'wbr', 'area', 'base', 'col', 'param', 'track', 'image', 'use'].includes(lower)) open.push({ name: lower, el: null });
      continue;
    }
    const el: MarkupElement = { tag, attrs: {}, children: [] };
    for (const [name, raw] of attrs) {
      const value = decodeEntities(raw);
      if (name === 'class') {
        const keep = value.split(/\s+/).filter(Boolean).filter(c => { const good = CLASS.test(c); if (!good) onDrop?.({ kind: 'class', name: c }); return good; });
        if (keep.length) el.attrs.className = keep.join(' ');
        continue;
      }
      const check = ATTRS[name];
      const aria = /^aria-[a-z]+$/.test(name);
      if (aria || (check && check(value))) el.attrs[ATTR_NAMES[name] ?? name] = value;
      else onDrop?.({ kind: 'attr', name, value });
    }
    top().children.push(el);
    if (!selfClose && !VOID.has(lower)) { stack.push(el); open.push({ name: lower, el }); }
  }
  return root.children;
}

/* The text of a tree, as a screen reader or the read-aloud voice would get it from the page */
export const markupText = (nodes: readonly MarkupNode[]): string => nodes.map(n => (typeof n === 'string' ? n : n.tag === 'br' ? '\n' : markupText(n.children))).join('');
