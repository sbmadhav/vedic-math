/* Vedic Math for Everyone: router and views.
   Modes: Explorer (about 4 to 7), Challenger (about 8 to 12), Pro (13 to adult). Everything is gamified:
   Sparks and Titles, badges, Dojo belts, daily quests, the Arena with leaderboards, Party Mode and games.
   The play experiences (js/play/) are pages inside the Dojo, Arena, Games and Sutras sections. */
import { SKILLS, byId, skillsFor, GRADES, STRANDS, gradeOf, withPlain } from './skills/index.js';
import { TRICKS, BELTS } from './vedic.js';
import { GAMES, keepFocus } from './games.js';
import { SUTRAS, SUBSUTRAS, HISTORY } from './sutras.js';
import { DETAILS } from './sutra-details.js';
import { mountScene } from './scenes.js';
import * as W from './watch.js';
import { checkOne } from './check.js';
import { answerText } from './answers.js';
import { pick, shuffle } from './lib.js';
import * as store from './store.js';
import * as fx from './fx.js';
import * as gm from './gamify.js';
import * as cloud from './cloud.js';
import { runArena, runChallenge } from './arena.js';
import * as LV from './levels.js';
import { LEVELS, LEVELS_PER_GAME, levelMedal, boardGame } from './games.js';
import * as AD from './adapt.js';
import { initAmbient, bgOn, setBg, BG_NOTES, stop as stopMusic, isPlaying as musicOn } from './ambient.js';
import { on, later, every, child, onAbort } from './life.js';
import * as metrics from './metrics.js';
import { boltHTML } from './bolt.js';
import { runStar } from './star.js';
import * as SKY from './sky.js';
import { skyView, placesHTML } from './sky-view.js';
import { openShell } from './shell.js';
import { PLAY, SECTIONS, playFor, playIn } from './play/catalog.js';
import { ICONS as PLAY_ICONS } from './play/icons.js';
import { place as playPlace } from './play/kit.js';
import { GROUPS, sectionsFor, tryFor, say, resolveTour, tourDue, tourState, setTourState } from './guide.js';
import { artFor } from './guide-art.js';
import { startTour } from './tour.js';

