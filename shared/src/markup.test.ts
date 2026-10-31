/* The markup allow-list (openspec change react-typescript, task 3.1; design B1; app-build spec "No markup from
   strings"): allowed content keeps its shape, hostile content keeps nothing that could run or pass for the game's own
   controls, and every Skill's and Trick's text and pictures parse with nothing dropped. */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseMarkup, markupText, decodeEntities, type Dropped, type MarkupNode, type MarkupElement } from './markup.ts';
import { SKILLS } from './skills/index.ts';
import { TRICKS, type Vals } from './vedic.ts';
import { withSeed } from './questions.ts';
import * as V from './viz.ts';

const tags = (nodes: readonly MarkupNode[]): string[] => nodes.flatMap(n => (typeof n === 'string' ? [] : [n.tag, ...tags(n.children)]));
const attrs = (nodes: readonly MarkupNode[]): string[] => nodes.flatMap(n => (typeof n === 'string' ? [] : [...Object.keys(n.attrs), ...attrs(n.children)]));

test('allowed content: 7<sup>2</sup> is 7 with a superscript 2', () => {
  assert.deepEqual(parseMarkup('7<sup>2</sup>'), ['7', { tag: 'sup', attrs: {}, children: ['2'] }]);
  assert.deepEqual(parseMarkup('<b class="hl hl-coral">3</b> &times; 4 &minus; 1'), [{ tag: 'b', attrs: { className: 'hl hl-coral' }, children: ['3'] }, ' × 4 − 1']);
  assert.deepEqual(parseMarkup('a<br>b'), ['a', { tag: 'br', attrs: {}, children: [] }, 'b']);
});

