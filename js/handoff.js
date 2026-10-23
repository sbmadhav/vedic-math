/* The hand-off import page, /import/ (openspec change learnvedicmath, design D9, progress-handoff spec).

   The moved page on the old site sends a Player here with their progress in the fragment: #v=1&d=<payload>&r=<route>.
   The page's first inline script copies the fragment into window.lvmHandoff and clears it from the address bar
   (history.replaceState) before anything else runs, analytics included; this module then:
   1. decodes it (at most 256 KB decompressed) and checks it against js/handoff-schema.js, strictly; anything else
      imports nothing and says so;
   2. asks once, showing what will come over (built with textContent only; nothing from the payload becomes markup);
   3. if this device already has progress here, offers "Keep this device's", "Use the old site's" or "Keep both" (the
      old site's Players added next to these; one Player's progress is never merged with another's);
   4. writes, records vm.migratedAt, and opens the game on the original route.
   applyHandoff and progressHere are pure (storage passed in), for test/handoff.test.mjs. */
import { readFragment, decode, validatePayload, MAX_PLAYERS, PART_NAMES } from './handoff-schema.js';

const PLAY_RE = /^vm\.play\.(p[0-9a-z]{1,12})\.([a-z][a-z0-9-]{0,31})$/;
const json = (st, k) => { try { return JSON.parse(st.get(k)); } catch (e) { return null; } };

/* Players saved here, and whether any of them has progress (a first visit to /play/ makes a blank p1, which is not) */
export function progressHere(st) {
  const P = json(st, 'vm.players');
  const list = P && Array.isArray(P.list) ? P.list.filter(p => p && typeof p.id === 'string') : [];
  const played = p => {
    const d = json(st, 'mathquest.v1.' + p.id);
    return !!(d && (d.sparks > 0 || d.xp > 0 || (d.counts && d.counts.answers > 0) || (d.skills && Object.keys(d.skills).length)))
      || st.keys().some(k => k.startsWith(`vm.play.${p.id}.`));
  };
  return { list, has: list.some(played) };
}

/* Ids that must not be reused: Players saved here (when kept) and any id with a World board identity on this device,
   so an imported Player never signs in as someone else (js/cloud.js keeps one identity per Player id). */
function newId(taken) {
  let t = Date.now(), id;
  do id = 'p' + (t++).toString(36); while (taken.has(id));
  taken.add(id);
  return id;
}

/* Writes a validated payload. choice: 'replace' (this device's Players and progress give way, also used when there is
   none) or 'both' (the old site's Players are added; this device's settings win). Returns the Players written.
   All or nothing: every write and removal is planned first, every key it touches is saved as it was, and if any write
   fails (a full storage throws QuotaExceededError) every touched key is put back exactly as it was before the error is
   rethrown, so this device never ends up with its progress gone and the import half written.
   moved: false when the payload is a backup code restored on the Me page (js/store.js), which is not a move from the
   old site, so vm.migratedAt is left alone. */
export function applyHandoff(st, payload, choice, now = Date.now(), moved = true) {
  const here = progressHere(st);
  const uids = json(st, 'vm.cloudUids') || {};
  const withIdentity = new Set(Object.keys(uids));
  if (st.get('vm.cloudUid')) withIdentity.add('p1');
  const taken = new Set([...withIdentity, ...(choice === 'both' ? here.list.map(p => p.id) : [])]);
  const rename = {};
  for (const p of payload.players.list) rename[p.id] = taken.has(p.id) ? newId(taken) : p.id;
  for (const id of Object.values(rename)) taken.add(id);

  const plan = []; // [key, value] to write, or [key, null] to remove, in order
  if (choice === 'replace') {
    // This device's Players go, as if removed on the Me page: their records, play records and identities
    const gone = here.list.map(p => p.id);
    for (const k of st.keys()) if (/^mathquest\.v1(\.|$)/.test(k) || PLAY_RE.test(k) || k === 'vm.board') plan.push([k, null]);
    const forget = new Set(json(st, 'vm.cloudForget') || []);
    for (const id of gone) if (withIdentity.has(id) && id !== 'p1') forget.add(id);
    for (const id of gone) delete uids[id];
    plan.push(['vm.cloudUid', null]);
    if (st.get('vm.cloudUids') !== null) plan.push(['vm.cloudUids', JSON.stringify(uids)]);
    if (forget.size) plan.push(['vm.cloudForget', JSON.stringify([...forget])]);
  }
  for (const [id, r] of Object.entries(payload.records)) plan.push(['mathquest.v1.' + rename[id], JSON.stringify(r)]);
  for (const [id, m] of Object.entries(payload.play || {})) for (const [k, v] of Object.entries(m)) plan.push([`vm.play.${rename[id]}.${k}`, JSON.stringify(v)]);
  for (const [k, v] of Object.entries(payload.settings)) if (choice === 'replace' || st.get(k) === null) plan.push([k, v]);
  const incoming = payload.players.list.map(p => ({ ...p, id: rename[p.id] }));
  const list = choice === 'both' ? [...here.list, ...incoming] : incoming;
  plan.push(['vm.players', JSON.stringify({ active: rename[payload.players.active], list })]);
  if (moved) plan.push(['vm.migratedAt', String(now)]);

  const before = new Map();
  for (const [k] of plan) if (!before.has(k)) before.set(k, st.get(k));
  try {
    for (const [k, v] of plan) { if (v === null) st.remove(k); else st.set(k, v); }
  } catch (e) {
    restore(st, before);
    throw e;
  }
  return incoming;
}