const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const both = (pro, kid) => (kid && kid !== pro ? `<span class="pro">${pro}</span><span class="kid">${kid}</span>` : pro);
const track = (name, title) => { try { window.siteTrack && window.siteTrack('math/' + name, title); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gradeLabel = g => { const x = gradeOf(g); return x ? both(x.pro, x.kid) : g; };
const gradeShort = g => (g === 'K' ? 'K' : g === 'V' ? 'Tricks' : g);
const pct = x => Math.round(x * 100);
const plain = h => String(h).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ');
const BRAND = 'Vedic Math';
/* Watch (openspec watch-shelf): every video plays inside the page (privacy-enhanced embed, js/watch.js). Links that
   leave the site are for Pro only, and outLink() is the one place that writes one. */
const linksOut = () => W.linksOut(fx.mode());
const outLink = (url, inner, cls = '') => (linksOut() ? `<a${cls ? ` class="${cls}"` : ''} href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-link>${inner}</a>` : '');
const playBtn = (yt, inner, cls = '') => `<button type="button"${cls ? ` class="${cls}"` : ''} data-watch="${esc(yt)}">${inner}</button>`;

const ring = (m, size = 44) => { const r = size / 2 - 4, c = 2 * Math.PI * r; return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - m)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`; };
const status = id => (store.mastered(id) ? ['done', both('Mastered', 'Got it!')] : store.started(id) ? ['going', both('Practicing', 'Learning')] : ['new', 'New']);
const gradeStats = g => { const list = skillsFor(g); const done = list.filter(s => store.mastered(s.id)).length; const avg = list.reduce((t, s) => t + store.mastery(s.id), 0) / (list.length || 1); return { done, total: list.length, avg }; };
const avatar = (p, size = 36) => `<span class="av av-${p.avatar}" style="width:${size}px;height:${size}px;font-size:${size * 0.42}px" aria-hidden="true">${p.name.split(' ').slice(0, 2).map(w => w[0]).join('')}</span>`;
/* Bolt in a speech bubble: cheer for a right answer, think after a miss (js/bolt.js) */
const boltFor = tone => boltHTML(tone === 'ok' ? 'cheer' : tone === 'no' ? 'think' : 'idle');
const crumbs = (...parts) => `<nav class="mq-crumbs" aria-label="Breadcrumb"><a href="#/">${BRAND}</a>${parts.map(([h, l]) => ` <span aria-hidden="true">/</span> ${h ? `<a href="${h}">${l}</a>` : `<span>${l}</span>`}`).join('')}</nav>`;

/* ---------- Router ---------- */
/* Each view gets ctx = { signal }: the signal aborts when the route changes (view-lifecycle spec). A view may
   return { destroy } for extra work on the way out; render() calls it, then aborts the signal. */
const routes = [
  [/^#?\/?$/, (m, ctx) => home(ctx)],
  [/^#\/learn$/, (m, ctx) => learnView(ctx)],
  [/^#\/grade\/(\w+)$/, (m, ctx) => gradeView(m[1], ctx)],
  [/^#\/skill\/([\w-]+)$/, (m, ctx) => skillView(m[1], ctx)],
  [/^#\/mix\/(\w+)$/, (m, ctx) => mixView(m[1], false, ctx)],
  [/^#\/run\/(\w+)$/, (m, ctx) => mixView(m[1], true, ctx)],
  [/^#\/(dojo|tricks)$/, (m, ctx) => dojoView(ctx)],
  [/^#\/katas\/([\w-]+)$/, (m, ctx) => katasView(m[1], ctx)],
  [/^#\/kata\/([\w-]+)\/(\d+)$/, (m, ctx) => kataView(m[1], +m[2], ctx)],
  [/^#\/star\/([\w-]+)\/(\d+)$/, (m, ctx) => starView(m[1], +m[2], ctx)],
  [/^#\/tower$/, (m, ctx) => towerView(ctx)],
  [/^#\/tower\/(\d+)$/, (m, ctx) => chapterView(+m[1], ctx)],
  [/^#\/challenge\/(\d+)$/, (m, ctx) => challengeView(+m[1], ctx)],
  [/^#\/sutras$/, (m, ctx) => sutrasView(ctx)],
  [/^#\/sutras\/(\w+)$/, (m, ctx) => { sutrasView(ctx); openSutra(m[1], false); }],
  [/^#\/arena$/, (m, ctx) => arenaView(ctx)],
  [/^#\/duel$/, () => { location.replace('#/arena/party'); }], /* Duel became Party Mode (openspec play-experiences) */
  [/^#\/games$/, (m, ctx) => gamesView(ctx)],
  [/^#\/game\/([\w-]+)$/, (m, ctx) => gameView(m[1], 0, ctx)],
  [/^#\/game\/([\w-]+)\/(\d+)$/, (m, ctx) => gameView(m[1], +m[2], ctx)],
  [/^#\/watch$/, (m, ctx) => watchView(ctx)],
  [/^#\/places$/, (m, ctx) => placesView(ctx)],
  [/^#\/tiles$/, (m, ctx) => home(ctx, { tiles: true })],
  [/^#\/(me|progress)$/, (m, ctx) => meView(ctx)],
  [/^#\/guide(?:\/([\w-]+))?$/, (m, ctx) => guideView(m[1], ctx)],
  /* Play experiences: pages inside a section, after the section's own routes (js/play/catalog.js) */
  [/^#\/(?:dojo|arena|games|sutras)\/[a-z-]+(?:\/.*)?$/, (m, ctx) => playView(m[0], ctx)]
];
/* The view on screen: its AbortController and the destroy() it returned, if any */
let life = null;
function teardown() {
  const l = life; life = null; if (!l) return;
  try { if (l.destroy) l.destroy(); } catch (e) {}
  l.ctl.abort();
}
/* Stops everything the previous view started, then runs fn({ signal }) as the new view.
   Views that draw themselves again from scratch (Play again, Run again) come back through here too. */
function mount(fn) {
  teardown();
  const ctl = new AbortController(), mine = { ctl, destroy: null }; life = mine;
  const out = fn({ signal: ctl.signal });
  if (life === mine && out && typeof out.destroy === 'function') mine.destroy = out.destroy;
}
/* Which catalog ids a route-view event may name (metrics.routePath); anything else is sent as 'unknown' */
const knownId = (kind, id) => kind === 'grade' ? !!gradeOf(id) : kind === 'skill' ? !!byId[id] : kind === 'trick' ? TRICKS.some(t => t.id === id)
  : kind === 'sutra' ? ALL_SUTRAS.some(c => c.id === id) : kind === 'game' ? GAMES.some(g => g.id === id)
  : kind === 'play' ? PLAY.some(e => e.route.endsWith('/' + id)) : false;
function render() {
  try { speechSynthesis.cancel(); } catch (e) {}
  const h = location.hash || '#/';
  render.from = render.at; render.at = h; /* where a Star's Back button returns to */
  // Sutra deep dives open over the sutras page without re-rendering it
  const ms = h.match(/^#\/sutras\/(\w+)$/);
  if (ms && document.querySelector('.sutra-grid')) { openSutra(ms[1], true); metrics.view(h, knownId); return; }
  if (h === '#/sutras' && sutraDlg && sutraDlg.open) { closeSutra(); metrics.view(h, knownId); return; }
  if (sutraDlg && sutraDlg.open) closeSutra(true);
  const hit = routes.find(([re]) => re.test(h)), picker = !fx.mode() && !/^#\/(watch|sutras|guide(\/[\w-]+)?)$/.test(h); /* the guide opens without a mode too */
  mount(ctx => (picker ? modePicker(ctx) : hit ? hit[1](h.match(hit[0]), ctx) : home(ctx)));
  const asSky = !picker && /^#?\/?$/.test(h) && SKY.skyOn(store.player()); /* home showed the Sky: the route view is sky */
  if ((location.hash || '#/') === h) metrics.view(h, knownId, picker, asSky); /* one anonymous route view (analytics spec); a view that redirected is counted when its target renders */
  document.querySelectorAll('.mq-nav a[href]').forEach(a => a.setAttribute('aria-current', String(h === a.getAttribute('href') || (!!a.dataset.match && new RegExp(a.dataset.match).test(h)))));
  chip();
  /* Focus the new view's heading, unless the view already put focus somewhere in itself (the Sky, back from a Star) */
  const head = view.querySelector('h1, h2'); if (head) { head.setAttribute('tabindex', '-1'); if (render.n++ && !view.contains(document.activeElement)) head.focus({ preventScroll: true }); }
  if (render.n > 1) window.scrollTo({ top: 0 });
}
render.n = 0;
window.addEventListener('hashchange', render);

/* Player chip in the nav: avatar and the bar to the next Title (no number) */
function chip() {
  const el = $('#mqChip'); if (!el) return; const p = store.player(), T = gm.titleInfo();
  el.innerHTML = `<a href="#/me" class="mq-chip" aria-label="${esc(p.name)}, ${T.title}">${avatar(p, 30)}<span class="mq-chip-t"><span class="mq-sparkbar"><i style="width:${pct(T.pct)}%"></i></span></span></a>`;
}
store.on(type => { if (type === 'sparks' || type === 'player') chip(); });
/* The bar to the next Title, as a progressbar with its Sparks in words */
function titleBar(T, cls = 'mq-sparkbar mq-sparkbar--big') {
  const text = T.next ? `${T.into} of ${T.need} Sparks to ${T.next}` : 'Top Title reached';
  return `<span class="${cls}" role="progressbar" aria-label="Sparks to the next Title" aria-valuemin="0" aria-valuemax="${T.next ? T.need : 1}" aria-valuenow="${T.next ? T.into : 1}" aria-valuetext="${text}"><i style="width:${pct(T.pct)}%"></i></span>`;
}

/* ---------- Mode picker (first visit, and from Me) ---------- */
function modePicker() {
  document.title = `${BRAND} for Everyone · Madhav`;
  const p = store.player();
  view.innerHTML = `<section class="md-section mq-hero"><div class="md-wrap">
    <span class="md-tag md-tag--plum">Vedic Math for Everyone</span>
    <h1 class="md-heading">Fast, fun math for <span class="hl-word">every</span> brain</h1>
    <p class="md-lede">Speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book, a full skill map from counting to calculus, games, daily quests and an Arena with leaderboards. Pick how you want to play. You can change it any time.</p>
    <div class="mode-pick">${Object.entries(fx.MODES).map(([id, m]) => `<button class="mode-card mode-card--${m.color}" data-mode="${id}"><span class="mode-ic" aria-hidden="true">${modeIcon(id)}</span><b>${m.name}</b><small>${m.ages}</small><span>${m.blurb}</span></button>`).join('')}</div>
    <p class="mq-note">Playing as <b>${esc(p.name)}</b>. Nicknames are made up for you, so no real names are ever needed.</p>
    <p class="mq-note gd-pickhelp">Not sure where to start? <a href="#/guide">See how it works</a></p>
  </div></section>`;
  view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { fx.sfx('level'); fx.setMode(b.dataset.mode); gm.startDay(); fx.confetti(60); location.hash = '#/'; render(); });
}
function modeIcon(id) {
  const P = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg viewBox="0 0 32 32" width="40" height="40">${{ explorer: `<circle cx="16" cy="18" r="9" ${P}/><path d="M16 9V4M12 5l4-1 4 1M12.5 17h.01M19.5 17h.01M13 21c2 1.5 4 1.5 6 0" ${P}/>`, challenger: `<path d="M17 3L7 18h8l-1 11 11-16h-8z" ${P}/>`, pro: `<path d="M5 26L13 8l5 10 3-5 6 13z" ${P}/><circle cx="24" cy="7" r="2.5" ${P}/>` }[id]}</svg>`;
}

/* ---------- Home: one per mode ---------- */
function questsHTML() {
  const qs = gm.quests();
  return `<div class="md-card quest-card"><h2 class="mq-h3">Daily quests</h2><ul class="quests">${qs.map(q => `<li class="${q.done ? 'done' : ''}"><span class="q-check" aria-hidden="true">${q.done ? '&#10003;' : ''}</span><span class="q-t">${q.label}<span class="mq-bar"><i style="width:${pct(q.prog / q.goal)}%"></i></span></span><span class="q-n">${q.prog}/${q.goal}</span></li>`).join('')}</ul><p class="mq-small">Each quest is worth 25 bonus Sparks. New quests every day.</p></div>`;
}
function heroStats() {
  const p = store.player(), T = gm.titleInfo();
  return `<div class="me-strip">${avatar(p, 54)}<div class="me-strip-t"><small>${fx.t({ explorer: 'Hello,', challenger: store.playedBefore() ? 'Welcome back,' : 'Welcome,', pro: store.playedBefore() ? 'Welcome back,' : 'Welcome,' })}</small><b>${esc(p.name)}</b><span>${T.title}</span>${titleBar(T)}</div>
    <div class="me-nums"><div><b>${store.sparks()}</b><small>Sparks</small></div><div><b>${store.streakDays()}</b><small>day streak</small></div><div><b>${Object.keys(store.badges()).length}</b><small>badges</small></div></div></div>`;
}
const tile = (href, title, sub, color, ic) => `<a class="play-tile play-tile--${color}" href="${href}"><span class="play-ic" aria-hidden="true">${icon(ic)}</span><b>${title}</b><small>${sub}</small></a>`;

/* Home: the Sky for a Challenger or Pro Player who turned it on (openspec sky-home), else the tile home of their Mode.
   tiles: the tile home whatever the switch says (#/tiles, from All places). */
function home(ctx = {}, { tiles = false } = {}) {
  if (!tiles && SKY.skyOn(store.player())) return skyHome(ctx);
  const m = fx.mode(); document.title = `${BRAND} for Everyone · Madhav`;
  const last = store.lastSkill() && byId[store.lastSkill()];
  const cont = last ? `<a class="mq-continue" href="#/skill/${last.id}">${ring(store.mastery(last.id), 40)}<span><small>Keep going</small><b>${both(last.title, last.kid)}</b></span><span class="mq-go" aria-hidden="true">&rarr;</span></a>` : '';
  let body = '';
  if (m === 'explorer') {
    body = `<div class="play-grid play-grid--big">
      ${tile('#/game/balloons', 'Balloon pop', 'Count and pop', 'coral', 'balloon')}
      ${tile('#/skill/k-count', 'How many dots?', 'Count with ten frames', 'sun', 'dots')}
      ${tile('#/game/more-less', 'Which has more?', 'Big or small', 'teal', 'scale')}
      ${tile('#/game/make-ten', 'Make ten', 'Find the partners', 'sky', 'ten')}
      ${tile('#/skill/k-add10', 'Adding', 'Put together', 'plum', 'plus')}
      ${tile('#/game/quick-look', 'Quick look', 'Flash dots', 'sun', 'eye')}
      ${tile('#/skill/k-shapes', 'Shape detective', 'Name that shape', 'teal', 'shape')}
      ${tile('#/arena', 'Race the clock', 'Tap fast!', 'coral', 'bolt')}
    </div>
    <p class="mq-cta"><button class="md-btn" id="voiceBtn" aria-pressed="${fx.voiceOn()}">${icon('speaker')} Read questions aloud: ${fx.voiceOn() ? 'on' : 'off'}</button> <a class="md-btn" href="#/watch">${icon('play')} Watch and sing</a></p>`;
  } else if (m === 'challenger') {
    const belt = gm.currentBelt(), bp = gm.beltProgress(), next = bp.find(b => !b.earned), nk = SKY.suggested(store.starStates(), SKY.startBeltOf(store.player())), ns = nk && SKY.parseKey(nk), nt = ns && TRICKS.find(t => t.id === ns.trick);
    body = `<div class="home-2"><div class="md-card dojo-card"><span class="md-tag md-tag--plum">Dojo</span><h2 class="mq-h3">${belt ? `You hold the ${belt.name}` : 'Earn your white belt'}</h2>
      <div class="belts-mini">${bp.map(b => `<span class="belt-mini${b.earned ? ' on' : ''}" style="--belt:${b.color}" title="${b.name}"></span>`).join('')}</div>
      ${next ? `<p class="mq-small">${next.name}: ${next.lit} of ${gm.STARS_PER_BELT} Stars lit</p>` : ''}
      ${nt ? `<p>Next Star: <b>${nt.title}, Star ${ns.n}</b></p><a class="md-btn md-btn--primary" href="#/star/${nt.id}/${ns.n}">Play this Star</a>` : '<p>Every Star is lit. Legend!</p>'} <a class="md-btn" href="#/dojo">Open the Dojo</a></div>
      ${questsHTML()}</div>
      <div class="play-grid">
        ${tile('#/arena', 'Daily Arena', '60 seconds, same questions for everyone', 'coral', 'trophy')}
        ${tile('#/arena/party', 'Party Mode', 'Two to four players, one screen', 'sky', 'duel')}
        ${tile('#/games', 'Games', 'Times sprint, target, fractions', 'teal', 'game')}
        ${tile('#/learn', 'Skill map', 'Grades 3 to 8 and beyond', 'sun', 'map')}
        ${tile('#/sutras', 'Sutra cards', 'Collect all 29', 'plum', 'cards')}
        ${tile('#/watch', 'Watch and learn', 'Best trick videos', 'coral', 'play')}
      </div>`;
  } else {
    const collected = gm.collectedCount();
    body = `<div class="home-2"><div class="md-card"><span class="md-tag md-tag--coral">Arena</span><h2 class="mq-h3">Today's leaderboard</h2><div id="homeBoard" class="lb-wrap"><p class="mq-small">Loading…</p></div>${parentNote()}<a class="md-btn md-btn--primary" href="#/arena">Play today's round</a></div>${questsHTML()}</div>
      <div class="play-grid">
        ${tile('#/dojo', 'Vedic Dojo', `${gm.beltProgress().filter(b => b.earned).length} of ${BELTS.length} belts · ${litStars()} of ${SKY.PATH.length} Stars lit`, 'plum', 'belt')}
        ${tile('#/sutras', 'Sutra deep dive', `${collected} of ${SUTRAS.length + SUBSUTRAS.length} cards collected`, 'sun', 'cards')}
        ${tile('#/learn', 'Skill map', 'Algebra, geometry, calculus', 'sky', 'map')}
        ${tile('#/arena/party', 'Party Mode', 'Family math night', 'coral', 'duel')}
        ${tile('#/games', 'Puzzles and games', 'Hit the target and more', 'teal', 'game')}
        ${tile('#/watch', 'Watch shelf', '3Blue1Brown, Numberphile, more', 'sky', 'play')}
      </div>`;
  }
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${heroStats()}
    <h1 class="md-heading home-h">${fx.t({ explorer: 'What do you want to play?', challenger: 'Ready to get faster?', pro: 'Train your mental math' })}</h1>
    <p class="mode-line">Mode: <b>${fx.MODES[m].name}</b> <a href="#/me">Change</a></p>
    ${newHereHTML()}${cont}${body}
  </div></section>`;
  const vb = $('#voiceBtn'); if (vb) vb.onclick = () => { fx.setVoice(!fx.voiceOn()); fx.speak('Hi! I will read the questions to you.', true); home(); };
  if (m === 'pro') loadBoard($('#homeBoard'), `daily-${cloud.dayId()}-pro`, 5);
  homeTour(ctx.signal);
}

/* The Sky as home (openspec sky-home). Back from a Star (the route before was #/star/<trick>/<n>): that Star is focused. */
const litStars = () => { const { lit } = store.starStates(); return SKY.PATH.filter(k => lit[k]).length; };
function skyHome({ signal } = {}) {
  document.title = `${BRAND} for Everyone · Madhav`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">${heroStats()}${newHereHTML()}<div id="skyHome"></div>
    <p class="mode-line">Mode: <b>${fx.MODES[fx.mode()].name}</b> <a href="#/me">Change</a></p></div></section>`;
  const back = (render.from || '').match(/^#\/star\/([\w-]+)\/(\d)$/);
  const out = skyView($('#skyHome'), { signal, focus: back ? `${back[1]}:${back[2]}` : null });
  homeTour(signal);
  return out;
}
/* All places: the Sky as a plain list (#/places) */
function placesView() {
  document.title = `All places: ${BRAND} · Madhav`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap mq-narrow places">
    ${crumbs([null, 'All places'])}
    <span class="md-tag md-tag--plum">Star Quest</span>
    <h1 class="md-heading">All places</h1>
    ${placesHTML()}
  </div></section>`;
}

/* ---------- Learn ---------- */
function learnView() {
  document.title = `Skill map: ${BRAND} · Madhav`;
  const m = fx.MODES[fx.mode()], mine = GRADES.filter(g => m.grades.map(String).includes(String(g.id))), rest = GRADES.filter(g => !mine.includes(g) && g.id !== 'V');
  const card = g => { const st = gradeStats(g.id); return `<a class="mq-grade" href="#/grade/${g.id}"><span class="mq-grade-n">${gradeShort(g.id)}</span><span class="mq-grade-t"><b>${both(g.pro, g.kid)}</b><small>${g.band}</small></span><span class="mq-bar" role="progressbar" aria-label="Skills mastered" aria-valuemin="0" aria-valuemax="${st.total}" aria-valuenow="${st.done}" aria-valuetext="${st.done} of ${st.total} mastered"><i style="width:${pct(st.done / (st.total || 1))}%"></i></span></a>`; };
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs([null, 'Skill map'])}
    <span class="md-tag md-tag--sky">Skill map</span>
    <h1 class="md-heading">Pick a level</h1>
    <p class="md-lede">${SKILLS.length - TRICKS.length} skills from counting to calculus. Each has a picture-first lesson, endless practice and hints that teach the strategy. Fill every ring to level up.</p>
    <h2 class="mq-strand">Suggested for ${m.name}</h2><div class="mq-grades">${mine.map(card).join('')}</div>
    <h2 class="mq-strand">Speed tricks</h2><div class="mq-grades">${card(gradeOf('V'))}</div>
    <details class="mq-more"><summary>All other levels</summary><div class="mq-grades">${rest.map(card).join('')}</div></details>
  </div></section>`;
}

function gradeView(g) {
  const G = gradeOf(g); if (!G) return home();
  if (g !== 'V') store.setGrade(g);
  document.title = `${G.pro}: ${BRAND} · Madhav`;
  const list = skillsFor(g), st = gradeStats(g), strands = Object.keys(STRANDS).filter(k => list.some(s => s.strand === k));
  const idx = GRADES.findIndex(x => String(x.id) === String(g)), prev = GRADES[idx - 1], next = GRADES[idx + 1];
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs(['#/learn', 'Skill map'], [null, gradeLabel(g)])}
    <span class="md-tag md-tag--sky">${G.band}</span>
    <h1 class="md-heading">${gradeLabel(g)}</h1>
    <p class="md-lede">${both(`${st.done} of ${st.total} skills mastered. A skill is mastered after at least 8 problems with a score of 85% or more, weighted toward recent answers.`, `You have ${st.done} of ${st.total} skills. Fill every ring!`)}</p>
    <div class="mq-gradebar"><span class="mq-bar mq-bar--big"><i style="width:${pct(st.done / (st.total || 1))}%"></i></span><a class="md-btn md-btn--primary md-btn--sm" href="#/run/${g}">${icon('bolt')} Endless run</a><a class="md-btn md-btn--sm" href="#/mix/${g}">Endless practice</a></div>
    <p class="mq-small">Every skill here makes new questions forever. Endless practice mixes them with hints; Endless run gives you 3 lives and counts how far you get.</p>
    <div class="mq-gradejump">${prev ? `<a class="md-chip" href="#/grade/${prev.id}">&larr; ${both(prev.pro, prev.kid)}</a>` : ''}${next ? `<a class="md-chip" href="#/grade/${next.id}">${both(next.pro, next.kid)} &rarr;</a>` : ''}</div>
    ${strands.map(sd => { const S = STRANDS[sd]; return `<h2 class="mq-strand"><span class="mq-dot" style="background:var(--${S.color})"></span>${both(S.pro, S.kid)}</h2>
      <div class="mq-skills">${list.filter(s => s.strand === sd).map(s => { const [cls, lab] = status(s.id); return `<a class="mq-skill mq-${cls}" href="#/skill/${s.id}">${ring(store.mastery(s.id))}<span class="mq-skill-t"><b>${both(s.title, s.kid)}</b><small>${lab}${s.trick ? ' · ' + esc(TRICKS.find(t => t.id === s.trick).sutra) : ''}</small></span></a>`; }).join('')}</div>`; }).join('')}
  </div></section>`;
}

/* ---------- Skill: lesson plus practice ---------- */
function skillView(id, { signal } = {}) {
  const s = byId[id]; if (!s) return home();
  document.title = `${s.title}: ${BRAND} · Madhav`;
  const S = STRANDS[s.strand], trick = s.trick && TRICKS.find(t => t.id === s.trick);
  const back = trick ? ['#/dojo', 'Dojo'] : ['#/grade/' + s.grade, gradeLabel(s.grade)];
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs(back, [null, both(s.title, s.kid)])}
    <div class="mq-split">
      <article class="mq-lesson md-card">
        <span class="md-tag${S.color === 'sun' ? '' : ' md-tag--' + S.color}">${both(S.pro, S.kid)}</span>
        <h1 class="mq-h1">${both(s.title, s.kid)}</h1>
        ${trick ? `<p class="mq-sutra"><b lang="sa-Latn">${trick.sutra}</b><span>${trick.meaning}</span></p>` : ''}
        <p class="mq-idea">${s.idea}</p>
        <h2 class="mq-h3">How it works</h2>
        <ol class="mq-method">${(trick ? [trick.when] : s.method).map(m => `<li>${m}</li>`).join('')}</ol>
        ${trick ? starsHTML(trick) + animatorHTML(trick) : `<div class="mq-example" id="example"></div>`}
        ${videosFor(s, trick)}
      </article>
      <div class="mq-practice md-card" id="practice"></div>
    </div>
  </div></section>`;
  if (trick) mountAnimator(trick, signal); else showExample(s);
  fillWatch($('[data-watch-for]'), s, trick, signal);
  return practice($('#practice'), () => s, { signal });
}
/* "Watch it explained": a placeholder filled once the list loads (fillWatch), so the page never waits on it */
const videosFor = () => '<div class="watch-for" data-watch-for></div>';
/* Hand-matched picks first, whole-word keywords only when there are none (js/watch.js picksFor) */
function fillWatch(box, s, trick, signal) {
  if (!box) return;
  W.loadVideos().then(({ VIDEOS }) => {
    if (signal && signal.aborted) return;
    const words = (trick ? `${trick.title} ${trick.sutra} vedic` : `${s.title} ${s.strand}`).toLowerCase();
    const { how, picks } = W.picksFor(VIDEOS, { skill: trick ? null : s.id, trick: trick ? trick.id : null, mode: fx.mode() || 'challenger', words });
    if (!picks.length) return;
    box.dataset.how = how;
    box.innerHTML = `<h2 class="mq-h3">Watch it explained</h2><div class="rel-links">${picks.map(v => playBtn(v.yt, `${icon('play')}<span>${esc(v.title)}</span><small class="rel-ext">${mins(v.duration)}</small>`)).join('')}</div>`;
  }).catch(() => {});
}
const mins = d => (d < 60 ? `${d} s` : `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`);

function showExample(s) {
  const box = $('#example'); const p = s.gen(1);
  box.innerHTML = `<h2 class="mq-h3">Watch me do one</h2><div class="mq-q${plain(p.q).length > 60 ? ' long' : ''}">${p.q}</div>${p.viz ? `<div class="mq-viz">${p.viz}</div>` : ''}<ol class="mq-steps">${p.steps.map(x => `<li>${x}</li>`).join('')}</ol>${answerText(p, s) ? `<p class="mq-ans">Answer: <b>${answerText(p, s)}</b></p>` : ''}<button class="md-btn md-btn--sm" id="another">Another example</button>`;
  $('#another', box).onclick = () => showExample(s);
}
/* ---------- Practice engine ---------- */
/* Typed something that is not a plain number on an arithmetic skill: not a try, no Sparks */
const notAnswerMsg = () => fx.t({ explorer: 'Type just the answer, like 7.', challenger: 'Type just the answer, like 56 or 3/4.', pro: 'Type just the answer as a number, like 56 or 3/4.' });
const KEYS = { basic: ['/', '-', '.'], alg: ['x', '^', '(', ')', '/', '-', '√', 'π'], set: [',', '-', '/', '√'], ineq: ['x', '<', '>', '<=', '>=', '-'], complex: ['i', '+', '-'] };
/* One Practice session in root. signal: the view's. Each question runs under its own child signal, aborted by the next one. */
function practice(root, pickSkill, { mix = null, lives = 0, onOver = null, signal } = {}) {
  let s, p, tries = 0, hints = 0, done = false, right = 0, total = 0, run = 0, life = lives;
  const session = child(signal); let question = null;
  const explorer = fx.mode() === 'explorer';
  /* One Dial per Skill seen this session (Endless practice mixes Skills), starting at the Player's Skill Rating.
     It picks each question's generator level (AD.levelFor) and is saved as the Skill Rating every 10 answers and
     when the session ends (openspec ratings spec). Mastery is recorded as before. */
  const dials = new Map(), mode = fx.mode();
  const dialFor = id => { if (!dials.has(id)) dials.set(id, new AD.Dial(AD.skillRating(id, mode))); return dials.get(id); };
  const saveDial = id => { const d = dials.get(id); if (!d || d.n < 4) return; AD.saveRating('skill:' + id, d); dials.set(id, new AD.Dial(d.d)); };
  const next = () => {
    if (question) question.abort();
    question = child(session.signal);
    s = pickSkill(); const level = AD.levelFor(dialFor(s.id).lv); p = withPlain(s, s.gen(level)); tries = 0; hints = 0; done = false;
    // Explorer mode: no typing; small whole-number answers become big buttons
    if (explorer && p.kind === 'num' && Number.isInteger(p.answer) && p.answer >= 0 && p.answer <= 200) { const near = [...new Set([p.answer + 1, p.answer - 1, p.answer + 2, p.answer + 10, p.answer - 2].filter(v => v >= 0))]; p = { ...p, kind: 'choice', choices: [p.answer, ...shuffle(near).slice(0, 3)].sort((a, b) => a - b).map(String), answer: String(p.answer) }; }
    const keyset = p.kind === 'expr' ? KEYS.alg : p.kind === 'set' ? KEYS.set : p.kind === 'ineq' ? KEYS.ineq : p.kind === 'complex' ? KEYS.complex : p.kind === 'num' && !['K', 1, 2].includes(s.grade) ? KEYS.basic : null;
    root.innerHTML = `
      <div class="pr-head"><span class="pr-meter">${ring(store.mastery(s.id), 36)}<span><small>${mix ? `<a href="#/skill/${s.id}">${both(s.title, s.kid)}</a>` : 'Your turn'}</small><b id="prPct">${pct(store.mastery(s.id))}% mastery</b></span></span><span class="pr-run" id="prRun">${run >= 2 ? `<b>${run}</b> in a row` : ''}</span>${lives ? `<span class="pr-lives" role="img" aria-label="${life} lives left">${'<i class="on"></i>'.repeat(life)}${'<i></i>'.repeat(lives - life)}</span>` : ''}<span class="pr-score" role="img" aria-label="${right} of ${total} right this session">${right}/${total}</span></div>
      <div class="pr-q${plain(p.q).length > 60 ? ' long' : ''}" id="prQ" data-level="${level}">${p.q}</div>
      ${p.viz ? `<div class="mq-viz">${p.viz}</div>` : ''}
      <form class="pr-form" id="prForm" autocomplete="off">${answerUI(p)}${keyset ? `<div class="pr-keys" role="group" aria-label="Symbol keys">${keyset.map(k => `<button type="button" class="pr-key" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>` : ''}
        <div class="pr-actions"><button class="md-btn md-btn--primary" id="prCheck">Check</button><button type="button" class="md-btn md-btn--sm" id="prHint">Hint</button><button type="button" class="md-btn md-btn--sm" id="prShow">Show me</button>${'speechSynthesis' in window ? `<button type="button" class="md-btn md-btn--sm" id="prHear">${icon('speaker')} Hear it</button>` : ''}</div>
      </form>
      <div class="pr-say" id="prSay" role="status" aria-live="polite"></div>
      <div class="pr-sol" id="prSol" hidden></div>`;
    wire(question.signal); fx.speak(p.q);
    const first = root.querySelector('input, .pr-choice'); if (first && render.n > 1 && matchMedia('(pointer: fine)').matches) first.focus({ preventScroll: true });
  };
  const say = (html, tone = '') => { const b = $('#prSay', root); b.className = 'pr-say ' + tone; b.innerHTML = html ? `${boltFor(tone)}<div class="md-bubble">${html}</div>` : ''; };
  const reveal = () => { const sol = $('#prSol', root); sol.hidden = false; sol.innerHTML = `<h3>Here is how</h3><ol class="mq-steps">${p.steps.map(x => `<li>${x}</li>`).join('')}</ol><p class="mq-ans">Answer: <b>${answerText(p, s)}</b></p>`; };
  const finish = ok => {
    done = true; total++; if (ok) right++; run = ok && tries === 1 && !hints ? run + 1 : 0;
    const r = store.record(s.id, ok, hints > 0 || tries > 1);
    /* For the Rating, only a first try with no hint counts as right */
    const dial = dialFor(s.id); dial.hit(ok && tries === 1 && !hints); if (dial.n >= 10) saveDial(s.id);
    metrics.answered(lives ? 'run' : 'practice', ok); /* untimed play only: no per-answer events in timed rounds */
    if (r.justMastered) track('mastered/' + s.id, 'Mastered: ' + s.title);
    if (run === 3 || run === 7 || (run && run % 10 === 0)) fx.confetti(40);
    $('#prPct', root).textContent = `${pct(store.mastery(s.id))}% mastery`; root.querySelector('.pr-meter .ring').outerHTML = ring(store.mastery(s.id), 36);
    const sc = root.querySelector('.pr-score'); sc.textContent = `${right}/${total}`; sc.setAttribute('aria-label', `${right} of ${total} right this session`); $('#prRun', root).innerHTML = run >= 2 ? `<b>${run}</b> in a row` : '';
    const btn = $('#prCheck', root); btn.textContent = 'Next'; btn.dataset.next = '1';
    root.querySelectorAll('#prHint, #prShow').forEach(b => (b.hidden = true));
    btn.focus({ preventScroll: true });
  };
  const PRAISE = { explorer: ['Yay! You got it!', 'Super star!', 'Woohoo! Correct!', 'You are so smart!'], challenger: ['Correct!', 'Nailed it!', 'Boom! First try.', 'Lightning fast!'], pro: ['Correct.', 'Exactly right.', 'Clean.', 'Correct, first try.'] };
  /* Symbol keys and the "Want a hint?" link: one delegated handler for the whole session */
  on(root, 'click', e => {
    const k = e.target.closest('.pr-key'); if (k) { fx.sfx('tap'); const inp = root.querySelector('.ans-in:focus') || root.querySelector('.ans-in'); if (inp) { const v = k.dataset.k, a = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, a) + v + inp.value.slice(inp.selectionEnd ?? a); inp.focus(); inp.setSelectionRange(a + v.length, a + v.length); } return; }
    if (e.target.closest('[data-hint]')) { e.preventDefault(); $('#prHint', root).click(); }
  }, session.signal);
  /* Per-question handlers, on the question's signal */
  const wire = qs => {
    on($('#prForm', root), 'submit', e => {
      e.preventDefault();
      if ($('#prCheck', root).dataset.next) { fx.sfx('tap'); return next(); }
      const res = grade(); if (res.empty) { say('Type an answer first.'); return; }
      if (res.notAnswer) { say(notAnswerMsg()); return; }
      tries++;
      if (res.ok) { fx.sfx('ok'); const first = tries === 1 && !hints; const msg = first ? pick(PRAISE[fx.mode()] || PRAISE.challenger) : 'You got it!'; say(msg + (first ? ` <span class="pr-sparks">+${10 + Math.min(store.skill(s.id).streak + 1, 5)} Sparks</span>` : ''), 'ok'); if (explorer) fx.speak(msg, true); finish(true); return; }
      fx.sfx('no');
      if (lives) { life--; reveal(); say(life ? `Oops! ${life} ${life === 1 ? 'life' : 'lives'} left. See how it works, then keep going.` : 'Out of lives!', 'no'); finish(false); const lv = root.querySelector('.pr-lives'); lv.innerHTML = '<i class="on"></i>'.repeat(life) + '<i></i>'.repeat(lives - life); lv.setAttribute('aria-label', `${life} lives left`); if (!life && onOver) { const b = $('#prCheck', root); b.textContent = 'See my score'; b.onclick = e => { e.preventDefault(); onOver(right); }; } return; }
      if (tries === 1) { say((res.msg ? res.msg + ' ' : '') + 'Not quite. Try once more.' + (p.hints[0] && !hints ? ' <button type="button" class="linkbtn" data-hint>Want a hint?</button>' : ''), 'no'); if (explorer) fx.speak('Not quite. Try again!', true); }
      else if (tries === 2) { hints = Math.max(hints, 1); say((res.msg ? res.msg + ' ' : '') + `Hint: ${p.hints[Math.min(1, p.hints.length - 1)] || p.hints[0]}`, 'no'); if (explorer) fx.speak(p.hints[0], true); }
      else { reveal(); say('That one was tricky. See how it works, then try the next one.', 'no'); finish(false); }
    }, qs);
    on($('#prHint', root), 'click', () => { if (done) return; const h = p.hints[Math.min(hints, p.hints.length - 1)]; hints++; say(`Hint: ${h}`); if (explorer) fx.speak(h, true); }, qs);
    on($('#prShow', root), 'click', () => { if (done) return; tries = Math.max(tries, 3); reveal(); say('Read the steps, then try the next one.'); finish(false); }, qs);
    const hear = $('#prHear', root); if (hear) on(hear, 'click', () => fx.speak(p.q, true), qs);
    root.querySelectorAll('.pr-choice').forEach(b => on(b, 'click', () => { if (done) return; root.querySelectorAll('.pr-choice').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); $('#prForm', root).requestSubmit(); }, qs));
  };
  const grade = () => {
    if (p.kind === 'choice') { const c = root.querySelector('.pr-choice[aria-pressed="true"]'); if (!c) return { empty: true }; return { ok: c.dataset.v === p.answer }; }
    if (p.kind === 'fields') { const ins = [...root.querySelectorAll('.ans-in')]; if (ins.some(i => !i.value.trim())) return { empty: true }; const rs = ins.map((i, k) => checkOne({ kind: 'num', answer: p.fields[k].answer, tol: p.tol }, i.value)); return { ok: rs.every(r => r.ok), msg: rs.find(r => r.msg)?.msg }; }
    return checkOne(p, root.querySelector('.ans-in').value);
  };
  next();
  return { destroy: () => { [...dials.keys()].forEach(saveDial); session.abort(); } };
}
function answerUI(p) {
  if (p.kind === 'choice') return `<div class="pr-choices" role="group" aria-label="Choices">${p.choices.map(c => `<button type="button" class="md-chip pr-choice" aria-pressed="false" data-v="${esc(c)}">${c}</button>`).join('')}</div>`;
  if (p.kind === 'fields') return `<div class="pr-fields">${p.fields.map(f => `<label>${f.label}<input class="ans-in" inputmode="text" spellcheck="false"></label>`).join('')}</div>`;
  const ph = { num: 'Your answer', expr: 'e.g. 3x^2 - 2x + 1', set: 'e.g. 2, -5', ineq: 'e.g. x < 4', complex: 'e.g. 3 + 2i', text: 'Your answer' }[p.kind] || 'Your answer';
  return `<div class="pr-in"><input class="ans-in" aria-label="Your answer" placeholder="${ph}" spellcheck="false" autocapitalize="off" inputmode="${p.kind === 'num' && Number.isInteger(p.answer) && p.answer >= 0 && !p.simplest ? 'numeric' : 'text'}">${p.unit ? `<span class="pr-unit">${p.unit}</span>` : ''}</div>`;
}

function mixView(g, isRun = false, { signal } = {}) {
  const G = gradeOf(g); if (!G) return home();
  document.title = `${isRun ? 'Endless run' : 'Endless practice'}, ${G.pro}: ${BRAND} · Madhav`;
  const list = skillsFor(g);
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap mq-narrow">
    ${crumbs(['#/grade/' + g, gradeLabel(g)], [null, isRun ? 'Endless run' : 'Endless practice'])}
    <h1 class="md-heading">${isRun ? 'Endless run' : 'Endless practice'}: ${gradeLabel(g)}</h1>
    <p class="md-lede">${isRun ? `Questions from every skill in this level, forever. You have 3 lives: how far can you go? Your best: <b>${store.best('run-' + g)}</b>.` : 'Questions from the whole level, all mixed up and never-ending, favoring skills in progress. Mixing topics is harder, and that is exactly why it makes learning stick.'}</p>
    <div class="mq-practice md-card" id="practice"></div></div></section>`;
  let lastId = null;
  return practice($('#practice'), () => {
    const going = list.filter(s => store.started(s.id) && !store.mastered(s.id)), pool = (going.length >= 2 && Math.random() < .7 ? going : list).filter(s => s.id !== lastId);
    const s = pick(pool.length ? pool : list); lastId = s.id; return s;
  }, { mix: true, lives: isRun ? 3 : 0, onOver: right => {
    store.bump('runs'); const isBest = store.setBest('run-' + g, right), sp = 10 + right * 3; store.addSparks(sp, 'run'); if (isBest && right) fx.confetti(90);
    $('#practice').innerHTML = `<div class="ar-result"><div class="md-stat"><div class="md-kicker">You reached</div><div class="md-value">${right}</div><p>${isBest && right ? 'New best run!' : `Best: ${store.best('run-' + g)}`} <span class="fx-sparks">+${sp} Sparks</span></p></div></div><p><button class="md-btn md-btn--primary" id="again">${icon('bolt')} Run again</button> <a class="md-btn" href="#/grade/${g}">Back to ${gradeLabel(g)}</a></p>`;
    $('#again').onclick = () => mount(ctx => mixView(g, true, ctx));
  }, signal });
}

/* ---------- Dojo: belts of speed tricks ---------- */
function dojoView() {
  document.title = `Vedic Dojo: ${BRAND} · Madhav`;
  const bp = gm.beltProgress(), earned = bp.filter(b => b.earned).length;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs([null, 'Dojo'])}
    <span class="md-tag md-tag--plum">Vedic Dojo</span>
    <h1 class="md-heading">From white belt to <span class="hl-word">black belt</span></h1>
    <p class="md-lede">${TRICKS.length} speed tricks from the sutras in Bharati Krishna Tirtha's 1965 book, in seven belts. Each trick has three Stars. Light all 9 Stars of a belt's three tricks to earn it. Each trick also has a step-by-step animator, endless practice and <b>${LV.KATAS_PER_TRICK} katas</b>: numbered drills that get harder, ${LV.KATA_COUNT.toLocaleString('en-US')} in all. Finish one to open the next.</p>
    <p class="mq-small">${store.katasDoneWhere('k:')} of ${LV.KATA_COUNT.toLocaleString('en-US')} katas done</p>
    ${playShelf('dojo', 'Play with the tricks')}
    <div class="belt-row">${bp.map(b => `<span class="belt-chip${b.earned ? ' on' : ''}" style="--belt:${b.color}"><span class="belt-knot" aria-hidden="true"></span>${b.name}</span>`).join('')}</div>
    <p class="mq-small">${earned} of ${BELTS.length} belts earned.</p>
    <div class="dojo-path">${bp.map((b, i) => `<section class="dojo-belt${b.earned ? ' earned' : ''}">
      <h2 class="dojo-h"><span class="belt-swatch" style="--belt:${b.color}" aria-hidden="true"></span>${b.name}<small>${b.lit}/${gm.STARS_PER_BELT} Stars</small></h2>
      <div class="dojo-nodes">${b.tricks.map(id => { const t = TRICKS.find(x => x.id === id), sid = 'v-' + id, [cls, lab] = status(sid); return `<div class="dojo-cell"><a class="dojo-node mq-${cls}" href="#/skill/${sid}">${ring(store.mastery(sid), 52)}<span><b>${t.title}</b><small lang="sa-Latn">${t.sutra}</small><em>${lab}</em></span></a><a class="dojo-katas" href="#/katas/${id}">${icon('belt')} Katas ${store.katasDoneWhere(`k:${id}:`)}/${LV.KATAS_PER_TRICK} done</a>${dojoStars(t)}</div>`; }).join('')}</div></section>`).join('')}</div>
    <p class="mq-cta"><a class="md-btn" href="#/sutras">Read about all 29 sutras</a> <a class="md-btn" href="#/arena">Test your speed in the Arena</a></p>
  </div></section>`;
}

/* ---------- Numbered levels: shared map ---------- */
/* Medals (game Levels and tower challenges): 1 bronze, 2 silver, 3 gold. Always named in text, never stars. */
const MEDALS = ['none', 'bronze', 'silver', 'gold'];
const medalName = n => (n ? `${MEDALS[n]} Medal` : 'no Medal yet');
const cap = t => t[0].toUpperCase() + t.slice(1);
/* A disc in the Medal's colour with its name in it (its first letter on a map node, whose label says it in full) */
const medalHTML = (n, { label = true } = {}) => `<span class="medal medal--${MEDALS[n] || 'none'}${label ? '' : ' medal--sm'}"${label ? ` role="img" aria-label="${cap(medalName(n))}"` : ' aria-hidden="true"'}>${n ? (label ? cap(MEDALS[n]) : MEDALS[n][0].toUpperCase()) : ''}</span>`;
const medalCounts = c => `${c.any} cleared · ${c.gold} gold`;
/* resultOf(n) is { done } for a Kata or { medal } for a game Level or tower challenge. The next one opens when
   this one is done or has a Medal (the old "any star" rule). */
function levelMap(count, resultOf, hrefOf, { openAll = false, perRow = 0, isOpen = null, suggest = 0, noun = 'Level' } = {}) {
  let unlocked = true, flagged = false;
  return `<div class="lv-map${perRow ? ' lv-map--rows' : ''}">${Array.from({ length: count }, (_, i) => {
    const n = i + 1, res = resultOf(n), cleared = 'medal' in res ? res.medal > 0 : !!res.done, open = openAll || (isOpen ? isOpen(n) : unlocked); unlocked = cleared;
    const next = suggest ? n === suggest : open && !cleared && !flagged; if (next) flagged = true;
    const said = 'medal' in res ? (res.medal ? `, ${medalName(res.medal)}` : '') : (res.done ? ', done' : '');
    const mark = 'medal' in res ? medalHTML(res.medal, { label: false }) : `<span class="kata-mark${res.done ? ' on' : ''}" aria-hidden="true">${res.done ? '&#10003;' : ''}</span>`;
    return open ? `<a class="lv-node${cleared ? ' done' : ''}${next ? ' next' : ''}" href="${hrefOf(n)}" aria-label="${noun} ${n}${said}"><b>${n}</b>${mark}</a>` : `<span class="lv-node locked" role="img" aria-label="${noun} ${n}, locked"><b>${n}</b>${icon('lock')}</span>`;
  }).join('')}</div>`;
}
/* A finished Kata ({ done }) or game Level or tower challenge ({ medal }); noClock: played without the clock in Calm,
   where Medals measured against the clock are not given */
function resultHTML(res, lines, nextHref, retryHref, backHref, backLabel) {
  const kata = !('medal' in res), cleared = kata ? res.done : res.medal > 0;
  const head = kata ? (res.done ? 'Kata done!' : 'Not quite. Try again!') : res.noClock ? 'Round done' : ['Not quite. Try again!', 'Bronze Medal', 'Silver Medal', 'Gold Medal!'][res.medal];
  const big = kata ? `<span class="kata-mark kata-mark--big${res.done ? ' on' : ''}" aria-hidden="true">${res.done ? '&#10003;' : ''}</span>` : medalHTML(res.medal);
  return `<div class="lv-result"><div class="lv-big">${big}</div><h2 class="mq-h3">${head}</h2>${lines.map(l => `<p>${l}</p>`).join('')}
    <p class="lv-acts">${cleared && nextHref ? `<a class="md-btn md-btn--primary" href="${nextHref}">${icon('bolt')} Next level</a>` : ''}<a class="md-btn" href="${retryHref}" data-retry>Play again</a><a class="md-btn" href="${backHref}">${backLabel}</a></p></div>`;
}
const goalsText = (targets, unit) => `Bronze ${targets[0].toLocaleString('en-US')} · Silver ${targets[1].toLocaleString('en-US')} · Gold ${targets[2].toLocaleString('en-US')} ${unit}`;

/* ---------- Dojo katas ---------- */
function katasView(trickId) {
  const t = TRICKS.find(x => x.id === trickId); if (!t) return dojoView();
  document.title = `${t.title} katas: ${BRAND} · Madhav`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs(['#/dojo', 'Dojo'], [null, `${t.title}: katas`])}
    <span class="md-tag md-tag--plum">${t.sutra}</span>
    <h1 class="md-heading">${t.title}: ${LV.KATAS_PER_TRICK} katas</h1>
    <p class="md-lede">Each kata is a short drill of 5 to 8 problems that gets harder as you climb: bigger numbers, new bases, trickier cases. Get at least 60% right to finish one and unlock the next.</p>
    <p class="mq-small">${store.katasDoneWhere(`k:${trickId}:`)} of ${LV.KATAS_PER_TRICK} done · <a href="#/skill/v-${trickId}">Learn the trick first</a></p>
    ${levelMap(LV.KATAS_PER_TRICK, n => ({ done: store.kataDone(LV.kataKey(trickId, n)) }), n => `#/kata/${trickId}/${n}`, { noun: 'Kata' })}
  </div></section>`;
}
function kataView(trickId, n, { signal } = {}) {
  const t = TRICKS.find(x => x.id === trickId); if (!t || n < 1 || n > LV.KATAS_PER_TRICK) return dojoView();
  if (n > 1 && !store.kataDone(LV.kataKey(trickId, n - 1))) { location.replace(`#/katas/${trickId}`); return; }
  const K = LV.kata(trickId, n);
  document.title = `Kata ${n}: ${t.title} · ${BRAND}`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap mq-narrow">
    ${crumbs(['#/dojo', 'Dojo'], [`#/katas/${trickId}`, t.title], [null, `Kata ${n}`])}
    <h1 class="md-heading">Kata ${n} <small class="kata-of">of ${LV.KATAS_PER_TRICK}</small></h1>
    <p class="md-lede">${K.problems.length} problems · par time ${K.par} seconds · ${t.when}</p>
    <div class="md-card mq-practice" id="kata"></div></div></section>`;
  const box = $('#kata'); let i = 0, right = 0, hints = 0, tried = false, question = null; const t0 = performance.now();
  const show = () => {
    if (question) question.abort();
    question = child(signal); const qs = question.signal; /* this problem's handlers */
    const p = K.problems[i];
    box.innerHTML = `<div class="pr-head"><span class="kata-prog">${K.problems.map((_, j) => `<i class="${j < i ? 'past' : j === i ? 'cur' : ''}"></i>`).join('')}</span><span class="pr-score">${right}/${K.problems.length}</span></div>
      <div class="pr-q${plain(p.q).length > 60 ? ' long' : ''}">${p.q}</div>
      <form class="pr-form" id="kForm" autocomplete="off">${answerUI(p)}<div class="pr-actions"><button class="md-btn md-btn--primary" id="kGo">Check</button><button type="button" class="md-btn md-btn--sm" id="kHint">Hint</button></div></form>
      <div class="pr-say" id="kSay" role="status" aria-live="polite"></div>`;
    tried = false; fx.speak(p.q);
    const f = box.querySelector('input, .pr-choice'); if (f && matchMedia('(pointer: fine)').matches) f.focus({ preventScroll: true });
    box.querySelectorAll('.pr-choice').forEach(b => on(b, 'click', () => { box.querySelectorAll('.pr-choice').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); $('#kForm').requestSubmit(); }, qs));
    on($('#kHint'), 'click', () => { hints++; $('#kSay').innerHTML = `${boltHTML('explain')}<div class="md-bubble">Hint: ${p.hints[0] || p.steps[0]}</div>`; }, qs);
    on($('#kForm'), 'submit', e => {
      e.preventDefault();
      if (tried) { i++; return i < K.problems.length ? show() : done(); }
      let ok;
      if (p.kind === 'choice') { const c = box.querySelector('.pr-choice[aria-pressed="true"]'); if (!c) return; ok = c.dataset.v === p.answer; }
      else if (p.kind === 'fields') { const ins = [...box.querySelectorAll('.ans-in')]; if (ins.some(x => !x.value.trim())) return; ok = ins.every((x, k) => checkOne({ kind: 'num', answer: p.fields[k].answer }, x.value).ok); }
      else { const v = box.querySelector('.ans-in').value; if (!v.trim()) return; const res = checkOne(p, v); if (res.notAnswer) { $('#kSay').className = 'pr-say'; $('#kSay').innerHTML = `${boltFor('')}<div class="md-bubble">${notAnswerMsg()}</div>`; return; } ok = res.ok; }
      tried = true; if (ok) right++; fx.sfx(ok ? 'ok' : 'no'); metrics.answered('kata', ok);
      $('#kSay').className = 'pr-say ' + (ok ? 'ok' : 'no');
      $('#kSay').innerHTML = `${boltFor(ok ? 'ok' : 'no')}<div class="md-bubble">${ok ? pick(['Correct!', 'Clean!', 'Nailed it!', 'Yes!']) : `Not this time. Answer: <b>${answerText(p, byId['v-' + trickId])}</b><br><small>${p.steps.slice(0, 3).join(' ')}</small>`}</div>`;
      $('#kGo').textContent = i + 1 < K.problems.length ? 'Next' : 'Finish'; $('#kGo').focus({ preventScroll: true });
      box.querySelector('.pr-score').textContent = `${right}/${K.problems.length}`;
    }, qs);
  };
  const done = () => {
    question.abort();
    const secs = Math.round((performance.now() - t0) / 1000), done = LV.kataDoneFor(right, K.problems.length), key = LV.kataKey(trickId, n), first = done && store.setKataDone(key);
    const sp = LV.kataSparks(right, K.problems.length); if (sp) store.addSparks(sp, 'kata'); store.bump('katas'); store.touchDay(); track('kata/' + trickId, 'Kata ' + n);
    if (done) fx.confetti(right === K.problems.length ? 90 : 40);
    box.innerHTML = resultHTML({ done }, [`${right} of ${K.problems.length} right in ${secs} seconds${hints ? `, ${hints} hint${hints > 1 ? 's' : ''}` : ''}.`, `<span class="fx-sparks">+${sp} Sparks</span>${first ? ` Kata ${n} is done.` : ''}`], n < LV.KATAS_PER_TRICK ? `#/kata/${trickId}/${n + 1}` : null, `#/kata/${trickId}/${n}`, `#/katas/${trickId}`, 'All katas');
    const rt = box.querySelector('[data-retry]'); if (rt) rt.onclick = e => { e.preventDefault(); mount(ctx => kataView(trickId, n, ctx)); };
  };
  show();
}

/* ---------- Stars (openspec star-round): three per Trick, on Trick pages and in the Dojo, not in Explorer ---------- */
const STAR_WORD = { lit: 'Lit', skipped: 'Skipped', open: 'Open' };
function starsHTML(t) {
  if (fx.mode() === 'explorer') return '';
  return `<div class="star-row"><h2 class="mq-h3">Stars</h2><p class="mq-small">Four questions each. A miss shows the trick on your numbers, and fixing it pays more.</p><div class="star-links">${[1, 2, 3].map(n => { const s = store.starState(t.id, n); return `<a class="star-link star-link--${s}" href="#/star/${t.id}/${n}">${icon('star')}<b>Star ${n}</b><small>${STAR_WORD[s]}</small></a>`; }).join('')}</div></div>`;
}
const dojoStars = t => (fx.mode() === 'explorer' ? '' : `<span class="dojo-stars">${[1, 2, 3].map(n => { const s = store.starState(t.id, n); return `<a class="dojo-star dojo-star--${s}" href="#/star/${t.id}/${n}" aria-label="${t.title}: Star ${n}, ${STAR_WORD[s].toLowerCase()}">${icon('star')}${n}</a>`; }).join('')}</span>`);
function starView(trick, n, { signal } = {}, back = null) {
  const t = TRICKS.find(x => x.id === trick); if (!t || !(n >= 1 && n <= 3)) return dojoView();
  const from = render.from || '';
  /* For a Player whose home is the Sky, Back always goes to the Sky (which then focuses this Star) */
  back = back || (SKY.skyOn(store.player()) ? { href: '#/', label: 'Back to the Sky' } : from === '#/skill/v-' + trick ? { href: from, label: `Back to ${t.title}` } : { href: '#/dojo', label: 'Back to the Dojo' });
  document.title = `Star ${n}: ${t.title} · ${BRAND}`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs(['#/dojo', 'Dojo'], ['#/skill/v-' + trick, t.title], [null, `Star ${n}`])}</div></section>`;
  /* The round plays in the full-screen shell (openspec game-shell-and-calm); Back leaves the Star */
  const play = openShell(`Star ${n}: ${t.title}`, { signal, exit: 'Back', exitId: 'stExit', onExit: () => { location.hash = back.href; } });
  play.area.id = 'star';
  return runStar(play.area, { trick, star: n, signal, back, again: () => mount(ctx => starView(trick, n, ctx, back)), findVideo: starVideo });
}
/* star-round's findVideo seam: the Trick's hand-matched video (null offline or when the list fails to load), opened
   in the in-page player. open(opener) resolves when the player closes. */
async function starVideo(trick, mode) {
  const v = await W.videoForTrick(trick, mode);
  return v && { title: v.title, src: W.embedSrc(v), open: opener => { store.bump('watched'); track('watch/' + v.kind, 'Watch: ' + v.title); return new Promise(done => openPlayer(v, opener, done)); } };
}

/* ---------- Arena challenge tower ---------- */
function towerView() {
  document.title = `Challenge tower: ${BRAND} · Madhav`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs(['#/arena', 'Arena'], [null, 'Challenge tower'])}
    <span class="md-tag md-tag--coral">Challenge tower</span>
    <h1 class="md-heading">${LV.CHALLENGE_COUNT.toLocaleString('en-US')} Arena challenges</h1>
    <p class="md-lede">${LV.TOPICS.length} chapters, ${LV.PER_CHAPTER} challenges each, in five formats: Sprint, Sharpshooter, Survival, Time attack and Boss rounds. Pick any chapter; inside a chapter, clear each challenge to unlock the next.</p>
    <p class="mq-small">${store.medalsWhere('a:').any} of ${LV.CHALLENGE_COUNT} cleared · ${store.medalsWhere('a:').gold} gold</p>
    <div class="tower">${LV.TOPICS.map((tp, c) => { const lo = c * LV.PER_CHAPTER + 1, ms = Array.from({ length: LV.PER_CHAPTER }, (_, k) => store.medal(LV.challengeKey(lo + k))), done = ms.filter(Boolean).length, gold = ms.filter(v => v === 3).length;
      return `<a class="tower-ch${done === LV.PER_CHAPTER ? ' done' : ''}" href="#/tower/${c + 1}"><span class="tower-n">${c + 1}</span><span class="tower-t"><b>${tp.name}</b><small>Challenges ${lo} to ${lo + LV.PER_CHAPTER - 1}</small><span class="mq-bar"><i style="width:${pct(done / LV.PER_CHAPTER)}%"></i></span></span><span class="medal-n">${gold} gold</span></a>`; }).join('')}</div>
  </div></section>`;
}
function chapterView(c) {
  const tp = LV.TOPICS[c - 1]; if (!tp) return towerView();
  const lo = (c - 1) * LV.PER_CHAPTER;
  document.title = `${tp.name}: Challenge tower · ${BRAND}`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs(['#/arena', 'Arena'], ['#/tower', 'Challenge tower'], [null, `Chapter ${c}`])}
    <span class="md-tag md-tag--coral">Chapter ${c} of ${LV.TOPICS.length}</span>
    <h1 class="md-heading">${tp.name}</h1>
    <div class="fmt-legend">${Object.values(LV.FORMATS).map(f => `<span><b>${f.name}</b> ${f.how}</span>`).join('')}</div>
    ${levelMap(LV.PER_CHAPTER, n => ({ medal: store.medal(LV.challengeKey(lo + n)) }), n => `#/challenge/${lo + n}`)}
    <p class="mq-cta">${c > 1 ? `<a class="md-btn" href="#/tower/${c - 1}">&larr; Chapter ${c - 1}</a>` : ''}${c < LV.TOPICS.length ? `<a class="md-btn" href="#/tower/${c + 1}">Chapter ${c + 1} &rarr;</a>` : ''}</p>
  </div></section>`;
}
function challengeView(id, { signal } = {}) {
  if (id < 1 || id > LV.CHALLENGE_COUNT) return towerView();
  const ch = LV.challenge(id), chapterStart = ch.chapter * LV.PER_CHAPTER + 1;
  if (id > chapterStart && !store.medal(LV.challengeKey(id - 1))) { location.replace(`#/tower/${ch.chapter + 1}`); return; }
  const F = LV.FORMATS[ch.format], goalText = ch.goal === 'seconds' ? `Finish ${ch.total} with at least ${Math.ceil(ch.total * .8)} right. Medals: ${goalsText(ch.targets, 'seconds or faster')}.` : `Medals: ${goalsText(ch.targets, ch.goal)}.`;
  document.title = `Challenge ${id}: ${BRAND}`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap mq-narrow">
    ${crumbs(['#/tower', 'Challenge tower'], [`#/tower/${ch.chapter + 1}`, ch.topic.name], [null, `Challenge ${id}`])}
    <span class="md-tag md-tag--coral">${F.name}</span>
    <h1 class="md-heading">Challenge ${id}</h1>
    <p class="md-lede">${ch.topic.name}. ${F.how} ${ch.secs ? `${ch.secs} seconds.` : ''}${ch.total ? ` ${ch.total} questions.` : ''}${ch.lives ? ` ${ch.lives} lives.` : ''} ${goalText}</p>
    <div class="md-card ar-shell" id="chShell"><p class="lv-best">Your best: ${medalHTML(store.medal(LV.challengeKey(id)))}</p><button class="md-btn md-btn--primary ar-go" id="chGo">${icon('bolt')} Start</button></div></div></section>`;
  /* The countdown, the round and its result play in the full-screen shell; Stop or Back closes it and focus
     returns to Start. run: this round's controller (the shell closes when it aborts). */
  let run = null, play = null;
  const stop = () => { const r = run, p = play; run = play = null; if (p) p.close(); if (r) r.abort(); };
  $('#chGo').onclick = () => {
    stop(); run = child(signal);
    play = openShell(`Challenge ${id}: ${F.name}`, { signal: run.signal, exitId: 'chStop', onExit: stop, focusBack: () => $('#chGo') });
    const area = play.area;
    let n = 3; area.innerHTML = `<div class="ar-count" aria-live="assertive">${n}</div>`; fx.sfx('tick');
    const count = child(run.signal); /* the countdown stops when it reaches 0, on Stop or when the view is left */
    every(() => { n--; if (n === 0) { count.abort(); fx.sfx('ok'); go(area, run.signal); } else { area.firstChild.textContent = n; fx.sfx('tick'); } }, 650, count.signal);
  };
  const go = (area, rsig) => {
    track('challenge/' + ch.format, 'Challenge ' + id); metrics.roundStart('tower');
    /* Calm: the tower is Practice, so no clock. Sprint and Time attack Medals are measured against the clock. */
    const untimed = fx.calmOn(), clockMedal = ch.format === 'sprint' || ch.format === 'timeattack';
    runChallenge(area, ch, LV.challengeSet(ch), { tap: fx.mode() === 'explorer', signal: rsig, untimed, onEnd: r => {
      metrics.roundEnd('tower', fx.MODES[fx.mode()].league);
      const noClock = r.untimed && clockMedal;
      const medal = noClock ? 0 : LV.challengeMedal(ch, r), improved = store.setMedal(LV.challengeKey(id), medal), sp = medal * 15 + r.right * 2;
      if (sp) store.addSparks(sp, 'challenge'); store.bump('arena'); store.touchDay(); if (medal === 3) fx.confetti(100); else if (medal) fx.confetti(40);
      const nextId = id % LV.PER_CHAPTER ? id + 1 : null;
      area.innerHTML = resultHTML({ medal, noClock }, [`${r.right} right, ${r.wrong} missed${ch.goal === 'points' ? `, ${r.score} points` : ''}${ch.goal === 'seconds' && !noClock ? `, ${r.secs} seconds` : ''}.`, `<span class="fx-sparks">+${sp} Sparks</span>${improved ? ' New best.' : ''}`, ...(noClock ? [`<span class="lv-noclock">Medals for ${F.name} need the clock. Turn Calm off to play for one.</span>`] : [])], nextId ? `#/challenge/${nextId}` : `#/tower/${ch.chapter + 2 <= LV.TOPICS.length ? ch.chapter + 2 : 1}`, `#/challenge/${id}`, `#/tower/${ch.chapter + 1}`, 'Chapter map');
      const rt = area.querySelector('[data-retry]'); if (rt) rt.onclick = e => { e.preventDefault(); mount(ctx => challengeView(id, ctx)); };
      if (play) play.setExit('Back');
      const h = area.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    } });
  };
}