test('hostile content: no img, no script, no event attribute, no link, no foreign class, and nothing runs', () => {
  const cases = [
    '<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '<svg><script>alert(1)</script></svg>', '<b onclick="alert(1)">x</b>',
    '<a href="javascript:alert(1)">x</a>', '<span style="background:url(x)">x</span>', '<span class="md-btn md-btn--primary">Play</span>',
    '<iframe src="//evil.example"></iframe>', '<svg><foreignObject><div>x</div></foreignObject></svg>', '<style>*{}</style>',
    '<rect width="10" height="calc(1px)"/>', '<path d="M0 0 url(#x)"/>', '<g transform="translate(0 0) skewX(1)"/>', '<b>unclosed',
    '<scr<script>ipt>alert(1)</script>', '<SCRIPT>alert(1)</SCRIPT>', '<!-- <script>alert(1)</script> -->', '<b/onclick=alert(1)>x</b>',
  ];
  for (const html of cases) {
    const tree = parseMarkup(html);
    for (const t of tags(tree)) assert.ok(!/^(img|script|a|iframe|style|foreignObject|foreignobject)$/.test(t), `${html}: kept <${t}>`);
    for (const a of attrs(tree)) assert.ok(!/^on|^href$|^src$/.test(a), `${html}: kept ${a}`);
    const json = JSON.stringify(tree);
    assert.doesNotMatch(json, /javascript:|md-btn|calc\(|url\(#x\)|skewX|background/, `${html}: ${json}`);
  }
  assert.deepEqual(parseMarkup('<img src=x onerror=alert(1)>'), []);
  assert.deepEqual(parseMarkup('<script>alert(1)</script>after'), ['after']);
  assert.deepEqual(parseMarkup('<a href="javascript:alert(1)">x</a>'), ['x'], 'an element off the list is dropped, its text kept as text');
});

test('a tag it cannot read is shown as text, never passed through', () => {
  assert.deepEqual(parseMarkup('3 < 4 and <b'), ['3 < 4 and <b']);
  assert.deepEqual(parseMarkup('x <1>'), ['x <1>']);
  assert.equal(markupText(parseMarkup('&lt;script&gt;alert(1)&lt;/script&gt;')), '<script>alert(1)</script>', 'escaped markup stays text');
});

test('entities: named, decimal and hex; an unknown one stays as written', () => {
  assert.equal(decodeEntities('&minus;&times;&divide;&radic;&pi;&#8202;&#x2212;&amp;'), '−×÷√π −&');
  assert.equal(decodeEntities('&nosuch; &#0; &#xD800;'), '&nosuch; &#0; &#xD800;');
});

test('the pictures keep their SVG: viewBox, geometry, classes, the clip path and the max width', () => {
  const drops: Dropped[] = [];
  const [svg] = parseMarkup(V.plane({ points: [{ x: 1, y: 2, label: 'P' }], fns: [x => x] }), d => drops.push(d)) as MarkupElement[];
  assert.deepEqual(drops, []);
  assert.equal(svg!.tag, 'svg');
  assert.equal(svg!.attrs.viewBox, '0 0 300 300');
  assert.equal(svg!.attrs.style, 'max-width:300px');
  assert.equal(svg!.attrs['aria-label'], 'Coordinate plane');
  assert.ok(tags([svg!]).includes('clipPath'));
});

/* Every string a Skill or Trick shows: question, picture, hints, steps, choices; Trick steps on screen and read aloud */
function content(): [string, string][] {
  const out: [string, string][] = [];
  for (const s of SKILLS) for (let lv = 1; lv <= 3; lv++) for (let k = 0; k < 6; k++) {
    const p = withSeed(`${s.id}-${lv}-${k}`, () => s.gen(lv));
    const where = `${s.id} level ${lv}`;
    for (const v of [p.q, p.viz, ...(p.hints || []), ...(p.steps || []), ...(p.choices || []).map(String), ...(p.fields || []).map(f => f.label)])
      if (typeof v === 'string' && v) out.push([where, v]);
  }
  for (const t of TRICKS) for (let k = 0; k < 6; k++) {
    const vals = withSeed(`${t.id}-${k}`, () => { let v: Vals; do v = t.random() as Vals; while (t.valid(v)); return v; });
    for (const st of t.steps(vals)) out.push([`trick ${t.id}`, st.show], [`trick ${t.id}`, st.say]);
  }
  return out;
}

test('every Skill and Trick string parses with nothing dropped', () => {
  const all = content();
  assert.ok(all.length > 3000, `${all.length} strings checked`);
  for (const [where, html] of all) {
    const drops: Dropped[] = [];
    parseMarkup(html, d => drops.push(d));
    assert.deepEqual(drops, [], `${where}: ${html.slice(0, 200)}`);
  }
});

test('parsing is the same on every run: the same string gives the same tree (the browser and the Worker share it)', () => {
  for (const [, html] of content().slice(0, 400)) assert.deepEqual(parseMarkup(html), parseMarkup(html));
});

test('names every object inherits are not on the lists: constructor and __proto__ keep nothing, and nothing throws', () => {
  const drops: Dropped[] = [];
  assert.deepEqual(parseMarkup('<constructor>x</constructor>', d => drops.push(d)), ['x']);
  assert.deepEqual(drops, [{ kind: 'tag', name: 'constructor' }]);
  for (const name of ['tostring', 'valueof', 'hasownproperty']) assert.deepEqual(parseMarkup(`<${name}>y</${name}>`), ['y'], name);
  const tree = parseMarkup('<b constructor="x" __proto__="y" tostring="z">z</b>');
  assert.equal(tree.length, 1);
  const b = tree[0] as MarkupElement;
  assert.equal(b.tag, 'b');
  assert.deepEqual(Object.keys(b.attrs), [], 'no attribute kept');
  assert.equal(Object.getPrototypeOf(b.attrs), Object.prototype, 'the attributes object keeps its prototype');
  assert.equal(decodeEntities('&constructor; &toString; &hasOwnProperty;'), '&constructor; &toString; &hasOwnProperty;');
  assert.equal(markupText(parseMarkup('a &constructor; b')), 'a &constructor; b');
});
