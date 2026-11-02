/* The grade question (openspec change age-bands, design decisions 1, 2 and 8; ADR 0008): "What grade are you in?"
   with big buttons Pre-K, K, 1 to 12 and Grown-up, "Tell my age instead" (3 to 17 and Grown-up), Skip, a speaker
   button that reads the question on one tap and the choices on the next (speech only follows a tap), and Bolt's line
   "A grown-up can help." The answer is the Grade answer (js/store.js setReading): kept on this device, never sent, and
   never said to change anything. An age given here is also the Age answer when the Player has none (decision 8, AB2);
   a grade never sets it. Asked once over the Mode picker on a first visit, from the home card of an existing Player,
   and from Me (Change). Skip, or an answer, retires the home card. Nothing here sends an analytics event.
   A modal <dialog> made for each asking and removed when it closes; every listener is on a child of the caller's
   signal (js/life.js), so leaving the view ends the question. Loaded on demand (js/app.js), not on the first paint. */
import * as store from './store.js';
import * as fx from './fx.js';
import { on, child, onAbort } from './life.js';
import { boltHTML } from './bolt.js';
import { GRADES, AGES, gradeLabel, ageLabel } from '../shared/src/bands.ts';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

/* Opens the question. signal: the view's; onDone(reading): the Grade answer saved, or null after Skip (not called when
   the view is left first). Returns { close }. */
export function askGrade({ signal, onDone = () => {} } = {}) {
  const life = child(signal), ls = life.signal;
  const dlg = document.createElement('dialog');
  dlg.className = 'vm-sheet vm-grade'; dlg.setAttribute('aria-labelledby', 'gqTitle'); dlg.setAttribute('aria-describedby', 'gqBolt');
  let byAge = false, heard = 0, done = false;
  const opener = document.activeElement;
  const draw = () => {
    heard = 0;
    const opts = byAge ? AGES.map(a => `<button type="button" class="md-chip gq-opt" data-age="${esc(a)}">${esc(ageLabel(a))}</button>`) : GRADES.map(g => `<button type="button" class="md-chip gq-opt" data-grade="${esc(g)}">${esc(gradeLabel(g))}</button>`);
    dlg.innerHTML = `<div class="vs-head"><h2 id="gqTitle">${esc(fx.copy(byAge ? 'grade.ageTitle' : 'grade.title'))}</h2><button type="button" class="md-icon-btn gq-hear" id="gqHear" aria-label="${esc(fx.copy('grade.hear'))}">${SPEAKER}</button></div>
      <div class="gq-bolt">${boltHTML('idle')}<p class="md-bubble" id="gqBolt">${esc(fx.copy('grade.bolt'))}</p></div>
      <div class="vs-ages gq-grid" role="group" aria-labelledby="gqTitle">${opts.join('')}</div>
      <p class="vs-foot"><button type="button" class="md-btn md-btn--sm" id="gqSwap">${esc(fx.copy(byAge ? 'grade.askGrade' : 'grade.askAge'))}</button><button type="button" class="md-btn md-btn--sm" id="gqSkip">${esc(fx.copy('grade.skip'))}</button></p>`;
  };
  const finish = (reading, tell = true) => {
    if (done) return; done = true;
    life.abort();
    try { if (dlg.open) dlg.close(); } catch (e) {}
    dlg.remove();
    if (opener && opener.isConnected && opener !== document.body) try { opener.focus({ preventScroll: true }); } catch (e) {}
    if (tell) onDone(reading);
  };
  on(dlg, 'click', e => {
    const b = e.target.closest('button'); if (!b || !dlg.contains(b)) return;
    if (b.id === 'gqSwap') { byAge = !byAge; draw(); dlg.querySelector('.gq-opt').focus(); return; }
    if (b.id === 'gqSkip') { fx.sfx('tap'); store.setReadingCard('done'); finish(null); return; }
    if (b.id === 'gqHear') {
      /* The question on one tap, the choices on the next (decision 1); spoken whatever Read aloud says, since the tap asked */
      const words = heard++ % 2 === 0 ? `${fx.copy(byAge ? 'grade.ageTitle' : 'grade.title')} ${fx.copy('grade.bolt')}` : (byAge ? AGES.map(ageLabel) : GRADES.map(gradeLabel)).join(', ');
      fx.speak(words, true); return;
    }
    if (!('grade' in b.dataset) && !('age' in b.dataset)) return;
    const r = 'grade' in b.dataset ? { grade: b.dataset.grade } : { age: b.dataset.age === 'adult' ? 'adult' : Number(b.dataset.age) };
    store.setReading(r);
    /* An age is the Age answer too, when there is none yet (decision 8, AB2); a grade never sets or changes it */
    if ('age' in r && (store.player().age === undefined || store.player().age === null)) store.setAge(r.age);
    store.setReadingCard('done');
    fx.sfx('pop'); fx.applyMode(); /* body.band-<name> before the picker or the page draws again */
    finish(store.reading());
  }, ls);
  on(dlg, 'cancel', e => { e.preventDefault(); store.setReadingCard('done'); finish(null); }, ls); /* Escape is Skip */
  on(dlg, 'close', () => finish(null), ls); /* closed some other way: as Skip, nothing saved */
  onAbort(signal, () => finish(null, false)); /* the view was left: no answer, and no one to tell */
  draw();
  document.body.append(dlg);
  dlg.showModal();
  dlg.querySelector('.gq-opt').focus();
  return { close: () => finish(null) };
}