/* ---------- Sutras: deep dive and card collection ---------- */
const sutraId = (c, sub) => (sub ? 'u' : 's') + c.n;
const ALL_SUTRAS = [...SUTRAS.map(c => ({ ...c, sub: false, id: 's' + c.n })), ...SUBSUTRAS.map(c => ({ ...c, sub: true, id: 'u' + c.n }))];
function sutrasView() {
  document.title = `The sutras: ${BRAND} · Madhav`;
  store.markSeen('sutras');
  const got = ALL_SUTRAS.filter(gm.collectedCard).length;
  const card = c => { const have = gm.collectedCard(c); return `<article class="sutra-card${have ? ' got' : ''}" data-id="${c.id}" data-name="${esc(c.name)}">
    <button class="sutra-face" aria-expanded="false" aria-label="${esc(c.name)}: ${esc(c.meaning)}. Flip card"><span class="sutra-n">${c.sub ? 'Sub-sutra' : 'Sutra'} ${c.n}</span><b lang="sa-Latn">${c.name}</b><i>${c.meaning}</i>${have ? '<span class="sutra-got">Collected</span>' : '<span class="sutra-tap">Tap to flip</span>'}</button>
    <div class="sutra-back"><span>${c.plain}</span>${c.example ? `<code>${c.example}</code>` : ''}
      <span class="sutra-acts"><a class="sutra-more" href="#/sutras/${c.id}">Learn more ${icon('play')}</a><button type="button" class="sutra-flipback" aria-label="Flip back">${icon('loop')}</button></span></div></article>`; };
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs([null, 'Sutras'])}
    <span class="md-tag md-tag--plum">Deep dive</span>
    <h1 class="md-heading">The 16 sutras and 13 sub-sutras</h1>
    <p class="md-lede">Each sutra is a short word formula that packs a whole method into a phrase. Flip a card for the short version, then open <b>Learn more</b> for the full story: animated diagrams, why it works, worked examples and further reading. You have collected <b>${got} of ${ALL_SUTRAS.length}</b>.</p>
    <div class="mq-bar mq-bar--big sutra-bar"><i style="width:${pct(got / ALL_SUTRAS.length)}%"></i></div>
    ${playShelf('sutras', 'A mystery from the old texts')}
    <div class="md-card history"><h2 class="mq-h3">Where Vedic math comes from</h2>${HISTORY.map(h => `<p>${h}</p>`).join('')}
      <p class="mq-small" data-history-links hidden></p></div>
    <div class="md-card history roots"><h2 class="mq-h3">Older roots: what you see in the background</h2><p>The 1965 sutras stand on a much older tradition of Indian mathematics. The moving background draws real pieces of it.</p><ul>${BG_NOTES.map(([h, b]) => `<li><b>${h}.</b> ${b}</li>`).join('')}</ul></div>
    <h2 class="mq-strand">The 16 sutras</h2><div class="sutra-grid">${ALL_SUTRAS.filter(c => !c.sub).map(card).join('')}</div>
    <h2 class="mq-strand">The 13 sub-sutras</h2><div class="sutra-grid">${ALL_SUTRAS.filter(c => c.sub).map(card).join('')}</div>
  </div></section>`;
  const flip = (art, open) => { art.classList.toggle('flipped', open); art.querySelector('.sutra-face').setAttribute('aria-expanded', String(open)); fx.sfx('tap'); if (open) { collect(art.dataset.name); art.classList.add('got'); art.querySelector('.sutra-more').focus({ preventScroll: true }); } else art.querySelector('.sutra-face').focus({ preventScroll: true }); };
  view.querySelectorAll('.sutra-card').forEach(art => { art.querySelector('.sutra-face').onclick = () => flip(art, true); art.querySelector('.sutra-flipback').onclick = () => flip(art, false); });
  // Outside reading on where the sutras come from, critiques included: Pro only
  if (linksOut()) W.loadVideos().then(({ LINKS }) => { const p = $('[data-history-links]'); if (!p) return; p.innerHTML = 'Read more: ' + LINKS.filter(l => l.history).map(l => outLink(l.url, esc(l.title))).join(' · '); p.hidden = false; }).catch(() => {});
}
function collect(name) { if (store.markSeen('sutra:' + name)) store.addSparks(5, 'sutra'); }

/* ---------- Sutra deep-dive modal: the card grows into it ---------- */
let sutraDlg = null, sutraScene = null, sutraFrom = null, openedInPage = false; /* sutraScene: the open scene's controller */
const reducedMotion = () => fx.noMotion();
function sutraHTML(c) {
  const d = DETAILS[c.name], i = ALL_SUTRAS.indexOf(c), prev = ALL_SUTRAS[i - 1], next = ALL_SUTRAS[i + 1];
  const tricks = c.tricks.map(t => TRICKS.find(x => x.id === t)).filter(Boolean);
  // Learn more: videos play in the page for every Mode; pages on other sites only for Pro
  const reads = d.read.map(([label, to]) => (typeof to === 'object' ? playBtn(to.yt, `${icon('play')}<span>${esc(label)}</span>`) : outLink(to, `${icon('link')}<span>${esc(label)}</span>`))).filter(Boolean);
  return `<header class="sd-head"><div><span class="md-tag md-tag--plum">${c.sub ? 'Sub-sutra' : 'Sutra'} ${c.n} of ${c.sub ? 13 : 16}</span><h2 id="sdTitle" lang="sa-Latn">${c.name}</h2><p class="sd-mean">${c.meaning}</p></div><button class="vp-x sd-x" aria-label="Close">${icon('close')}</button></header>
  <div class="sd-body">
    <div class="sd-fig"><div class="sd-scene"></div><p class="mq-small">Diagram plays by itself. Use Back and Next to go at your own pace.</p></div>
    <div class="sd-text">
      <h3>In plain words</h3><p>${c.plain}</p><p>${d.more}</p>
      <h3>Why it works</h3><p>${d.why}</p>
      <h3>Worked examples</h3><ul class="sd-ex">${d.examples.map(([q, a]) => `<li><b>${q}</b><span>${a}</span></li>`).join('')}</ul>
      <h3>Where it is used</h3><p class="sd-uses">${d.uses.map(u => `<span>${u}</span>`).join('')}</p>
      ${tricks.length ? `<h3>Try it yourself</h3><p class="sd-try">${tricks.map(t => `<a class="md-btn md-btn--sm md-btn--primary" href="#/skill/v-${t.id}">${icon('bolt')} ${t.title}</a>`).join(' ')}</p>` : ''}
      ${reads.length ? `<h3>Learn more</h3><div class="rel-links">${reads.join('')}</div>` : ''}
    </div>
  </div>
  <footer class="sd-foot">${prev ? `<a class="md-btn md-btn--sm" href="#/sutras/${prev.id}" data-swap>&larr; ${prev.name}</a>` : '<span></span>'}${next ? `<a class="md-btn md-btn--sm" href="#/sutras/${next.id}" data-swap>${next.name} &rarr;</a>` : ''}</footer>`;
}
function openSutra(id, fromPage) {
  const c = ALL_SUTRAS.find(x => x.id === id); if (!c) return;
  if (!sutraDlg) {
    sutraDlg = document.createElement('dialog'); sutraDlg.className = 'sutra-modal'; sutraDlg.setAttribute('aria-labelledby', 'sdTitle'); document.body.append(sutraDlg);
    sutraDlg.addEventListener('cancel', e => { e.preventDefault(); requestClose(); });
    sutraDlg.addEventListener('click', e => { if (e.target === sutraDlg) requestClose(); if (e.target.closest('.sd-x')) requestClose(); const sw = e.target.closest('[data-swap]'); if (sw) { e.preventDefault(); location.replace(sw.getAttribute('href')); } if (e.target.closest('a[href^="#/skill"]')) { sutraDlg.close(); } });
  }
  const swapping = sutraDlg.open;
  if (sutraScene) sutraScene.abort();
  sutraDlg.innerHTML = `<div class="sd-inner">${sutraHTML(c)}</div>`;
  sutraScene = new AbortController();
  mountScene(sutraDlg.querySelector('.sd-scene'), DETAILS[c.name].scene, sutraScene.signal);
  collect(c.name); track('sutra/' + id, 'Sutra: ' + c.name);
  document.title = `${c.name}: ${BRAND} · Madhav`;
  if (swapping) { sutraDlg.scrollTop = 0; sutraDlg.querySelector('.sd-x').focus(); return; }
  openedInPage = fromPage;
  const art = document.querySelector(`.sutra-card[data-id="${id}"]`); sutraFrom = art;
  sutraDlg.showModal(); sutraDlg.querySelector('.sd-x').focus();
  fx.sfx('pop');
  if (art && !reducedMotion()) {
    const a = art.getBoundingClientRect(), b = sutraDlg.getBoundingClientRect();
    sutraDlg.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`, borderRadius: '22px', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.2,.9,.25,1.05)' });
    sutraDlg.querySelector('.sd-inner').animate([{ opacity: 0 }, { opacity: 0, offset: .45 }, { opacity: 1 }], { duration: 520 });
  }
}
function requestClose() { if (openedInPage) history.back(); else location.hash = '#/sutras'; }
function closeSutra(instant = false) {
  if (!sutraDlg || !sutraDlg.open) return;
  if (sutraScene) { sutraScene.abort(); sutraScene = null; }
  const art = sutraFrom && document.body.contains(sutraFrom) ? sutraFrom : null;
  const done = () => { sutraDlg.close(); document.title = `The sutras: ${BRAND} · Madhav`; if (art) art.querySelector('.sutra-face').focus({ preventScroll: true }); };
  if (instant || !art || reducedMotion()) return done();
  const a = art.getBoundingClientRect(), b = sutraDlg.getBoundingClientRect();
  sutraDlg.querySelector('.sd-inner').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
  sutraDlg.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`, opacity: .4 }], { duration: 340, easing: 'cubic-bezier(.5,0,.75,0)' }).onfinish = done;
}

/* ---------- Arena ---------- */
/* Note for grown-ups beside every World board and on the Me page. Must say exactly what cloud.js sends and
   cloud/firestore.rules allow (openspec parent-note spec; keep cloud/README.md Privacy in step). */
function parentNote() {
  const on = cloud.enabled(), p = store.player(), gate = cloud.canPost(p);
  const sum = fx.t({ explorer: 'For grown-ups: what the leaderboard keeps', challenger: 'For parents: what the leaderboard keeps', pro: 'Privacy: what the leaderboard stores' });
  const now = !on ? 'Right now nothing is sent anywhere: World boards are switched off and scores stay in this browser. If they are switched on, this is what they keep.'
    : gate === 'needs-age' ? 'Right now nothing is posted for this player. They have not answered the age question yet; it is asked the first time a score would be posted.'
    : gate === 'needs-parent' ? 'Right now nothing is posted for this player, because their age answer is under 13. To turn on World boards for them, a grown-up opens the Me page and goes to World boards.'
    : p.parentOk ? 'A grown-up turned on World boards for this player on this device. They can turn it off again on the Me page, under World boards.'
    : "This player's scores and weekly Sparks post to World boards.";
  return `<details class="mq-small pn"><summary class="linkbtn">${sum}</summary>
    <p class="pn-now"><b>${now}</b></p>
    <p>World boards run on Google Firebase. Three kinds of post go to boards for the player's league: the score of a Daily challenge in the Arena and the score of a Ranked round of a game (today's and this week's board for each), and the player's Sparks total for this week (one weekly board). Sparks come from all play, Practice included, so practice adds to that posted weekly total. Practice scores themselves never leave this device.</p>
    <p>Nothing is posted before a player answers one question about their age. The answer stays on this device and is never sent. Nothing is posted for a player under 13 until a grown-up turns on World boards for them on this device (Me page, World boards), and it can be turned off there at any time.</p>
    <p>No identity exists until the first post: looking at World boards needs no sign-in. ${fx.t({
      explorer: "When a player first posts, Firebase gives that player their own random ID on this browser and keeps it with the dates it was created and last used. Each player on this device who posts has their own ID and their own entry on each board. Removing a player on the Me page forgets their ID on this device; entries they already posted stay until you ask for them to be removed.",
      challenger: "At a player's first post, Firebase gives that player their own random ID on this browser and keeps it with the dates it was created and last used. Each player on this device who posts has their own ID and their own entry on each board. Removing a player on the Me page forgets their ID on this device; entries they already posted stay until you ask for them to be removed.",
      pro: "At a player's first post, Firebase gives that player their own random ID on this browser and keeps it with the dates it was created and last used. Each player on this device who posts has their own ID and their own entry on each board. Removing a player on the Me page forgets their ID on this device; entries already posted stay until their removal is requested.",
    })} There is no account, sign-up or password.</p>
    <p>Each entry holds exactly: the made-up nickname (picked from fixed word lists, never typed), an avatar color, the best score, the time it was saved, and the time it expires. No names, emails, ages, photos or typed text are ever collected. Progress, badges and the players on this device stay in this browser only.${on && cloud.appCheckOn() ? ' To stop cheating scripts, Google reCAPTCHA checks that scores come from this site.' : ''}</p>
    <p>${fx.t({
      explorer: 'Separately from World boards, the site counts visits and things done in the app (pages opened, questions answered, rounds finished) to make it better, with GoatCounter, anonymously: no cookies, no IDs and no names.',
      challenger: 'Separately from World boards, the site counts visits and actions in the app (pages opened, questions answered, rounds finished) to improve it, with GoatCounter, anonymously: no cookies, no IDs and no names.',
      pro: 'Separately from World boards, the site counts visits and actions in the app (pages opened, questions answered, rounds finished) to improve it, with GoatCounter, anonymously: no cookies, no IDs and no names.',
    })}</p>
    <p class="pn-video">${fx.t({
      explorer: "Videos play from YouTube in privacy-enhanced mode, and YouTube's own rules apply once one plays. Watching needs no grown-up step and posts nothing.",
      challenger: "Videos play from YouTube in privacy-enhanced mode, and YouTube's own rules apply once one plays. Watching needs no parent step and posts nothing.",
      pro: "Videos play from YouTube in privacy-enhanced mode, and YouTube's own rules apply once one plays. Watching needs no Parent step and posts nothing.",
    })}</p>
    <p>A board stops taking scores when its day or week ends. Entries are not deleted automatically, and turning World boards off does not delete them. To have an entry removed, message Madhav on <a href="https://www.linkedin.com/in/sbmadhav/" target="_blank" rel="noopener">LinkedIn</a> with the nickname, color and date.</p></details>`;
}
async function loadBoard(el, board, n = 10) {
  if (!el) return;
  const me = store.player(), online = cloud.enabled();
  const rows = (list, meTest) => list.length ? `<ol class="lb">${list.map((e, i) => `<li class="${meTest(e) ? 'me' : ''}"><span class="lb-rank r${i + 1}">${i + 1}</span>${avatar(e, 26)}<span class="lb-name">${esc(e.name)}</span><b>${e.score.toLocaleString('en-US')}</b></li>`).join('')}</ol>` : '<p class="mq-small">No scores yet. Be the first!</p>';
  el.innerHTML = `<div class="lb-tabs" role="tablist"><button role="tab" aria-selected="${online}" data-src="world">World</button><button role="tab" aria-selected="${!online}" data-src="device">This device</button></div><div class="lb-body"></div>`;
  const body = $('.lb-body', el);
  const show = async src => {
    el.querySelectorAll('[data-src]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.src === src)));
    if (src === 'device') { body.innerHTML = rows(store.boardTop(board, n), e => e.pid === me.id); return; }
    if (!online) { body.innerHTML = '<p class="mq-small">World leaderboards are not switched on yet. Scores compete with everyone who plays on this device.</p>'; return; }
    body.innerHTML = '<p class="mq-small">Loading world scores…</p>';
    try { body.innerHTML = rows(await cloud.top(board, n), e => e.me); } catch (err) { body.innerHTML = '<p class="mq-small">World scores are not reachable right now. Showing this device.</p>' + rows(store.boardTop(board, n), e => e.pid === me.id); }
  };
  el.querySelectorAll('[data-src]').forEach(b => b.onclick = () => show(b.dataset.src));
  show(online ? 'world' : 'device');
}
/* Send a Ranked round's score to this device's boards and the World boards, and say clearly where it went.
   cloud.submit decides whether it may leave the device; with no Age answer yet the age sheet asks it. */
async function postScore(boards, score, label) {
  boards.forEach(b => store.boardAdd(b, score));
  if (!cloud.enabled() || score < 10) return;
  await sendScore(boards, score, label, store.player()); /* the Player who finished the round, under their own identity */
}
async function sendScore(boards, score, label, p) {
  try {
    const res = await Promise.all(boards.map(b => cloud.submit(b, { name: p.name, avatar: p.avatar, score }, p)));
    if (res.some(r => r.posted)) return fx.toast(`<b>Posted to the world leaderboard</b> ${label}`, 'ok');
    const why = res.find(r => r.reason === 'needs-age' || r.reason === 'needs-parent')?.reason;
    if (why === 'needs-age') askAge({ onAnswer: () => { const q = store.playerById(p.id); if (q && cloud.canPost(q) === 'ok') { sendScore(boards, score, label, q); queueSparksPost(); } }, onDismiss: () => savedHere('needs-age') });
    else if (why) savedHere(why);
  } catch (err) { fx.toast(`Could not reach the world leaderboard${err && err.code ? ` (${esc(err.code)})` : ''}. Your score is saved on this device.`); }
}
/* After a post that may not leave the device: where the score went, and for under-13s how World boards get turned on */
function savedHere(why) {
  const how = why === 'needs-parent' ? ' ' + fx.t({ explorer: 'A grown-up can turn on World boards on the Me page.', challenger: 'Ask a grown-up to turn on World boards on the Me page.', pro: 'A parent or guardian can turn on World boards on the Me page.' }) : '';
  fx.toast(`<b>Saved on this device.</b> ${fx.t({ explorer: 'Your score is on the This device board.', challenger: 'It is on the This device board.', pro: 'It ranks on the This device board.' })}${how}`);
}
/* Weekly Sparks Board: everything you do earns Sparks, so this ranks all activity. Sent at most once a minute.
   The Players who earned Sparks are remembered by id, so after a Player switch each one's own weekly total
   still goes out under their own identity (never another Player's), and a removed Player's is dropped. */
let sparksTimer = 0, sparksLast = 0;
const sparksWho = new Set();
function queueSparksPost() {
  if (!cloud.enabled() || cloud.canPost() !== 'ok') return; /* no Age answer, or under 13 without the Parent step: nothing is sent (submit checks again) */
  sparksWho.add(store.player().id);
  clearTimeout(sparksTimer);
  const wait = Math.max(3000, 65000 - (Date.now() - sparksLast));
  sparksTimer = setTimeout(() => {
    sparksLast = Date.now();
    for (const id of [...sparksWho]) {
      sparksWho.delete(id);
      const p = store.playerById(id); if (!p) continue;
      const w = store.weekSparksOf(id), L = fx.MODES[p.mode]?.league;
      if (L && w >= 10) cloud.postWeekSparks(L, w, p).catch(() => {});
    }
  }, wait);
}
store.on(type => { if (type === 'sparks') queueSparksPost(); });
function arenaView({ signal } = {}) {
  document.title = `Arena: ${BRAND} · Madhav`;
  const league = fx.MODES[fx.mode()].league, day = cloud.dayId(), wk = cloud.weekId();
  /* Round type: daily (Ranked, always timed), practice (timed, untimed in Calm) or untimed (Practice, no clock).
     With Calm on, the untimed Practice round is picked until the Player picks another this visit. */
  let type = fx.calmOn() ? 'untimed' : 'daily';
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap mq-narrow">
    ${crumbs([null, 'Arena'])}
    <span class="md-tag md-tag--coral">Arena</span>
    <h1 class="md-heading">60 seconds. Same questions for everyone.</h1>
    <p class="md-lede">Answer as many as you can. Each right answer is worth 10, and every answer in a row adds a combo bonus. The daily round uses the same questions for every ${fx.MODES[fx.mode()].name}, so it is a fair race.</p>
    <a class="tower-promo" href="#/tower">${icon('trophy')}<span><b>Challenge tower: ${LV.CHALLENGE_COUNT.toLocaleString('en-US')} levels</b><small>${medalCounts(store.medalsWhere('a:'))} · Sprint, Survival, Sharpshooter, Time attack, Boss</small></span><span aria-hidden="true">&rarr;</span></a>
    <div class="md-card ar-shell" id="arShell"></div>
    ${playShelf('arena', 'More ways to race')}</div></section>`;
  const shell = $('#arShell'), rKey = 'arena:' + league, mode = fx.mode();
  const arenaRating = () => Math.round(AD.rating(rKey, mode));
  const arenaRatingLine = () => `<small id="arRating" data-rating="${arenaRating()}">${fx.t({
    explorer: `Your Arena Rating: <b>${arenaRating()}</b> of 20. Practice rounds get harder as you get them right.`,
    challenger: `Your Arena Rating: <b>${arenaRating()}</b> of 20. Practice rounds start there and adapt to every answer.`,
    pro: `Arena Rating: <b>${arenaRating()}</b>/20. Practice rounds start there and adapt to every answer; the daily round is the same for everyone.`
  })}</small>`;
  const lobby = (result = '') => {
    shell.innerHTML = `${result}<div class="g-optrow" role="group" aria-label="Round type"><button class="md-chip" aria-pressed="${type === 'daily'}" data-t="daily">Daily challenge</button><button class="md-chip" aria-pressed="${type === 'practice'}" data-t="practice">Practice round</button><button class="md-chip" aria-pressed="${type === 'untimed'}" data-t="untimed">Practice, no clock</button></div>
      ${fx.calmOn() ? '<p class="ar-calm" id="arCalmNote">The daily challenge is a timed race for everyone. Practice has no clock in Calm.</p>' : ''}
      <p class="g-best">League: <b>${fx.MODES[fx.mode()].name}</b> · Your best today: <b>${store.best('arena-' + day)}</b><br>${arenaRatingLine()}</p>
      <button class="md-btn md-btn--primary ar-go" id="arGo">${icon('bolt')} Start</button>
      <div class="lb-cols"><div><h2 class="mq-h3">Today</h2><div id="lbDay" class="lb-wrap"></div></div><div><h2 class="mq-h3">This week</h2><div id="lbWeek" class="lb-wrap"></div></div></div>
      <h2 class="mq-h3">Most Sparks this week <small class="mq-small">everything you play counts</small></h2><div id="lbSparks" class="lb-wrap"></div>${parentNote()}`;
    shell.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { type = b.dataset.t; lobby(result); });
    $('#arGo', shell).onclick = countdown;
    loadBoard($('#lbDay', shell), `daily-${day}-${league}`); loadBoard($('#lbWeek', shell), `week-${wk}-${league}`); loadBoard($('#lbSparks', shell), cloud.weekSparksBoard(wk, league));
  };
  /* The countdown, the round and its result play in the full-screen shell (openspec game-shell-and-calm).
     run: this round's controller; Stop, or Back on the result, closes the shell and focus returns to Start. */
  let run = null, play = null;
  const stop = () => { const r = run, p = play; run = play = null; if (p) p.close(); if (r) r.abort(); };
  const countdown = () => {
    stop(); run = child(signal);
    const old = shell.querySelector('.ar-result'); if (old) old.remove(); /* the last result goes; the new one shows in the shell */
    play = openShell(type === 'daily' ? 'Arena: daily challenge' : 'Arena: Practice', { signal: run.signal, exitId: 'arStop', onExit: stop, focusBack: () => $('#arGo', shell) });
    const area = play.area, rsig = run.signal;
    let n = 3; area.innerHTML = `<div class="ar-count" aria-live="assertive">${n}</div>`; fx.sfx('tick');
    const count = child(rsig); /* leaving or stopping during the countdown means the round never starts */
    every(() => { n--; if (n === 0) { count.abort(); fx.sfx('ok'); start(area, rsig); } else { area.firstChild.textContent = n; fx.sfx('tick'); } }, 700, count.signal);
  };
  const start = (area, rsig) => {
    track('arena/' + league + '/' + type, 'Arena round'); metrics.roundStart('arena');
    /* Practice: the Dial picks each question. Daily: it only records the answers (the questions are the same for everyone).
       Untimed: the Practice round with no clock, chosen or (for a Practice round) set by Calm. The daily round keeps its clock. */
    const before = arenaRating(), dial = new AD.Dial(AD.rating(rKey, mode));
    const untimed = type === 'untimed' || (type === 'practice' && fx.calmOn());
    runArena(area, { league, day: type === 'daily' ? day : null, dial, signal: rsig, untimed, onEnd: async r => {
      metrics.roundEnd('arena', league);
      const after = Math.round(AD.saveRating(rKey, dial) || before);
      const moved = dial.n < 4 ? '' : fx.t({
        explorer: after > before ? ` Your Arena Rating went up to ${after}!` : after < before ? ` Your Arena Rating is ${after} now.` : '',
        challenger: after > before ? ` Arena Rating up to ${after}.` : after < before ? ` Arena Rating now ${after}.` : '',
        pro: after > before ? ` Arena Rating up to ${after}.` : after < before ? ` Arena Rating down to ${after}.` : ''
      });
      store.bump('arena'); store.touchDay();
      if (r.score > store.count('arenaBest')) store.bump('arenaBest', r.score - store.count('arenaBest'));
      const sp = Math.round(r.score / 5); if (sp) store.addSparks(sp, 'arena');
      let msg = '';
      if (type === 'daily') {
        const isBest = store.setBest('arena-' + day, r.score);
        if (store.markSeen('daily:' + day)) store.bump('dailyDays');
        if (isBest) { fx.confetti(100); msg = 'New personal best for today!'; }
        postScore([`daily-${day}-${league}`, `week-${wk}-${league}`], r.score, `for today's ${fx.MODES[fx.mode()].name} race.`);
      }
      const res = `<div class="ar-result"><div class="md-stat"><div class="md-kicker">Score</div><div class="md-value">${r.score}</div><p>${r.right} right · ${r.wrong} missed · best combo ${r.bestCombo}x${moved}</p></div><p class="ar-msg">${msg || (type !== 'daily' ? 'Practice rounds do not count for the leaderboard.' : 'Play again to beat your best.')} <span class="fx-sparks">+${sp} Sparks</span></p></div>`;
      /* The result shows in the shell; leaving it shows the lobby with the same result and focuses Start */
      const back = () => { lobby(res); stop(); };
      if (!play || rsig.aborted) { lobby(res); return; }
      area.innerHTML = `${res}<p class="lv-acts"><button type="button" class="md-btn md-btn--primary" id="arDone">Back to the Arena</button></p>`;
      play.setExit('Back', back);
      const done = $('#arDone', area); done.onclick = back; done.focus({ preventScroll: true });
    } });
  };
  lobby();
}

