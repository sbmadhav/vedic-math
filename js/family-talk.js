/* Talking with the Family (openspec family-helpers step 3, helper-conversation spec, design D15 and D18; ADR 0015): the
   chat box in a Visit's bubble, for a Player 13 and over who turned "Talk with the Family" on in Me. js/family-view.js
   loads this module only for such a Player (js/family-hook.js talkOn), and the box appears only when the conversation
   is switched on at the server (GET /api/family/v1/status), so nothing here runs for anyone else.
   - Text only: the Player types, and Bolt, Shunya, Nava or Eka answer in the bubble, up to two replies, one at a time.
     No audio is requested for a reply.
   - What leaves: exactly { skillId, numbers, words } (this question's words: the Player's messages and the replies so
     far) to our own route, with a family-scope session ticket in a header, issued once per browser session after a
     Cloudflare Turnstile check (sessionStorage vm.familyTicket, 30 minutes). Email addresses, phone numbers and runs
     of 4 or more digits that are not the question's are stripped first (shared/src/family-talk.ts stripPersonal).
     Never the Nickname, a Player id, the Age or Grade answer, or words from another question.
   - The four actions are checked against the question and the Skill before anything is drawn (checkActions), the first
     clue on a question counts as the round's Hint, and nothing here touches the round's tries, Score or settings.
   - Offline, at the cap, on a slow answer or any failure: a scripted line from the table the Worker uses, no error.
   Every listener and timer goes through js/life.js with the Visit's signal (test/lifecycle-scan.test.mjs). */
import * as metrics from './metrics.js';
import { on, later, onAbort } from './life.js';
import { boltHTML } from './bolt.js';
import { friendSVG } from './family.js';
import { PART_LABELS, MAX_MESSAGE, MAX_LINE, talkSkill, questionNumbers, skillFacts, stripPersonal, checkActions, cluesUsed, leaksAnswer, scriptedLine, scriptedReply, isSpeaker } from '../shared/src/family-talk.ts';

export const STATUS_URL = '/api/family/v1/status';
export const TURN_URL = '/api/family/v1/turn';
export const SESSION_URL = '/api/session';
export const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
export const TICKET_HEADER = 'x-vm-ticket';
export const NOTE = "Don't share your name or where you live.";
const TICKET = 'vm.familyTicket';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* The one status read per page: { on, siteKey }. Anything but a clear yes means off (scripted help only). */
let status = null;
export function readStatus() {
  if (!status) status = fetch(STATUS_URL).then(r => (r.ok ? r.json() : null)).then(s => ({ on: !!s && s.on === true && typeof s.siteKey === 'string' && !!s.siteKey, siteKey: (s && s.siteKey) || '' })).catch(() => ({ on: false, siteKey: '' }));
  return status;
}

/* This question's words, in memory only: the Player's messages and the replies, under the question's key (a new
   question starts fresh, and a Visit reopened on the same question continues them, so the clue count holds) */
const mem = { key: null, words: [] };
export const wordsFor = key => { if (mem.key !== key) { mem.key = key; mem.words = []; } return mem.words; };