/* Puts every saved key back: first removes the ones that did not exist (the import's own keys free their space), then
   writes the old values, which fitted before */
function restore(st, before) {
  for (const [k, v] of before) if (v === null) st.remove(k);
  for (const [k, v] of before) if (v !== null) { try { st.set(k, v); } catch (e) { /* cannot happen: the value fitted before */ } }
}

/* ---------- the page ---------- */
const local = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => localStorage.setItem(k, v),
  remove: k => { try { localStorage.removeItem(k); } catch (e) {} },
  keys: () => { try { return Object.keys(localStorage); } catch (e) { return []; } },
};
/* Fixed buckets only (analytics D11): math/handoff/<accepted|replaced|merged|kept|declined|invalid|error> */
const track = (name, title) => { try { if (window.siteTrack) window.siteTrack(name, title); } catch (e) {} };
const $ = id => document.getElementById(id);
const show = id => { for (const s of ['ho-offer', 'ho-bad', 'ho-none', 'ho-error']) $(s).hidden = s !== id; };
const sparksOf = r => Math.floor((r && (r.sparks || r.xp)) || 0);
const play = route => location.replace('/play/' + (route || ''));

async function start() {
  const raw = typeof window.lvmHandoff === 'string' ? window.lvmHandoff : '';
  delete window.lvmHandoff;
  if (location.hash) history.replaceState(null, '', location.pathname); // already done by the page; never leave it
  const f = readFragment(raw);
  if (!f || !f.d) { $('ho-title').textContent = 'Nothing to bring over'; show('ho-none'); return; }
  let checked;
  try { checked = f.v === '1' ? validatePayload(await decode(f.d)) : { ok: false }; } catch (e) { checked = { ok: false }; }
  if (!checked.ok) {
    $('ho-title').textContent = 'Nothing to bring over';
    show('ho-bad');
    track('math/handoff/invalid', 'Hand-off: invalid link');
    return;
  }
  const payload = checked.value, route = f.route;
  const list = $('ho-list');
  for (const p of payload.players.list) {
    const li = document.createElement('li');
    const s = sparksOf(payload.records[p.id]);
    li.textContent = `${p.name}: ${s.toLocaleString('en')} Spark${s === 1 ? '' : 's'}`;
    list.append(li);
  }
  if (payload.dropped && payload.dropped.length) {
    $('ho-dropped').textContent = `Too much to fit in one link, so these stay on the old site: ${payload.dropped.map(p => PART_NAMES[p]).join(', ')}.`;
    $('ho-dropped').hidden = false;
  }
  const here = progressHere(local);
  if (here.has) {
    $('ho-fresh').hidden = true; $('ho-conflict').hidden = false;
    $('ho-here').textContent = here.list.map(p => (typeof p.name === 'string' ? p.name : 'A Player')).join(', ');
    if (here.list.length + payload.players.list.length > MAX_PLAYERS) $('ho-merge').hidden = true;
  }
  show('ho-offer');
  const done = (choice, counted) => {
    try { applyHandoff(local, payload, choice); } catch (e) {
      // Nothing changed (applyHandoff put every key back). The count goes first, while the address holds no payload;
      // then the fragment returns to the address bar, so a reload after making room tries again.
      track('math/handoff/error', 'Hand-off: could not save');
      try { history.replaceState(null, '', location.pathname + raw); } catch (err) { /* the link still works from the old site */ }
      show('ho-error');
      return;
    }
    counted();
    play(route);
  };
  const click = (id, fn) => $(id).addEventListener('click', fn, { once: true });
  click('ho-bring', () => done('replace', () => track('math/handoff/accepted', 'Hand-off: brought')));
  click('ho-use', () => done('replace', () => track('math/handoff/replaced', 'Hand-off: replaced this device')));
  click('ho-merge', () => done('both', () => track('math/handoff/merged', 'Hand-off: kept both')));
  click('ho-not-now', () => { track('math/handoff/declined', 'Hand-off: not now'); play(route); });
  click('ho-keep', () => { track('math/handoff/kept', 'Hand-off: kept this device'); play(route); });
  $('ho-title').focus();
}

/* Only on the import page itself (js/store.js imports this module for applyHandoff; unit tests give it a bare document) */
if (typeof document !== 'undefined' && typeof document.getElementById === 'function' && document.getElementById('handoff')) start();