/* ---------- Play experiences (openspec play-experiences): pages inside a section ---------- */
/* A section's shelf of play experiences for this Mode (js/play/catalog.js) */
function playShelf(section, heading) {
  const list = playIn(section, fx.mode()); if (!list.length) return '';
  return `<section class="play-shelf" aria-labelledby="ps-${section}"><h2 class="mq-strand" id="ps-${section}">${heading}</h2><ul class="play-grid">${list.map(e => `<li><a class="play-card play-card--${e.color}" href="${e.route}"><span class="play-card-ic" aria-hidden="true">${PLAY_ICONS[e.icon] || ''}</span><b>${e.title}</b><em>${e.tag}</em><span>${e.blurb}</span></a></li>`).join('')}</ul></section>`;
}
/* Styles load with the page that needs them; the build stamps their URLs (the #vm-css map in index.html) */
const cssStamps = (() => { try { return JSON.parse(document.getElementById('vm-css')?.textContent || '{}'); } catch (e) { return {}; } })();
function playCss(name) {
  const url = `/vedic-math/css/play/${name}.css`;
  if (document.querySelector(`link[data-play="${name}"]`)) return Promise.resolve();
  return new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = cssStamps[url] ? `${url}?v=${cssStamps[url]}` : url; l.dataset.play = name; l.onload = l.onerror = () => res(); document.head.append(l); });
}
function playView(hash, { signal }) {
  const hit = playFor(hash); if (!hit) return home({ signal });
  const [e, params] = hit, sec = SECTIONS[e.section];
  document.title = `${e.title}: ${BRAND} · Madhav`;
  playPlace.back = sec;
  view.classList.add('px-view', `px-view--${e.id}`);
  onAbort(signal, () => view.classList.remove('px-view', `px-view--${e.id}`));
  view.innerHTML = `<div class="md-wrap px-loading" aria-busy="true">Opening ${e.title}...</div>`;
  Promise.all([import(`./play/exp/${e.id}.js`), playCss('base'), playCss(e.id)]).then(([mod]) => {
    if (signal.aborted) return;
    view.innerHTML = '';
    mod.mount({ root: view, signal, params, exp: e });
    const head = view.querySelector('h1, h2'); if (head && !view.contains(document.activeElement)) { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); }
  }).catch(() => {
    if (signal.aborted) return;
    view.innerHTML = `<section class="md-section"><div class="md-wrap"><h1 class="md-heading">${e.title} did not open</h1><p class="md-lede">Check your connection and try again.</p><p><a class="md-btn md-btn--primary" href="${sec.href}">Back to ${sec.label}</a></p></div></section>`;
  });
}