/* ---------- The ticket: one Turnstile check per browser session (design D18) ---------- */
const savedTicket = () => { try { const t = JSON.parse(sessionStorage.getItem(TICKET)); return t && typeof t.ticket === 'string' && t.expires > Date.now() + 5000 ? t.ticket : null; } catch (e) { return null; } };
const saveTicket = t => { try { sessionStorage.setItem(TICKET, JSON.stringify(t)); } catch (e) {} };
export const clearTicket = () => { try { sessionStorage.removeItem(TICKET); } catch (e) {} };
let turnstileLoad = null;
/* Turnstile's script, loaded once, from the one third party this module reaches (THIRD_PARTIES in build.py) */
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstileLoad) turnstileLoad = new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = TURNSTILE_SRC; s.async = true; s.defer = true;
    s.onload = () => { if (window.turnstile) ok(window.turnstile); else { turnstileLoad = null; no(new Error('turnstile')); } };
    s.onerror = () => { turnstileLoad = null; s.remove(); no(new Error('turnstile')); };
    document.head.append(s);
  });
  return turnstileLoad;
}
/* The saved ticket, or the Turnstile check in the bubble and a new ticket from our own route */
async function ensureTicket(siteKey, host, signal) {
  const have = savedTicket(); if (have) return have;
  const ts = await loadTurnstile();
  const box = host.querySelector('.fh-turnstile'); box.hidden = false;
  const token = await new Promise((ok, no) => {
    let id = null, settled = false;
    const done = (fn, v) => { if (settled) return; settled = true; try { if (id != null) ts.remove(id); } catch (e) {} box.hidden = true; fn(v); };
    later(() => done(no, new Error('turnstile timeout')), 30000, signal);
    onAbort(signal, () => done(no, new Error('left')));
    try { id = ts.render(box, { sitekey: siteKey, callback: t => done(ok, t), 'error-callback': () => done(no, new Error('turnstile')) }); } catch (e) { done(no, e); }
  });
  const res = await fetch(SESSION_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scope: 'family', token }), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('session ' + res.status);
  const t = await res.json();
  if (!t || typeof t.ticket !== 'string') throw new Error('ticket');
  saveTicket({ ticket: t.ticket, expires: Number(t.expires) || Date.now() + 25 * 60000 });
  return t.ticket;
}

/* ---------- One turn ---------- */
/* The request to our own route, its answer checked once more here, or a scripted reply when anything fails (offline,
   the cap, a slow answer, a refused ticket): never an error for the Player */
export async function askFamily({ row, nums, words, facts, siteKey, host, signal }) {
  const last = words.length ? words[words.length - 1].line : '';
  try {
    const ticket = await ensureTicket(siteKey, host, signal);
    const res = await fetch(TURN_URL, { method: 'POST', headers: { 'content-type': 'application/json', [TICKET_HEADER]: ticket }, body: JSON.stringify({ skillId: row.id, numbers: nums, words }), signal: AbortSignal.timeout(15000) });
    if (res.status === 401) clearTicket(); /* the ticket ran out: the next message checks again */
    if (!res.ok) throw new Error('turn ' + res.status);
    const out = await res.json();
    const lines = (Array.isArray(out && out.lines) ? out.lines : []).filter(l => l && isSpeaker(l.speaker) && typeof l.line === 'string' && l.line.trim()).slice(0, 2)
      .map(l => ({ speaker: l.speaker, line: leaksAnswer(row, nums, l.line) ? scriptedLine(l.speaker, 'safe', facts) : l.line.slice(0, MAX_LINE), clue: l.clue === true }));
    if (!lines.length) throw new Error('empty');
    return { lines, actions: checkActions(out.actions, row, nums), source: out.source === 'scripted' ? 'scripted' : 'model' };
  } catch (e) {
    if (signal.aborted) return null;
    const s = scriptedReply(facts, last);
    return { lines: s.lines, actions: checkActions(s.actions, row, nums), source: 'scripted' };
  }
}

/* A reply as a turn of the Visit (js/family-view.js draw): the line escaped, the actions drawn with the first line */
function turnFor(l, actions, row, facts, api) {
  const t = { friend: l.speaker, html: esc(l.line), pose: 'talk', extra: '' };
  for (const a of actions) {
    if (a.type === 'showExample') { t.steps = row.steps(a.numbers).map(esc); t.example = { q: esc(row.question(a.numbers)), answer: esc(String(row.answer(a.numbers))) }; }
    else if (a.type === 'showSutra') t.extra += `<p class="fh-sutra"><span lang="sa-Latn">${esc(facts.sutra)}</span>: ${esc(facts.meaning)}</p>`;
    else if (a.type === 'pointAt') { t.extra += `<p class="fh-point">Look at ${esc(PART_LABELS[a.part] || a.part)}.</p>`; pointAt(api); }
    else if (a.type === 'react') t.pose = a.mood;
  }
  return t;
}
/* pointAt: the question on screen is outlined for a moment (never covered, never changed) */
function pointAt({ r, signal }) {
  const q = r.root.querySelector('.pr-q, #stQ'); if (!q) return;
  q.classList.add('fh-pointed'); later(() => q.classList.remove('fh-pointed'), 3500, signal);
}

