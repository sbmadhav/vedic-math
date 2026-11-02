/* ---------- Backup code (openspec change learnvedicmath, progress-handoff spec "Backup code for every Player") ----------
   Copy backup code on the Me page holds every Player on this device in the hand-off payload format (the allow-list
   the move uses, js/handoff-schema.js: Players, their progress and play records, the listed settings, nothing else),
   as JSON text with no size cap; the page wraps it as a code. Restore from code accepts that format only when it
   matches the schema exactly (the same checks, caps and version as /import/), and an old single-Player code
   ({ player, data } or a bare record) read the way the packer reads a device, then writes through the same prompt and
   the same all-or-nothing write as the hand-off (js/handoff.js). A code is outside data: nothing in it becomes markup,
   and a code that fails imports nothing. A field added to the record must be added to the schema too, or a backup
   loses it.
   Not part of a first load: js/store.js loads this module (store.loadBackup) when the Me page draws, so nothing before
   the first paint waits for it or for the hand-off modules (docs/perf/baseline.md). The store's exportData, readBackup,
   restoreOffer and importData call the functions here; meBackup is the Me page's Backup section. */
import * as H from './handoff-schema.js';
import { progressHere, applyHandoff } from './handoff.js';
import { player, allPlayers, importData, LEGACY, PKEY, MAX_PLAYERS } from './store.js';

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const local = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => localStorage.setItem(k, v),
  remove: k => { try { localStorage.removeItem(k); } catch (e) {} },
  keys: () => { const out = []; try { for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {} return out; },
};

/* Every Player, or nothing: a code that Restore would refuse (more Players than the cap, or more text than it reads)
   is never made, so no one keeps a backup that quietly left Players out. Throws 'too many Players' or 'too big'. */
export function exportData() {
  const list = allPlayers();
  const device = H.readDevice(local.get, local.keys);
  if (!device || device.players.list.length !== list.length) throw new Error('too many Players');
  // A stored record the schema would leave out (over its caps even after trimming) would make a code without that
  // Player's progress, and Use the code's would then delete it: refuse instead (#141 review)
  if (list.some(p => local.get(LEGACY + '.' + p.id) !== null && !device.records[p.id])) throw new Error('too big');
  const text = JSON.stringify(H.payloadOf(device, [], Date.now(), H.FROM_BACKUP));
  if (text.length > H.MAX_JSON) throw new Error('too big');
  return text;
}
/* The payload a pasted code's text holds, checked, or throws. Writes nothing: the Me page shows the prompt first. */
export function readBackup(txt) {
  if (typeof txt !== 'string' || txt.length > H.MAX_JSON) throw new Error('bad');
  let d; try { d = JSON.parse(txt); } catch (e) { throw new Error('bad'); }
  if (!isObj(d)) throw new Error('bad');
  let payload = d;
  if (!('players' in d)) {
    // An old single-Player code: its record, and the Player it names (or, when it names none, the Player who pastes
    // it, as the old restore did), read the way the packer reads a device
    const data = isObj(d.data) ? d.data : d;
    if (!isObj(data.skills)) throw new Error('bad');
    const p = isObj(d.player) ? d.player : player(), id = typeof p.id === 'string' && H.ID_RE.test(p.id) ? p.id : player().id;
    const m = new Map([[PKEY, JSON.stringify({ active: id, list: [{ ...p, id }] })], [LEGACY + '.' + id, JSON.stringify(data)]]);
    const device = H.readDevice(k => (m.has(k) ? m.get(k) : null), () => [...m.keys()]);
    if (!device) throw new Error('bad');
    payload = H.payloadOf(device, [], Date.now(), H.FROM_BACKUP);
  }
  const c = H.validatePayload(payload);
  if (!c.ok) throw new Error(c.error);
  return c.value;
}
/* What the Restore prompt says: whether this device has progress (then it asks Keep this device's, Use the code's or
   Keep both), the Nicknames here, and whether Keep both stays within the Player cap */
export function restoreOffer(payload) {
  const here = progressHere(local);
  return { has: here.has, names: here.list.map(p => (typeof p.name === 'string' ? p.name : 'A Player')), both: here.list.length + payload.players.list.length <= H.MAX_PLAYERS };
}
/* Writes a backup. choice 'replace': this device's Players, their progress and the Device board give way (as the Me
   page's remove does; World board identities are forgotten) and the code's settings are written; 'both': the code's
   Players are added next to these, with new ids where they clash, and this device's settings win. All or nothing.
   store.importData calls this, then drops its caches and tells listeners. */