/* Play rewards: experiences report fixed actions through js/play/kit.js track(), which also fires a vmplay event.
   A few count for Sparks (at most PLAY_DAY_CAP a day from play, so no one farms them) and for badges. */
const PLAY_SPARKS = { 'daily/solve': 20, 'locks/level': 10, 'locks/discover': 15, 'spells/cast': 4, 'spells/learn': 10, 'party/finish': 20, 'ghosts/finish': 10,
  'bets/round': 10, 'apprentice/coach': 4, 'apprentice/belt': 15, 'scroll/solve': 15, 'scroll/chapter': 25, 'wall/discover': 10, 'tala/tihai-land': 10, 'tala/meet-right': 5, 'lens/solve': 8, 'art/save': 5 };
const PLAY_DAY_CAP = 150;
function onPlay(ev) {
  const a = ev.detail && ev.detail.action; if (!a) return;
  store.touchDay();
  if (a === 'party/finish') store.bump('duelsDone'); /* the Party host badge (was Duelist) */
  const n = PLAY_SPARKS[a]; if (!n) return;
  const key = 'playSparks:' + cloud.dayId(), had = store.count(key), give = Math.min(n, PLAY_DAY_CAP - had);
  if (give > 0) { store.bump(key, give); store.addSparks(give, 'play'); }
}
document.addEventListener('vmplay', onPlay);

