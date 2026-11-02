/* Offline, a shelf card for a Play experience that was never opened says it needs a connection the first time
   (openspec change render-performance, design D10, owner P5; play-experiences spec "Experiences work offline"). The
   worker saves an experience's module the first time a page requests it, never at install, so a card whose module the
   worker does not have would open to the Retry message. The page asks the worker which of the cards' modules it has
   ({ type: 'cached?', urls }, answered on a MessageChannel port with { type: 'cached', urls }); the URLs are the import
   map's stamped ones, so the answer is this version's. Online, or without a controlling worker, nothing is asked.
   js/app.js loads this module only when the page is offline. */
import { playFor } from './catalog.js';

export const NOTE = 'Needs a connection the first time';

/* The stamped URL of an experience's module, from the page's import map (the plain URL without a build) */
function moduleUrl(id) {
  const url = `/js/play/exp/${id}.js`;
  try { return JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports[url] || url; } catch (e) { return url; }
}

/* Marks the cards under root whose experience the worker has not saved. Resolves with the marked experience ids. */
export function noteOffline(root) {
  if (navigator.onLine !== false || !root) return Promise.resolve([]);
  const ctl = navigator.serviceWorker && navigator.serviceWorker.controller;
  if (!ctl) return Promise.resolve([]);
  const cards = new Map(); /* module URL -> [card, id] */
  for (const a of root.querySelectorAll('a.play-card[href]')) {
    const hit = playFor(a.getAttribute('href'));
    if (hit && !a.querySelector('.play-card-off')) cards.set(moduleUrl(hit[0].id), [a, hit[0].id]);
  }
  if (!cards.size) return Promise.resolve([]);
  return new Promise(resolve => {
    const ch = new MessageChannel();
    ch.port1.onmessage = e => {
      const saved = new Set((e.data && e.data.urls) || []), marked = [];
      for (const [url, [a, id]] of cards) {
        if (saved.has(url)) continue;
        const note = document.createElement('small'); note.className = 'play-card-off'; note.textContent = NOTE;
        a.classList.add('play-card--off'); a.append(note); marked.push(id);
      }
      resolve(marked);
    };
    ctl.postMessage({ type: 'cached?', urls: [...cards.keys()] }, [ch.port2]);
  });
}