export function writeBackup(txt, choice = 'replace') {
  const payload = readBackup(txt);
  applyHandoff(local, payload, choice, Date.now(), false);
}

/* The Me page's Backup section (js/app.js meView draws its markup and wires its buttons, each through life.js, to
   these): $ finds an element in the view, msg says a line in its status. Restore from code checks a pasted code,
   shows what it holds and writes only after a choice, as the hand-off page does (progress-handoff spec), then reloads
   so every setting and Player is read afresh. pending is the code awaiting a choice. */
export function meBackup({ $, msg }) {
  let pending = null;
  const show = (id, on) => { const el = $(id); if (el) el.hidden = !on; };
  /* Copy backup code: the code goes to the clipboard and is shown, selected, in a field under the buttons, so it can
     be checked, written down, or copied by hand where the clipboard is not allowed (Muse review round 2, item 3) */
  const copy = async () => {
    let code;
    try { code = btoa(unescape(encodeURIComponent(exportData()))); } catch (e) { show('#pCodeBox', false); msg(e.message === 'too many Players' ? `One backup code holds up to ${MAX_PLAYERS} Players, and this device has more. Remove a Player you no longer need, then try again.` : 'This progress is too big for one backup code. Nothing was copied.'); return; }
    const field = $('#pCode'); if (field) field.value = code;
    show('#pPasteBox', false); show('#pCodeBox', true);
    let copied = false;
    try { await navigator.clipboard.writeText(code); copied = true; } catch (e) { /* no clipboard: the field below is the copy */ }
    msg(copied ? 'Backup code copied: every Player on this device. It is also shown below, so you can check it or write it down. Paste it somewhere safe.'
      : 'This browser would not copy it. Select the code below and copy it yourself; it holds every Player on this device.');
    if (field) { field.focus(); field.select(); }
  };
  /* Restore from code opens a field to paste into; Check this code reads it and shows what it holds */
  const restore = () => {
    pending = null; show('#pOffer', false); show('#pCodeBox', false); show('#pPasteBox', true); msg('');
    const field = $('#pPaste'); if (field) { field.value = ''; field.focus(); }
  };
  const cancelPaste = () => { show('#pPasteBox', false); msg(''); };
  const check = () => {
    const field = $('#pPaste'), code = field ? field.value : '';
    if (!code.trim()) { msg('Paste a backup code first.'); if (field) field.focus(); return; }
    let text, payload;
    try { text = decodeURIComponent(escape(atob(code.replace(/\s/g, '')))); payload = readBackup(text); } catch (e) { pending = null; show('#pOffer', false); msg('That code could not be used. Check that it was copied in full.'); if (field) field.focus(); return; }
    show('#pPasteBox', false);
    const list = $('#pOfferList'); list.textContent = '';
    for (const q of payload.players.list) { const li = document.createElement('li'); const r = payload.records[q.id] || {}, s = Math.floor(r.sparks || r.xp || 0); /* a code from before Sparks holds XP, which becomes the same Sparks */ li.textContent = `${q.name}: ${s.toLocaleString('en')} Spark${s === 1 ? '' : 's'}`; list.append(li); }
    const here = restoreOffer(payload);
    $('#pOfferFresh').hidden = here.has; $('#pOfferHas').hidden = !here.has; $('#pOfferHere').hidden = !here.has;
    $('#pOfferHere span').textContent = here.names.join(', '); $('#pBoth').hidden = !here.both;
    pending = text; msg(''); $('#pOffer').hidden = false; $('#pOfferH').focus();
  };
  const choose = choice => { const text = pending; if (!text) return; pending = null; $('#pOffer').hidden = true; try { importData(text, choice); } catch (e) { msg('This browser would not let us save the progress, so nothing was changed. Make some room in its storage, then try again.'); return; } location.reload(); };
  const keep = () => { pending = null; $('#pOffer').hidden = true; msg('Nothing was changed.'); };
  return { copy, restore, check, cancelPaste, choose, keep };
}