/* ---------- Games ---------- */
function gamesView() {
  document.title = `Games: ${BRAND} · Madhav`;
  const m = fx.mode(), mine = GAMES.filter(g => g.modes.includes(m)), rest = GAMES.filter(g => !g.modes.includes(m));
  const card = g => `<a class="md-card mq-game" href="#/game/${g.id}"><div class="md-icon-tile" style="background:color-mix(in srgb,var(--${g.color}) 18%,transparent);color:var(--${g.color}-strong)">${icon('game')}</div><h3>${both(g.title, g.kid)}</h3><p>${g.desc.split('. ')[0]}.</p><small class="mq-game-f">Skill ${Math.round(AD.rating('game:' + g.id, m))}/20 · ${store.medalsWhere(`g:${g.id}:`).any}/${LEVELS_PER_GAME} levels · ${store.medalsWhere(`g:${g.id}:`).gold} gold · leaderboard</small></a>`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs([null, 'Games'])}
    <span class="md-tag md-tag--plum">Games</span>
    <h1 class="md-heading">Games that build number sense</h1>
    <p class="md-lede">${GAMES.length} games, each with its own world leaderboard. Every game adapts to you: right answers make it harder, misses make it easier, and points are weighted by difficulty. ${LEVELS_PER_GAME} levels per game (${(GAMES.length * LEVELS_PER_GAME).toLocaleString('en-US')} in all) open up as your skill grows. Every game earns Sparks, and playing all of them unlocks a badge. Want a real race? Try the <a href="#/arena">Arena</a> or a <a href="#/arena/party">Party Mode</a> game.</p>
    ${playShelf('games', 'Play, make and discover')}
    <h2 class="mq-strand">Picked for ${fx.MODES[m].name}</h2><div class="md-grid">${mine.map(card).join('')}</div>
    ${rest.length ? `<h2 class="mq-strand">More games</h2><div class="md-grid">${rest.map(card).join('')}</div>` : ''}
  </div></section>`;
}
function gameView(id, lvl = 0, { signal } = {}) {
  const g = GAMES.find(x => x.id === id); if (!g) return gamesView();
  const m = fx.mode(), league = fx.MODES[m].league, gkey = n => `g:${g.id}:${n}`, rate = AD.rating('game:' + g.id, m);
  const ratedLevel = AD.levelForDifficulty(rate, LEVELS_PER_GAME);
  const isOpen = n => n <= ratedLevel || n === 1 || store.medal(gkey(n - 1)) > 0;
  if (lvl && (lvl > LEVELS_PER_GAME || !isOpen(lvl))) { location.replace(`#/game/${g.id}`); return; }
  const L = lvl ? LEVELS[g.id](lvl) : null, bDay = `${boardGame(g.id)}-daily-${cloud.dayId()}-${league}`, bWeek = `${boardGame(g.id)}-week-${cloud.weekId()}-${league}`;
  const lengthText = g.secs ? `${g.secs} seconds` : `${g.rounds} ${g.id === 'pairs' ? 'boards' : g.id === 'target' ? 'puzzles' : 'questions'}`;
  document.title = `${g.title}${lvl ? ` level ${lvl}` : ''}: ${BRAND} · Madhav`;
  let mode = lvl ? 'level' : 'ranked', round = null; /* round: the running round's controller */
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap mq-narrow">
    ${crumbs(['#/games', 'Games'], lvl ? [`#/game/${g.id}`, both(g.title, g.kid)] : [null, both(g.title, g.kid)], ...(lvl ? [[null, `Level ${lvl}`]] : []))}
    <h1 class="md-heading">${both(g.title, g.kid)}${lvl ? ` <small class="kata-of">level ${lvl} of ${LEVELS_PER_GAME}</small>` : ''}</h1><p class="md-lede">${g.desc}</p>
    <div class="md-card g-shell" id="gShell"></div>
    ${lvl ? '' : `<div class="lb-cols"><div><h2 class="mq-h3">Today's best</h2><div id="gbDay" class="lb-wrap"></div></div><div><h2 class="mq-h3">This week</h2><div id="gbWeek" class="lb-wrap"></div></div></div>${parentNote()}
    <h2 class="mq-strand">Levels <small class="mq-small">${store.medalsWhere(`g:${g.id}:`).any} of ${LEVELS_PER_GAME} cleared · ${store.medalsWhere(`g:${g.id}:`).gold} gold · levels up to ${ratedLevel} are open at your skill (level ${Math.round(rate)} of 20)</small></h2>${levelMap(LEVELS_PER_GAME, n => ({ medal: store.medal(gkey(n)) }), n => `#/game/${g.id}/${n}`, { isOpen, suggest: Math.max(ratedLevel, ...Array.from({ length: LEVELS_PER_GAME }, (_, i) => (store.medal(gkey(i + 1)) ? Math.min(LEVELS_PER_GAME, i + 2) : 0))) })}`}
  </div></section>`;
  const shell = $('#gShell');
  const dialMeter = d => `<span class="dial" role="img" aria-label="Difficulty ${d} of 20"><span class="dial-bar"><i style="width:${(d / 20) * 100}%"></i></span><b>Level ${d}</b></span>`;
  const lobby = (msg = '') => {
    if (L) { shell.innerHTML = `${msg}<p class="lv-best">Starts at difficulty ${L.cfg.start} of 20 and adapts as you play. Medals: ${goalsText(L.goal, 'points')}.</p><p class="lv-best">Your best: ${medalHTML(store.medal(gkey(lvl)))}</p><button class="md-btn md-btn--primary ar-go" id="gStart">${icon('play')} Play level ${lvl}</button>`; $('#gStart', shell).onclick = start; return; }
    shell.innerHTML = `${msg}<div class="g-optrow" role="group" aria-label="How to play"><button class="md-chip" aria-pressed="${mode === 'ranked'}" data-m="ranked">${icon('trophy')} Ranked round (${lengthText})</button><button class="md-chip" aria-pressed="${mode === 'endless'}" data-m="endless">Endless practice</button></div>
      <p class="g-best">Your skill in this game: ${dialMeter(Math.round(AD.rating('game:' + g.id, m)))}<br><small>Every round adapts: right answers make it harder, misses make it easier. Points are worth more at higher difficulty, so the leaderboard is fair across levels.</small></p>
      <button class="md-btn md-btn--primary ar-go" id="gStart">${icon('play')} ${mode === 'ranked' ? 'Play ranked' : 'Practice'}</button>`;
    shell.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; lobby(msg); });
    $('#gStart', shell).onclick = start;
  };
  /* The round and its result play in the full-screen shell (openspec game-shell-and-calm). session: the shell's
     controller; round: the game's, a child of it, so the round can end while its result stays on screen. */
  let session = null, play = null;
  const close = () => { const s = session, p = play; session = play = null; if (p) p.close(); if (s) s.abort(); };
  const start = () => {
    track('game/' + g.id + '/' + mode, 'Game: ' + g.title); metrics.roundStart('game'); fx.sfx('tap');
    const focusWasHere = shell.contains(document.activeElement); /* Start pressed from the keyboard: focus goes to the first option */
    close(); session = child(signal);
    const old = shell.querySelector('.g-result'); if (old) old.remove();
    play = openShell(`${g.title}${lvl ? ` level ${lvl}` : ''}`, { signal: session.signal, exit: mode === 'endless' ? 'Finish' : 'Stop', exitId: 'gQuit', onExit: () => quit(), focusBack: () => $('#gStart', shell) });
    const area = play.area;
    round = child(session.signal); const roundSignal = round.signal;
    /* Calm: a Practice round (a Level) of a timed game has no clock and ends after its questions; Ranked keeps the clock */
    const untimed = !!g.secs && mode !== 'ranked' && fx.calmOn();
    const startD = L ? L.cfg.start : AD.rating('game:' + g.id, m), dial = new AD.Dial(startD, { floor: L ? L.cfg.floor : 1 });
    area.innerHTML = `<div class="g-head"><span class="g-hud" id="gHud">${dialMeter(dial.lv)}<span class="g-pts"><b id="gPts">0</b> pts</span></span><span class="g-sayline" id="gSay" role="status" aria-live="polite"></span></div><div class="g-area" id="gArea"></div>`;
    const sayEl = $('#gSay', area), hudEl = $('#gHud', area);
    const hud = (d, pts, ok) => { hudEl.innerHTML = `${dialMeter(d.lv)}<span class="g-pts"><b id="gPts">${d.points.toLocaleString('en-US')}</b> pts</span>${ok && pts ? `<span class="g-gain">+${pts}</span>` : ''}${d.trend > 0 ? '<span class="g-trend up" role="img" aria-label="Getting harder">&#9650;</span>' : d.trend < 0 ? '<span class="g-trend down" role="img" aria-label="Getting easier">&#9660;</span>' : ''}`; };
    let ended = false;
    const finish = score => {
      if (ended) return; ended = true; round.abort();
      metrics.roundEnd('game', league); /* Stop never gets here, so a stopped round sends nothing */
      store.markSeen('game:' + g.id); store.bump('gamesPlayed'); store.touchDay();
      const before = AD.rating('game:' + g.id, m), after = AD.saveRating('game:' + g.id, dial), moved = Math.round((after - before) * 10) / 10;
      const skillLine = `Difficulty: started at ${Math.round(startD)}, reached ${Math.round(dial.peak)}, settled at ${Math.round(dial.settled())} of 20. ${dial.right} of ${dial.n} right.`;
      const skillMove = dial.n >= 4 ? (moved > 0 ? ` Your skill rose to ${Math.round(after)}.` : moved < 0 ? ` Your skill is now ${Math.round(after)}.` : '') : '';
      const showResult = (html, back) => {
        area.innerHTML = html; play.setExit('Back', back);
        const h = area.querySelector('h2, .md-kicker'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
      };
      if (L) {
        /* A Level of a timed game played without the clock earns Sparks but no Medal */
        const noClock = untimed, medal = noClock ? 0 : levelMedal(L.goal, score), improved = store.setMedal(gkey(lvl), medal), sp = 10 + medal * 10 + Math.min(60, Math.round(score / 40)); store.addSparks(sp, 'game');
        if (medal === 3) fx.confetti(100); else if (medal) fx.confetti(40);
        showResult(resultHTML({ medal, noClock }, [`${score.toLocaleString('en-US')} points.${noClock ? '' : ` Goals: ${L.goal.map(v => v.toLocaleString('en-US')).join(', ')}.`}`, skillLine + skillMove, `<span class="fx-sparks">+${sp} Sparks</span>${improved ? ' New best.' : ''}`, ...(noClock ? ['<span class="lv-noclock">Medals for this game need the clock. Turn Calm off to play for one.</span>'] : [])], lvl < LEVELS_PER_GAME ? `#/game/${g.id}/${lvl + 1}` : null, `#/game/${g.id}/${lvl}`, `#/game/${g.id}`, 'Game home'), close);
        const rt = area.querySelector('[data-retry]'); if (rt) rt.onclick = e => { e.preventDefault(); mount(ctx => gameView(g.id, lvl, ctx)); };
        return;
      }
      const sp = 10 + Math.min(80, Math.round(score / 30)); store.addSparks(sp, 'game');
      let note = '';
      if (mode === 'ranked') { const isBest = store.setBest(`${g.id}-ranked-${cloud.dayId()}`, score); if (isBest && score) fx.confetti(80); note = isBest && score ? 'Your best today!' : `Today's best: ${store.best(`${g.id}-ranked-${cloud.dayId()}`).toLocaleString('en-US')}.`; postScore([bDay, bWeek], score, `for ${g.title}.`); }
      const res = `<div class="g-result"><div class="md-stat"><div class="md-kicker">${mode === 'ranked' ? 'Ranked score' : 'Practice score'}</div><div class="md-value">${score.toLocaleString('en-US')}</div><p>${note} <span class="fx-sparks">+${sp} Sparks</span></p></div><p class="mq-small">${skillLine}${skillMove}</p></div>`;
      const back = () => { lobby(res); close(); };
      showResult(`${res}<p class="lv-acts"><button type="button" class="md-btn md-btn--primary" id="gDone">Back to ${esc(g.title)}</button></p>`, back);
      $('#gDone', area).onclick = back;
      if (mode === 'ranked') later(() => { loadBoard($('#gbDay'), bDay); loadBoard($('#gbWeek'), bWeek); }, 1500, signal);
    };
    /* The exit button: Finish ends an endless round with its result; Stop leaves any other round with nothing saved */
    const quit = () => { if (ended) return close(); if (mode === 'endless') return finish(dial.points); ended = true; round.abort(); close(); };
    keepFocus($('#gArea', area), roundSignal, focusWasHere);
    g.run($('#gArea', area), { dial, hud, endless: mode === 'endless', secs: g.secs, ranked: mode === 'ranked', untimed, perQ: g.perQ, signal: roundSignal, say: m2 => (sayEl.innerHTML = m2), end: finish });
    /* Started from the keyboard: focus moves from the shell to the game's first option (WCAG 2.4.3) */
    if (focusWasHere) { const list = [...$('#gArea', area).querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(x => x.getClientRects().length); const f = list.find(x => x.closest('[role="group"]')) || list[0]; if (f) f.focus({ preventScroll: true }); }
  };
  lobby();
  if (!lvl) { loadBoard($('#gbDay'), bDay); loadBoard($('#gbWeek'), bWeek); }
}

/* ---------- Watch shelf (openspec watch-shelf) ---------- */
/* The list loads when the shelf opens. Filters: the Player's Mode first, then Skill area, Tricks, length and kind
   (Links too for Pro). Videos and Shorts play in the page; only Pro sees sites, which open in a new tab. */
