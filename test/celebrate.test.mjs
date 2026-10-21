/* Celebrations (openspec celebrations): the big confetti is for true wins only, every celebration comes from
   js/celebrate.js, and under no motion (reduced motion, Pause motion or Calm) none of them does anything. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = d => readdirSync(join(repo, d)).flatMap(f => statSync(join(repo, d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
const js = walk('js').filter(f => f.endsWith('.js'));

/* Every place the big confetti fires, and the true win it marks. A new call fails here until it is added with its win
   (and to the table in the celebrations change); an everyday moment uses sparkle, pop, bounce, twinkle, wiggle or tick. */
const WINS = [
  ['js/gamify.js', "if (a !== b) { sfx('level'); confetti(110);", 'a new Title'],
  ['js/gamify.js', "sfx('badge'); if (b.id !== 'first') confetti(90);", 'a badge earned (not First step, which any first answer earns)'],
  ['js/gamify.js', "if (type === 'mastered') { confetti();", 'a skill mastered'],
  ['js/star.js', 'if (lit) { fx.confetti(110);', 'a Star lit'],
  ['js/app.js', 'if (isBest && right) fx.confetti(90)', 'a new best endless run'],
  ['js/app.js', 'if (done) fx.confetti(right === K.problems.length ? 90 : 40);', 'a kata cleared'],
  ['js/app.js', "store.touchDay(); if (medal === 3) fx.confetti(100); else if (medal) fx.confetti(40);", 'a challenge Medal'],
  ['js/app.js', "store.addSparks(5, 'sutra'); fx.confetti(60);", 'a Sutra card collected for the first time'],
  ['js/app.js', "if (isBest) { fx.confetti(100); msg = 'New personal best for today!'; }", 'an Arena personal best'],
  ['js/app.js', '        if (medal === 3) fx.confetti(100); else if (medal) fx.confetti(40);', 'a game Level Medal'],
  ['js/app.js', 'if (isBest && score) fx.confetti(80);', 'a best ranked game score today'],
  ['js/play/exp/apprentice.js', 'if (after > before) { confetti(70);', 'the Apprentice earns a Belt'],
  ['js/play/exp/scroll.js', 'if (firstPiece || finale) confetti(finale ? 120 : 60);', 'a scroll chapter completed, or the whole scroll'],
  ['js/play/exp/lens.js', 'if (list.every(x => done[x.id]) && first) { confetti(70);', 'every Number Lens challenge solved'],
  ['js/play/exp/wall.js', "sfx('magic'); confetti(40);", 'a new pattern discovered on the Wall'],
  ['js/play/exp/locks.js', "if (last) { confetti(70);", 'a lock fully cracked'],
  ['js/play/exp/locks.js', '      confetti(40);', "a lock's rule discovered"],
  ['js/play/exp/party.js', 'if (e.done) confetti(50);', 'the Party relay team goal reached'],
  ['js/play/exp/party.js', 'later(() => { confetti(90);', 'the Party podium (a game won)'],
  ['js/play/exp/bets.js', 'confetti(50);', 'a new best at Estimation Bets'],
  ['js/play/exp/tala.js', 'confetti(70); say(`Thom on sam!', 'a tihai solved'],
  ['js/play/exp/ghosts.js', "if (won) { sfx('win'); confetti(50); }", 'a race against the ghosts won'],
  ['js/play/exp/daily.js', 'if (official && !fun[cur]) confetti(70);', "three stars on the day's own Daily Number"]
];
const CALL = /(^|[^\w.])(fx\.)?confetti\(/;
const calls = js.filter(f => f !== 'js/celebrate.js').flatMap(f => readFileSync(join(repo, f), 'utf8').split('\n')
  .filter(l => CALL.test(l) && !/^\s*(\/\*|\*|\/\/)/.test(l) && !/^\s*export /.test(l) && !/import \{/.test(l) && !/confetti\(n\)/.test(l))
  .map(l => [f, l]));

test('the big confetti fires only at the true wins listed here', () => {
  const unknown = calls.filter(([f, l]) => !WINS.some(([wf, snip]) => wf === f && l.includes(snip)));
  assert.deepEqual(unknown.map(([f, l]) => `${f}: ${l.trim().slice(0, 120)}`), []);
  const gone = WINS.filter(([wf, snip]) => !calls.some(([f, l]) => f === wf && l.includes(snip)));
  assert.deepEqual(gone.map(([f, s, w]) => `${f} (${w})`), [], 'every listed win still celebrates');
});

test('picking a Mode is everyday: the Mode picker pops a card and sparkles, with no big confetti', () => {
  const app = readFileSync(join(repo, 'js/app.js'), 'utf8');
  const picker = app.slice(app.indexOf('function modePicker('), app.indexOf('function afterPick('));
  assert.ok(picker.length > 100);
  assert.doesNotMatch(picker, /confetti\(/);
  assert.match(picker, /fx\.pop\(b, signal\); fx\.sparkle\(b, \{ n: 10 \}\); fx\.cheer\(/);
  assert.match(picker, /if \(fx\.noMotion\(\)\) return go\(\);/, 'under no motion Home opens at once');
  assert.match(picker, /later\(go, \d+, signal\)/, 'the short wait goes through life.js on the view signal');
});

test('the app and the play experiences take their celebrations from js/celebrate.js', () => {
  assert.match(readFileSync(join(repo, 'js/fx.js'), 'utf8'), /export \{ confetti, sparkle, pop, bounce, twinkle, wiggle, tick, cheer, rollUp, rollSparks \} from '\.\/celebrate\.js';/);
  assert.match(readFileSync(join(repo, 'js/play/kit.js'), 'utf8'), /export \{ confetti, sparkle, pop, bounce, twinkle, wiggle, tick \} from '\.\.\/celebrate\.js';/);
  const src = readFileSync(join(repo, 'js/celebrate.js'), 'utf8');
  assert.doesNotMatch(src, /\b(setTimeout|setInterval|requestAnimationFrame)\(/, 'timers and frames go through life.js');
  assert.doesNotMatch(src, /#[0-9a-f]{3,8}\b/i, 'no hex colours: token classes and token values only');
  /* Only transforms and opacity move: the keyframes name translate, scale, rotate and opacity, nothing else */
  const props = [...src.matchAll(/animate\((?!keyframes)[^,]+, \{([^}]*)\}/g)].flatMap(m => [...m[1].matchAll(/(\w+):/g)].map(x => x[1]));
  assert.ok(props.length >= 6);
  assert.deepEqual([...new Set(props)].filter(p => !['translate', 'scale', 'rotate', 'opacity'].includes(p)), []);
});

/* No motion: each helper is a no-op. The DOM stubs throw if anything is drawn or added. */
for (const [name, setup] of [
  ['reduced motion', g => { g.matchMedia = () => ({ matches: true }); }],
  ['Pause motion', g => { g.__paused = true; }],
  ['Calm', g => { g.localStorage.setItem('vm.calm', '1'); }]
]) {
  test(`under ${name} no celebration draws, adds or animates anything`, async () => {
    const store = new Map();
    const g = globalThis, saved = { matchMedia: g.matchMedia, document: g.document, localStorage: g.localStorage };
    g.matchMedia = () => ({ matches: false });
    g.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
    const boom = () => { throw new Error('drew something under no motion'); };
    g.document = { documentElement: { classList: { contains: c => c === 'motion-paused' && !!g.__paused } }, createElement: boom, body: { append: boom }, addEventListener: () => {} };
    setup(g);
    try {
      const C = await import('../js/celebrate.js');
      assert.equal(C.still(), true);
      const el = { animate: boom, getBoundingClientRect: boom, querySelector: () => null, querySelectorAll: () => [], set innerHTML(v) { boom(); } };
      C.confetti(100);
      C.sparkle(el); C.pop(el); C.bounce(el); C.twinkle(el); C.wiggle(el); C.tick(el); C.cheer(el);
      C.rollUp(el, 50); C.rollSparks(el);
      assert.equal(C.animate(el, { opacity: [0, 1] }, { duration: 10 }), null);
    } finally { Object.assign(g, saved); delete g.__paused; }
  });
}