/* Mounts the chat box in an open help Visit. el: the Visit (.fh-visit). api, from js/family-view.js:
   { r (the round: root, hint, signal), c: { skill, problem }, signal (the Visit's), addTurns(turns), addCrew(id, svg),
   place() }. Returns whether the box was mounted (a Skill outside the table, or the server switch off, means no). */
export async function mountTalk(el, api) {
  const { c, signal } = api;
  const row = c && c.skill ? talkSkill(c.skill.id) : null, nums = row ? questionNumbers(row.id, c.problem) : null;
  if (!row || !nums) return false;
  const st = await readStatus();
  if (!st.on || signal.aborted || !el.isConnected) return false;
  const facts = skillFacts(row, c.skill), words = wordsFor(`${row.id}:${nums.join(',')}`);
  const form = document.createElement('form'); form.className = 'fh-talk'; form.setAttribute('autocomplete', 'off');
  form.innerHTML = `<label class="md-sr-only" for="fhTalkIn">Ask Bolt and the Family about this question</label>
    <div class="fh-talk-row"><input id="fhTalkIn" class="fh-talk-in" type="text" maxlength="${MAX_MESSAGE}" autocomplete="off" autocapitalize="sentences" placeholder="Ask about this question" aria-describedby="fhTalkNote"><button type="submit" class="md-btn md-btn--sm md-btn--primary fh-talk-send">Send</button></div>
    <p class="mq-small fh-talk-note" id="fhTalkNote">${NOTE}</p><p class="mq-small fh-talk-say" role="status"></p><div class="fh-turnstile" hidden></div>`;
  el.querySelector('.fh-bubble').append(form); el.classList.add('fh-visit--talk'); api.place();
  const input = form.querySelector('.fh-talk-in'), sayEl = form.querySelector('.fh-talk-say');
  let busy = false;
  on(form, 'submit', async e => {
    e.preventDefault();
    if (busy) return;
    const { text, removed } = stripPersonal(input.value, nums);
    if (!text) { sayEl.textContent = removed ? 'Contact details and long numbers stay here. Ask about the math instead.' : ''; return; }
    busy = true; form.classList.add('fh-talk-busy'); input.value = ''; sayEl.textContent = removed ? 'Sent without the contact details or long numbers.' : 'Asking the Family...';
    words.push({ who: 'player', line: text }); metrics.family('talk');
    const out = await askFamily({ row, nums, words, facts, siteKey: st.siteKey, host: form, signal });
    busy = false; form.classList.remove('fh-talk-busy'); sayEl.textContent = '';
    if (!out || signal.aborted || !el.isConnected) return;
    const clue = out.lines.some(l => l.clue) || out.actions.some(a => a.type === 'pointAt');
    out.lines.forEach((l, i) => words.push({ who: l.speaker, line: l.line, ...(i === 0 && clue ? { clue: true } : {}) }));
    if (clue && cluesUsed(words) === 1 && api.r.hint) api.r.hint(); /* the first clue counts as the round's Hint does (design D18) */
    for (const l of out.lines) api.addCrew(l.speaker, l.speaker === 'bolt' ? boltHTML('idle') : friendSVG(l.speaker)); /* each speaker joins the crew the first time they speak */
    api.addTurns(out.lines.map((l, i) => turnFor(l, i === 0 ? out.actions : [], row, facts, api)));
  }, signal);
  return true;
}