const LENGTH_LABEL = { short: 'Under 2 min', mid: '2 to 5 min', long: '5 to 8 min', longer: '8 to 12 min' };
function watchView({ signal } = {}) {
  document.title = `Watch and learn: ${BRAND} · Madhav`;
  const m = fx.mode() || 'challenger', pro = linksOut();
  const f = { mode: m, level: m, strand: null, tricks: false, length: null, kind: null };
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs([null, 'Watch'])}
    <span class="md-tag md-tag--teal">Watch and learn</span>
    <h1 class="md-heading">Short videos that show how</h1>
    <p class="md-lede">Every video plays right here, and none is longer than ${W.MAX_LENGTH / 60} minutes. Each one is checked by hand and matched to the skills and tricks it teaches.${pro ? ' Sites open in a new tab.' : ''}</p>
    <div id="watchBody"><p class="mq-small">Loading videos…</p></div>
  </div></section>`;
  const body = $('#watchBody');
  W.loadVideos().then(({ VIDEOS, LINKS }) => {
    if (signal && signal.aborted) return;
    const visible = VIDEOS.filter(v => W.visibleTo(v, m));
    const strands = Object.keys(STRANDS).filter(id => visible.some(v => W.strandsOf(v, byId).includes(id)));
    const chips = (key, opts, label) => opts.length < 2 ? '' : `<div class="g-optrow watch-filter" role="group" aria-label="${label}"><span class="watch-flab" aria-hidden="true">${label}</span>${opts.map(([val, l]) => `<button type="button" class="md-chip" data-k="${key}" data-v="${val}" aria-pressed="${String(f[key]) === String(val)}">${l}</button>`).join('')}</div>`;
    const card = v => `<button type="button" class="watch-card plays${v.kind === 'short' ? ' watch-card--short' : ''}" data-watch="${esc(v.yt)}" data-modes="${v.modes.join(' ')}" data-kind="${v.kind}" data-tricks="${v.tricks.join(' ')}" data-secs="${v.duration}"${navigator.onLine === false ? ' disabled' : ''}>
      <span class="watch-th"><img src="${W.thumbSrc(v)}" alt="" loading="lazy" width="320" height="180"><span class="watch-type">${v.kind === 'short' ? 'Short' : 'Video'} · ${mins(v.duration)}</span><span class="watch-play" aria-hidden="true">${icon('play')}</span></span>
      <b>${esc(v.title)}</b><small>${esc(v.why)}</small><span class="watch-tags"><span>${esc(v.channel)}</span>${v.tricks.length ? '<span class="tagv">Trick</span>' : ''}</span></button>`;
    const linkCard = l => outLink(l.url, `<span class="watch-th watch-th--${l.kind === 'game' ? 'game' : 'website'}">${icon('link')}<span class="watch-type">${l.kind === 'game' ? 'Game' : 'Site'}</span><span class="watch-ext">Opens in a new tab</span></span><b>${esc(l.title)}</b><small>${esc(l.why)}</small>`, 'watch-card');
    const draw = () => {
      const list = f.kind === 'link' ? [] : W.filterShelf(VIDEOS, f, byId);
      const links = pro && (f.kind === null || f.kind === 'link') && !f.tricks && !f.length && !f.strand ? LINKS : [];
      body.innerHTML = `${W.MODE_SEES[m].length > 1 ? chips('level', [...W.MODE_SEES[m].map(x => [x, fx.MODES[x].name]), ['all', 'Both']], 'Mode') : ''}
        ${chips('strand', [['null', 'Any area'], ...strands.map(id => [id, STRANDS[id].pro])], 'Skill area')}
        ${chips('tricks', [['false', 'Any'], ['true', 'Tricks only']], 'Tricks')}
        ${chips('length', [['null', 'Any length'], ...Object.entries(LENGTH_LABEL)], 'Length')}
        ${chips('kind', [['null', 'Everything'], ['video', 'Videos'], ['short', 'Shorts'], ...(pro ? [['link', 'Links']] : [])], 'Videos or Shorts')}
        ${navigator.onLine === false ? '<p class="mq-note watch-offline">Videos need a connection. Connect to play them.</p>' : ''}
        ${list.length ? `<div class="watch-grid">${list.map(card).join('')}</div>` : f.kind === 'link' ? '' : '<p class="mq-small">No videos match these filters yet.</p>'}
        ${links.length ? `<section class="watch-links" aria-labelledby="watchLinksH"><h2 class="mq-h3" id="watchLinksH">Sites and games</h2><p class="mq-note">Opens in a new tab.</p><div class="watch-grid">${links.map(linkCard).join('')}</div></section>` : ''}`;
      body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const v = b.dataset.v; f[b.dataset.k] = v === 'null' ? null : v === 'true' ? true : v === 'false' ? false : v; fx.sfx('tap'); draw(); });
    };
    draw();
    on(window, 'online', draw, signal); on(window, 'offline', draw, signal);
  }).catch(() => { if (!(signal && signal.aborted)) body.innerHTML = '<p class="mq-note watch-offline">The video list could not load. Videos need a connection.</p>'; });
}
/* Play buttons ([data-watch], a YouTube id) open the in-page player; Pro links ([data-link]) open a new tab */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-watch]'), a = !b && e.target.closest('a[data-link]');
  if (a) { store.bump('watched'); track('watch/link', 'Watch: link'); return; }
  if (!b) return;
  e.preventDefault();
  W.loadVideos().then(({ VIDEOS }) => {
    const v = VIDEOS.find(x => x.yt === b.dataset.watch); if (!v) return;
    store.bump('watched'); track('watch/' + v.kind, 'Watch: ' + v.title);
    openPlayer(v, b);
  }).catch(() => {});
});
let playerDlg = null;
function openPlayer(v, opener, onClose = null) {
  if (musicOn()) stopMusic();
  if (!playerDlg) {
    playerDlg = document.createElement('dialog'); playerDlg.className = 'vm-player'; playerDlg.setAttribute('aria-labelledby', 'vpTitle');
    playerDlg.innerHTML = `<div class="vp-head"><h2 id="vpTitle"></h2><button class="vp-x" aria-label="Close video">${'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'}</button></div><div class="vp-frame"></div><p class="vp-desc"></p><p class="vp-foot"></p>`;
    document.body.append(playerDlg);
    const close = () => playerDlg.close();
    playerDlg.querySelector('.vp-x').onclick = close;
    playerDlg.addEventListener('click', ev => { if (ev.target === playerDlg) close(); });
    playerDlg.addEventListener('close', () => { clearTimeout(playerDlg._minute); playerDlg.querySelector('.vp-frame').innerHTML = ''; const done = playerDlg._onClose; playerDlg._onClose = null; if (playerDlg._opener && document.body.contains(playerDlg._opener)) playerDlg._opener.focus({ preventScroll: true }); if (done) done(); });
  }
  playerDlg._opener = opener; playerDlg._onClose = onClose;
  playerDlg.querySelector('#vpTitle').textContent = v.title;
  playerDlg.querySelector('.vp-desc').textContent = `${v.why} (${v.channel})`;
  // Open on YouTube: Pro only (Explorer and Challenger get no link that leaves the site)
  playerDlg.querySelector('.vp-foot').innerHTML = outLink(`https://www.youtube.com/watch?v=${v.yt}`, 'Open on YouTube', 'vp-yt');
  playerDlg.classList.toggle('tall', v.kind === 'short');
  playerDlg.querySelector('.vp-frame').innerHTML = `<iframe src="${W.embedSrc(v)}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  playerDlg.showModal();
  // Video learner: the player has stayed open for a whole minute (cancelled when it closes)
  clearTimeout(playerDlg._minute); playerDlg._minute = setTimeout(() => { if (playerDlg.open) store.bump('watchedMinute'); }, 60000);
}

/* ---------- Posting consent: the Age answer and the Parent step (docs/adr/0001) ----------
   One neutral question, asked the first time a Ranked round's score would be posted. No choice hints at what
   it allows. The answer stays on this device (store.setAge); cloud.canPost reads it. */
const AGES = [[5, '5 or under'], ...Array.from({ length: 12 }, (_, i) => [i + 6, String(i + 6)]), ['adult', 'Grown-up']];
let ageDlg = null, focusWorldBoards = false;
function askAge({ onAnswer = () => {}, onDismiss = () => {} } = {}) {
  if (!ageDlg) {
    ageDlg = document.createElement('dialog'); ageDlg.className = 'vm-sheet'; ageDlg.setAttribute('aria-labelledby', 'ageTitle'); ageDlg.setAttribute('aria-describedby', 'ageSub');
    document.body.append(ageDlg);
    ageDlg.addEventListener('click', e => { if (e.target === ageDlg) ageDlg.close(); });
    ageDlg.addEventListener('close', () => { const h = ageDlg._handlers; ageDlg._handlers = null; if (h && !h.answered) h.onDismiss(); if (ageDlg._opener && document.body.contains(ageDlg._opener)) ageDlg._opener.focus({ preventScroll: true }); });
  }
  if (ageDlg.open) return;
  const handlers = ageDlg._handlers = { onAnswer, onDismiss, answered: false };
  ageDlg._opener = document.activeElement;
  const x = `<button type="button" class="vp-x" data-close aria-label="Close">${icon('close')}</button>`;
  ageDlg.innerHTML = `<div class="vs-head"><h2 id="ageTitle">${fx.t({ explorer: 'How old are you?', challenger: 'How old are you?', pro: 'How old is this player?' })}</h2>${x}</div>
    <p id="ageSub" class="vs-sub">${fx.t({ explorer: 'Tap your age. A grown-up can help you.', challenger: 'Pick your age. We ask once, and the answer stays on this device.', pro: 'We ask once per player. The answer stays on this device and is never sent.' })}</p>
    <div class="vs-ages" role="group" aria-labelledby="ageTitle">${AGES.map(([v, l]) => `<button type="button" class="md-chip" data-age="${v}">${l}</button>`).join('')}</div>
    <p class="vs-foot"><button type="button" class="md-btn md-btn--sm" data-close>Not now</button></p>`;
  ageDlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => ageDlg.close());
  ageDlg.querySelectorAll('[data-age]').forEach(b => b.onclick = () => {
    const v = b.dataset.age === 'adult' ? 'adult' : Number(b.dataset.age);
    store.setAge(v); handlers.answered = true; fx.sfx('pop'); track('age-answer', 'Vedic Math: age question answered');
    if (cloud.canPost() === 'ok') { ageDlg.close(); handlers.onAnswer(); return; }
    /* Under 13: the score stays here until a grown-up gives the Parent step */
    ageDlg.innerHTML = `<div class="vs-head"><h2 id="ageTitle">${fx.t({ explorer: 'Saved on this device', challenger: 'Saved on this device', pro: 'Saved on this device' })}</h2>${x}</div>
      <p id="ageSub" class="vs-sub">${fx.t({ explorer: 'Your score is on the This device board. Ask a grown-up to turn on World boards.', challenger: 'Your score is on the This device board. Ask a grown-up to turn on World boards.', pro: 'The score ranks on the This device board. Ask a grown-up to turn on World boards.' })}</p>
      <p class="vs-foot"><a class="md-btn md-btn--sm md-btn--primary" href="#/me" data-grownup>For grown-ups: turn on World boards</a> <button type="button" class="md-btn md-btn--sm" data-close>OK</button></p>`;
    ageDlg.querySelectorAll('[data-close]').forEach(c => c.onclick = () => ageDlg.close());
    ageDlg.querySelector('[data-grownup]').onclick = e => {
      focusWorldBoards = true; ageDlg._opener = null; ageDlg.close(); handlers.onAnswer();
      if (location.hash === '#/me') { e.preventDefault(); meView(); } /* already there: no hashchange, so draw it here */
    };
    ageDlg.querySelector('[data-close]:not(.vp-x)').focus();
  });
  ageDlg.showModal();
  ageDlg.querySelector('[data-age]').focus();
}

/* The Parent step's adult check: a 4-digit number written in words, to type in digits. Simple for any adult,
   not something a young child reads at a glance. A presence check, not age verification; nothing is stored. */
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function inWords(n) {
  const th = Math.floor(n / 1000), h = Math.floor(n / 100) % 10, r = n % 100;
  const rest = r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : '');
  return `${ONES[th]} thousand${h ? `, ${ONES[h]} hundred` : ''}${r ? ` and ${rest}` : ''}`;
}
function worldBoardsHTML(p) {
  const gate = cloud.canPost(p);
  if (!cloud.enabled()) return '<p>World boards are switched off on this site, so every score stays on this device.</p>';
  if (gate === 'needs-age') return `<p>${fx.t({ explorer: 'Before a score goes on a World board, there is one question to answer.', challenger: 'Before a score goes on a World board, there is one question to answer.', pro: 'Before anything is posted to a World board, each player answers one question.' })}</p><button type="button" class="md-btn md-btn--sm" id="wbAsk">Answer the question</button>`;
  if (!cloud.isUnder13(p)) return `<p>${fx.t({ explorer: 'Your scores and weekly Sparks go on World boards.', challenger: 'Your scores and weekly Sparks go on World boards.', pro: "This player's scores and weekly Sparks post to World boards." })}</p>`;
  const sw = on => `<button type="button" class="md-switch" role="switch" id="wbSwitch" aria-checked="${on}"><span>Allow World boards for ${esc(p.name)}</span><span class="md-track" aria-hidden="true"><span class="md-knob"></span></span></button>`;
  if (p.parentOk) return `<p>A grown-up turned on World boards for this player on ${new Date(p.parentOk).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Turning it off stops posting; entries already on World boards stay until removed on request.</p>${sw(true)}`;
  const n = 1001 + Math.floor(Math.random() * 8999);
  return `<p>${fx.t({ explorer: 'Your scores stay on this device. A grown-up can turn on World boards here.', challenger: 'Your scores stay on this device. Ask a grown-up to turn on World boards here.', pro: "This player's scores stay on this device until a parent or guardian turns on World boards here." })}</p>
    <form class="wb-check" id="wbCheck" data-n="${n}" novalidate><p class="wb-for"><b>For grown-ups</b></p><label for="wbIn">Type this number in digits: <b class="wb-words">${inWords(n)}</b></label>
      <span class="wb-row"><input id="wbIn" inputmode="numeric" autocomplete="off" aria-describedby="wbErr"><button class="md-btn md-btn--sm md-btn--primary">Check</button></span>
      <span class="wb-err" id="wbErr" role="alert"></span></form>
    <div id="wbOk" hidden><p>Thanks. Turn this on to let ${esc(p.name)} post scores and weekly Sparks to World boards.</p>${sw(false)}</div>`;
}
function wireWorldBoards(root) {
  const box = $('#worldBoards', root); if (!box) return;
  const redraw = (say = '') => { box.querySelector('.wb-body').innerHTML = worldBoardsHTML(store.player()); wireWorldBoards(root); if (say) $('#wbMsg', root).textContent = say; };
  const ask = $('#wbAsk', box); if (ask) ask.onclick = () => askAge({ onAnswer: () => { redraw(); queueSparksPost(); }, onDismiss: () => {} });
  const form = $('#wbCheck', box);
  if (form) form.onsubmit = e => {
    e.preventDefault();
    const typed = $('#wbIn', form).value.replace(/[\s,.]/g, '');
    if (typed !== form.dataset.n) { $('#wbErr', form).textContent = 'That is not the number. Try again.'; $('#wbIn', form).focus(); return; }
    form.hidden = true; $('#wbOk', box).hidden = false; $('#wbSwitch', box).focus();
  };
  const sw = $('#wbSwitch', box);
  if (sw) sw.onclick = () => {
    if (sw.getAttribute('aria-checked') === 'true') { store.setParentOk(false); track('parent-step/off', 'Vedic Math: World boards turned off'); redraw('World boards are off for this player. Nothing more is posted; entries already posted stay.'); }
    else { store.setParentOk(true); track('parent-step/on', 'Vedic Math: World boards turned on'); redraw('World boards are on for this player.'); queueSparksPost(); }
    const again = $('#wbSwitch', box) || $('#wbIn', box); if (again) again.focus();
  };
}

/* ---------- Guide and first-visit tour (openspec in-app-guide) ---------- */
/* The guide's data is js/guide.js, its pictures js/guide-art.js, the tour js/tour.js. Counts come from the catalogs. */
const guideCounts = () => ({ skills: SKILLS.length - TRICKS.length, tricks: TRICKS.length, belts: BELTS.length, katasPer: LV.KATAS_PER_TRICK, kataCount: LV.KATA_COUNT,
  sutras: SUTRAS.length, subsutras: SUBSUTRAS.length, games: GAMES.length, levelsPerGame: LEVELS_PER_GAME, chapters: LV.TOPICS.length, perChapter: LV.PER_CHAPTER,
  challenges: LV.CHALLENGE_COUNT, badges: gm.BADGES.length, videoMinutes: W.MAX_LENGTH / 60, starsPerBelt: gm.STARS_PER_BELT });
/* Take the tour (guide, Home note): the next Home render plays it whatever vm.tour says */
let tourAsked = false;
function askTour() { tourAsked = true; if ((location.hash || '#/') === '#/' || location.hash === '#') render(); else location.hash = '#/'; }
/* "New here?" on Home while the Player has not played on an earlier day */
function newHereHTML() {
  if (store.playedBefore()) return '';
  return `<p class="gd-new"><span class="gd-new-ic" aria-hidden="true">${icon('map')}</span><span>New here? <a href="#/guide">See how everything works</a> or <button type="button" class="linkbtn" id="tourAgain">take the tour</button>.</span></p>`;
}
/* On Home: the tour when it is due (a Player with a Mode and no Sparks, on a device that has never shown it) or asked
   for. It starts once the route has drawn the menu chip and focused the heading. */
function homeTour(signal) {
  const again = $('#tourAgain'); if (again) again.onclick = askTour;
  const replay = tourAsked; tourAsked = false;
  if (!signal || !fx.mode()) return;
  if (!replay && !tourDue({ mode: fx.mode(), state: tourState(), hash: location.hash, fresh: store.sparks() === 0 })) return;
  later(() => {
    const has = sel => { const el = document.querySelector(sel); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const steps = resolveTour(has, fx.mode());
    if (!steps.length) return;
    setTourState('shown'); metrics.tourEvent('start');
    startTour(steps, { signal, onEnd: outcome => { if (outcome === 'finish') { setTourState('done'); metrics.tourEvent('finish'); } else { setTourState('skipped'); metrics.tourEvent('skip'); } } });
  }, 300, signal);
}
function guideView(section, { signal } = {}) {
  const m = fx.mode() || null, mode = m || 'challenger', explorer = m === 'explorer';
  document.title = `Guide: ${BRAND} · Madhav`;
  const list = sectionsFor(mode, guideCounts()), groups = GROUPS.map(g => ({ g, items: list.filter(s => s.group === g.id) })).filter(x => x.items.length);
  const T = v => esc(say(v, mode));
  const tryHTML = s => {
    const t = tryFor(s, mode); if (!t) return '';
    if (t.action === 'tour' && !m) return '';
    const main = t.action ? `<button type="button" class="md-btn md-btn--sm md-btn--primary gd-try" data-gd="${t.action}">${esc(t.label)}</button>` : `<a class="md-btn md-btn--sm md-btn--primary gd-try" href="${esc(t.href)}">${esc(t.label)}</a>`;
    return `<p class="gd-acts">${main}${t.more ? ` <a class="md-btn md-btn--sm" href="${esc(t.more.href)}">${esc(t.more.label)}</a>` : ''}</p>`;
  };
  const card = s => `<article class="gd-sec md-card" id="gd-${s.id}" aria-labelledby="gdh-${s.id}">
      <div class="gd-art">${artFor(s.art)}</div>
      <div class="gd-body"><h3 class="mq-h3 gd-h" id="gdh-${s.id}">${T(s.title)}</h3>
        <p class="gd-what"><b class="gd-k">What it is</b> ${T(s.what)}</p>
        <p class="gd-k" id="gdk-${s.id}">${explorer ? 'How to do it' : 'How to use it'}</p>
        <ol class="gd-how" aria-labelledby="gdk-${s.id}">${s.how.map(h => `<li>${T(h)}</li>`).join('')}</ol>
        <p class="gd-tip"><b class="gd-k">Tip</b> ${T(s.tip)}</p>
        ${s.parentNote ? parentNote() : ''}${tryHTML(s)}</div></article>`;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap gd">
    ${crumbs([null, 'Guide'])}
    <span class="md-tag md-tag--teal">Guide</span>
    <h1 class="md-heading">${fx.t({ explorer: 'How to play', challenger: 'How to use Vedic Math', pro: 'How to use Vedic Math' })}</h1>
    <p class="md-lede">${fx.t({ explorer: 'Everything you can do here, one part at a time. The button under each part takes you there.', challenger: 'Every part of the app, what it is for and how to use it. The button under each section takes you straight there.', pro: 'Every part of the app, what it is for and how to use it, with a link to each one.' })}</p>
    ${m ? `<p class="mode-line">Words for: <b>${fx.MODES[m].name}</b> <a href="#/me">Change</a></p><p class="gd-top"><button type="button" class="md-btn md-btn--primary" data-gd="tour">${icon('map')} ${explorer ? 'Show me around' : 'Take the tour'}</button></p>`
      : '<div class="md-card gd-nomode"><p>Pick a play mode first: Explorer, Challenger or Pro. It sets the words, the questions and your league. This guide uses the Challenger words until you do.</p><p><a class="md-btn md-btn--primary" href="#/">Pick a play mode</a></p></div>'}
    <nav class="gd-toc md-card" aria-label="Guide contents"><ul>${groups.map(({ g, items }) => `<li><a href="#/guide/${items[0].id}" class="gd-toc-g">${T(g.title)}</a><ul>${items.map(s => `<li><a href="#/guide/${s.id}">${T(s.title)}</a></li>`).join('')}</ul></li>`).join('')}</ul></nav>
    ${groups.map(({ g, items }) => `<section class="gd-group" aria-labelledby="gdg-${g.id}"><h2 class="mq-strand" id="gdg-${g.id}">${T(g.title)}</h2><div class="gd-grid">${items.map(card).join('')}</div></section>`).join('')}
  </div></section>`;
  on(view, 'click', e => {
    const b = e.target.closest('[data-gd]'); if (!b) return;
    if (b.dataset.gd === 'tour') askTour();
    else if (b.dataset.gd === 'music') { e.stopPropagation(); window.scrollTo({ top: 0 }); const mb = $('#vmMBtn'); if (mb && mb.getAttribute('aria-expanded') !== 'true') mb.click(); const first = $('#vmMPanel [data-t]'); if (first) first.focus({ preventScroll: true }); }
  }, signal);
  /* #/guide/<section>: focus its heading now (so the router leaves focus there), scroll to it once the router is done */
  const sec = section && $(`#gd-${CSS.escape(section)}`);
  if (sec) {
    const h = sec.querySelector('.gd-h'); h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
    if (signal) later(() => sec.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }), 0, signal);
  }
}

/* ---------- Me: profile, badges, players, settings ---------- */
/* "Try the new Sky" (openspec sky-home): Challenger and Pro only, per Player, off until turned on */
function skySwitchHTML(p) {
  if (p.mode !== 'challenger' && p.mode !== 'pro') return '';
  const on = SKY.skyOn(p);
  return `<div class="me-sky md-card"><button type="button" class="md-switch" role="switch" id="skySwitch" aria-checked="${on}" aria-describedby="skyAbout"><span>Try the new Sky</span><span class="md-track" aria-hidden="true"><span class="md-knob"></span></span></button>
    <p class="mq-small" id="skyAbout">${fx.t({ challenger: 'Your home becomes a sky of Stars: one Constellation for each Sutra, three Stars for each Trick, and Bolt to show the way.', pro: 'Home becomes a map of every Trick\'s three Stars, grouped by Sutra, with a suggested path in Belt order.' })} Prefer a list? <a href="#/places">All places</a></p>
    <p class="pr-say" id="skyMsg" role="status" aria-live="polite"></p></div>`;
}
function meView() {
  document.title = `Me: ${BRAND} · Madhav`;
  const p = store.player(), T = gm.titleInfo(), got = store.badges(), done = SKILLS.filter(s => store.mastered(s.id)).length;
  view.innerHTML = `<section class="md-section mq-tight"><div class="md-wrap">
    ${crumbs([null, 'Me'])}
    <div class="me-head md-card">${avatar(p, 84)}<div><h1 class="mq-h1">${esc(p.name)}</h1><p>${T.title} · ${store.sparks()} Sparks</p>${titleBar(T)}<p class="mq-small">${T.next ? `${T.need - T.into} Sparks to ${T.next}` : 'You hold the top Title.'}</p>
      <div class="me-acts"><button class="md-btn md-btn--sm" id="meName">New nickname</button>${store.AVATARS.map(c => `<button class="av-pick av av-${c}" data-c="${c}" aria-label="Color ${c}" aria-pressed="${c === p.avatar}"></button>`).join('')}</div>${parentNote()}</div></div>
    <h2 class="mq-strand" id="wbH">World boards</h2>
    <div class="md-card wb-card" id="worldBoards" role="region" aria-labelledby="wbH"><div class="wb-body">${worldBoardsHTML(p)}</div><p class="pr-say" id="wbMsg" role="status" aria-live="polite"></p></div>
    <div class="mq-stats me-stats"><div class="md-stat"><div class="md-kicker">Skills mastered</div><div class="md-value">${done}</div><p>of ${SKILLS.length}</p></div><div class="md-stat"><div class="md-kicker">Day streak</div><div class="md-value">${store.streakDays()}</div><p>days</p></div><div class="md-stat"><div class="md-kicker">Belts</div><div class="md-value">${gm.beltProgress().filter(b => b.earned).length}</div><p>of ${BELTS.length} · ${litStars()} of ${SKY.PATH.length} Stars lit</p></div></div>
    <h2 class="mq-strand">Badges <small class="mq-small">${Object.keys(got).length} of ${gm.BADGES.length}</small></h2>
    <div class="badge-grid">${gm.BADGES.map(b => `<div class="badge${got[b.id] ? ' got' : ''}"><span class="badge-medal" aria-hidden="true">${icon(got[b.id] ? 'star' : 'lock')}</span><b>${b.name}</b><small>${b.how}</small></div>`).join('')}</div>
    <h2 class="mq-strand">Play mode</h2>
    <div class="mode-pick mode-pick--sm">${Object.entries(fx.MODES).map(([id, m]) => `<button class="mode-card mode-card--${m.color}" data-mode="${id}" aria-pressed="${id === fx.mode()}"><span class="mode-ic" aria-hidden="true">${modeIcon(id)}</span><b>${m.name}</b><small>${m.ages}</small></button>`).join('')}</div>
    <h2 class="mq-strand">Players on this device</h2>
    <div class="players">${store.allPlayers().map(q => `<div class="player${q.id === p.id ? ' on' : ''}">${avatar(q, 40)}<span><b>${esc(q.name)}</b><small>${q.mode ? fx.MODES[q.mode].name : 'No mode yet'}</small></span>${q.id === p.id ? '<em>Playing</em>' : `<button class="md-btn md-btn--sm" data-switch="${q.id}">Switch</button><button class="md-btn md-btn--sm" data-del="${q.id}" aria-label="Remove ${esc(q.name)}">Remove</button>`}</div>`).join('')}
      <button class="md-btn md-btn--sm" id="meAdd">${icon('plus')} Add a player</button></div>
    <h2 class="mq-strand">Settings</h2>
    ${skySwitchHTML(p)}
    <div class="me-set"><label><input type="checkbox" id="setSound" ${fx.soundOn() ? 'checked' : ''}> Sound effects</label><label><input type="checkbox" id="setVoice" ${fx.voiceOn() ? 'checked' : ''}> Read questions aloud</label></div>
    <h3 class="mq-h3" id="calmH">Calm and motion</h3>
    <div class="me-calm" role="group" aria-labelledby="calmH">
      <button type="button" class="md-switch" role="switch" id="setCalm" aria-checked="${fx.calmOn()}" aria-describedby="calmNote"><span>Calm</span><span class="md-track" aria-hidden="true"><span class="md-knob"></span></span></button>
      <p class="mq-small" id="calmNote">No clocks in Practice and nothing moves. Ranked rounds keep their clock. Saved on this device.</p>
      <label class="me-bg"><input type="checkbox" id="setBg" ${bgOn() ? 'checked' : ''}> Moving background</label>
      <div class="me-size"><span id="sizeL">Text size in play</span><div class="play-size" role="group" aria-labelledby="sizeL"><button type="button" class="play-size-b" data-size="a" aria-pressed="${fx.textSize() === 'a'}" aria-label="Normal text">A</button><button type="button" class="play-size-b" data-size="a+" aria-pressed="${fx.textSize() === 'a+'}" aria-label="Larger text">A+</button></div></div>
      <p class="mq-small">Pause motion in the Explore menu stops motion on every page of sbmadhav.com.</p>
    </div>
    ${fx.voiceSettingsHTML()}
    <p class="mq-small">Calm music: use the note button at the top right of the menu bar (singing bowls, tanpura drone, Himalayan dawn, temple chimes).</p>
    <h2 class="mq-strand">Progress by level</h2>
    <div class="mq-prog">${GRADES.map(g => { const st = gradeStats(g.id); return `<a class="mq-prog-row" href="#/grade/${g.id}"><span class="mq-prog-g">${both(g.pro, g.kid)}</span><span class="mq-bar"><i style="width:${pct(st.avg)}%"></i></span><span class="mq-prog-n">${st.done}/${st.total}</span></a>`; }).join('')}</div>
    <h2 class="mq-strand">Backup</h2>
    <p class="mq-data"><button class="md-btn md-btn--sm" id="pExport">Copy backup code</button> <button class="md-btn md-btn--sm" id="pImport">Restore from code</button> <button class="md-btn md-btn--sm" id="pReset">Reset this player</button></p>
    <p class="pr-say" id="pMsg" role="status" aria-live="polite"></p>
    <p class="mq-note">Progress stays in this browser. Leaderboards only ever see your made-up nickname, color and score.</p>
  </div></section>`;
  const msg = t => ($('#pMsg').textContent = t);
  $('#meName').onclick = () => { store.updatePlayer({ name: store.makeName() }); fx.sfx('pop'); meView(); };
  view.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { store.updatePlayer({ avatar: b.dataset.c }); meView(); });
  view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { fx.setMode(b.dataset.mode); gm.startDay(); fx.sfx('level'); meView(); });
  view.querySelectorAll('[data-switch]').forEach(b => b.onclick = () => { store.switchPlayer(b.dataset.switch); fx.applyMode(); fx.sfx('pop'); meView(); });
  view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('Remove this player and their progress from this device?')) { store.removePlayer(b.dataset.del); meView(); } });
  $('#meAdd').onclick = () => { store.addPlayer(); fx.applyMode(); location.hash = '#/'; render(); };
  const sky = $('#skySwitch'); if (sky) sky.onclick = () => { store.updatePlayer({ sky: sky.getAttribute('aria-checked') !== 'true' }); fx.sfx('pop'); meView(); $('#skySwitch').focus(); $('#skyMsg').textContent = SKY.skyOn(store.player()) ? 'The Sky is your home now.' : 'Your home is the tile home again.'; };
  $('#setSound').onchange = e => { fx.setSound(e.target.checked); fx.sfx('ok'); };
  $('#setBg').onchange = e => { setBg(e.target.checked); const t = document.getElementById('vmBg'); if (t) t.checked = e.target.checked; };
  $('#setCalm').onclick = e => { fx.setCalm(!fx.calmOn()); e.currentTarget.setAttribute('aria-checked', String(fx.calmOn())); };
  view.querySelectorAll('.me-size [data-size]').forEach(b => b.onclick = () => { fx.setTextSize(b.dataset.size); view.querySelectorAll('.me-size [data-size]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.size === fx.textSize()))); });
  $('#setVoice').onchange = e => { fx.setVoice(e.target.checked); if (e.target.checked) fx.speak('Read aloud is on.', true); else fx.stopSpeaking(); };
  fx.wireVoiceSettings(view);
  wireWorldBoards(view);
  if (focusWorldBoards) { focusWorldBoards = false; const wb = $('#worldBoards'); wb.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' }); ($('#wbIn') || $('#wbSwitch') || wb).focus({ preventScroll: true }); }
  $('#pExport').onclick = async () => { const code = btoa(unescape(encodeURIComponent(store.exportData()))); try { await navigator.clipboard.writeText(code); msg('Backup code copied. Paste it somewhere safe.'); } catch (e) { prompt('Copy this backup code:', code); } };
  $('#pImport').onclick = () => { const code = prompt('Paste your backup code:'); if (!code) return; try { store.importData(decodeURIComponent(escape(atob(code.trim())))); msg('Progress restored.'); meView(); } catch (e) { msg('That code did not work. Check that it was copied in full.'); } };
  $('#pReset').onclick = () => { if (confirm('Reset all progress for this player?')) { store.reset(); meView(); msg('Progress reset.'); } };
}

/* ---------- Trick animator ---------- */
function animatorHTML(t) {
  return `<div class="anim" id="anim"><h2 class="mq-h3">Watch it work</h2>
    <form class="anim-in" id="animForm">${t.inputs.map((f, i) => `<label>${f.label}<input type="number" inputmode="numeric" min="${f.min}" max="${f.max}" data-i="${i}"></label>`).join('')}
      <div class="anim-btns"><button class="md-btn md-btn--sm md-btn--primary">Show steps</button><button type="button" class="md-btn md-btn--sm" id="animRand">New numbers</button></div></form>
    <p class="anim-err" id="animErr" role="alert"></p>
    <div class="anim-board" id="animBoard" aria-live="polite"></div>
    <div class="anim-nav" id="animNav" hidden><button type="button" class="md-btn md-btn--sm" id="animPrev">Back</button><span id="animPos"></span><button type="button" class="md-btn md-btn--sm md-btn--primary" id="animNext">Next step</button><button type="button" class="md-btn md-btn--sm" id="animAll">Show all</button></div></div>`;
}
function mountAnimator(t, signal) {
  const form = $('#animForm'), ins = [...form.querySelectorAll('input')], board = $('#animBoard'), nav = $('#animNav'), err = $('#animErr'); let steps = [], i = 0, counted = false;
  const fill = vals => ins.forEach((x, k) => (x.value = vals[k]));
  const show = (all = false) => { board.innerHTML = steps.slice(0, all ? steps.length : i + 1).map((s, k) => `<div class="anim-step${k === (all ? steps.length - 1 : i) ? ' cur' : ''}"><div class="anim-show">${s.show}</div><p>${s.say}</p></div>`).join(''); $('#animPos').textContent = `${all ? steps.length : i + 1} / ${steps.length}`; $('#animPrev').disabled = i === 0 && !all; $('#animNext').disabled = all || i === steps.length - 1;
    if ((all || i === steps.length - 1) && !counted) { counted = true; store.bump('tricksWatched'); if (store.markSeen('trick:' + t.id)) store.addSparks(5, 'trick'); } };
  const run = (user = true) => { const vals = ins.map(x => Number(x.value)); if (ins.some(x => x.value === '') || vals.some(v => !Number.isFinite(v))) { err.textContent = 'Fill in every number.'; return; } const bad = t.valid(vals); err.textContent = bad || ''; if (bad) { board.innerHTML = ''; nav.hidden = true; return; } steps = t.steps(vals); i = 0; counted = !user; nav.hidden = false; show(); if (user) track('trick/' + t.id, 'Trick: ' + t.title); };
  on(form, 'submit', e => { e.preventDefault(); fx.sfx('tap'); run(); }, signal);
  on($('#animRand'), 'click', () => { let v; do { v = t.random(); } while (t.valid(v)); fill(v); fx.sfx('pop'); run(); }, signal);
  on($('#animPrev'), 'click', () => { i = Math.max(0, i - 1); show(); }, signal);
  on($('#animNext'), 'click', () => { i = Math.min(steps.length - 1, i + 1); fx.sfx('tap'); show(); }, signal);
  on($('#animAll'), 'click', () => { i = steps.length - 1; show(true); }, signal);
  let v; do { v = t.random(); } while (t.valid(v)); fill(v); run(false);
}

/* ---------- Icons (24px line icons, currentColor) ---------- */
function icon(n) {
  const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const I = {
    blocks: `<rect x="3" y="3" width="4" height="18" rx="1" ${P}/><rect x="9" y="3" width="4" height="18" rx="1" ${P}/><rect x="15" y="15" width="6" height="6" rx="1" ${P}/>`,
    bolt: `<path d="M13 2L4 14h7l-1 8 9-12h-7z" ${P}/>`,
    game: `<rect x="2.5" y="7" width="19" height="11" rx="5" ${P}/><path d="M7 10.5v4M5 12.5h4" ${P}/><circle cx="15.5" cy="11.5" r="1.2" fill="currentColor"/><circle cx="18" cy="14" r="1.2" fill="currentColor"/>`,
    balloon: `<ellipse cx="12" cy="9" rx="6" ry="7" ${P}/><path d="M12 16l-1 2h2l-1-2M12 18c0 2-2 2-2 4" ${P}/>`,
    dots: `<circle cx="6" cy="6" r="2" fill="currentColor"/><circle cx="12" cy="6" r="2" fill="currentColor"/><circle cx="18" cy="6" r="2" fill="currentColor"/><circle cx="6" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><rect x="3" y="3" width="18" height="12" rx="2" ${P}/>`,
    scale: `<path d="M12 4v16M5 20h14M4 8h16M7 8l-3 6h6zM17 8l-3 6h6z" ${P}/>`,
    ten: `<rect x="3" y="7" width="18" height="10" rx="2" ${P}/><path d="M6.6 7v10M10.2 7v10M13.8 7v10M17.4 7v10M3 12h18" ${P}/>`,
    plus: `<path d="M12 5v14M5 12h14" ${P}/>`,
    eye: `<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" ${P}/><circle cx="12" cy="12" r="3" ${P}/>`,
    shape: `<circle cx="7" cy="8" r="4" ${P}/><rect x="13" y="4" width="8" height="8" rx="1" ${P}/><path d="M12 14l5 7H7z" ${P}/>`,
    trophy: `<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8M9 18h6" ${P}/>`,
    duel: `<path d="M4 20l7-7M9 20H4v-5M20 20l-7-7M15 20h5v-5M8 4l4 4 4-4" ${P}/>`,
    map: `<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" ${P}/>`,
    cards: `<rect x="3" y="6" width="12" height="15" rx="2" ${P}/><path d="M7 3h10a2 2 0 0 1 2 2v13" ${P}/>`,
    play: `<circle cx="12" cy="12" r="9" ${P}/><path d="M10 8.5l5 3.5-5 3.5z" ${P}/>`,
    link: `<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" ${P}/>`,
    belt: `<path d="M3 10h18v4H3z" ${P}/><path d="M10 9h4v6h-4zM11 15l-2 5M13 15l2 5" ${P}/>`,
    speaker: `<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" ${P}/>`,
    star: `<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" ${P}/>`,
    loop: `<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" ${P}/>`,
    close: `<path d="M6 6l12 12M18 6L6 18" ${P}/>`,
    lock: `<rect x="5" y="11" width="14" height="10" rx="2" ${P}/><path d="M8 11V8a4 4 0 0 1 8 0v3" ${P}/>`
  };
  return `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">${I[n] || ''}</svg>`;
}

/* ---------- Boot ---------- */
const rm = $('#resetMode'); if (rm) rm.onclick = () => { store.updatePlayer({ mode: null }); fx.applyMode(); location.hash = '#/'; render(); window.scrollTo({ top: 0 }); };
fx.applyMode();
fx.applyPrefs(); /* body.calm and body.text-plus from this device's Calm and text size */
gm.init();
metrics.returnCheck(); /* before the first route view: remembers this device's first visit */
render();
initAmbient();
/* Offline: sw.js (scope /vedic-math/) saves this version of the app after the page has loaded. Not on plain http, except localhost for testing. */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
  const registerSW = () => navigator.serviceWorker.register('/vedic-math/sw.js', { scope: '/vedic-math/' }).catch(() => {});
  if (document.readyState === 'complete') registerSW(); else addEventListener('load', registerSW, { once: true });
}
