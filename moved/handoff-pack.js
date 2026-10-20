/* The moved page's packer (openspec change learnvedicmath, design D9): runs on https://sbmadhav.com/vedic-math/ and its
   not-found page during Phase B. Published at /vedic-math/js/handoff-pack.js by build.py --target moved, which pins
   this file and the schema with an import map.

   In order: unregister any service worker for /vedic-math/ and delete the vedic-math-* caches (never madhav-*, the
   main site's); read this browser's progress through the schema's allow-list (never World board identities or
   anything else); pack it into the fragment; record vm.migratedAt here; send one hand-off count; replace this page with
   learnvedicmath.com/import/#v=1&d=...&r=<route>, or /play/<route> when nothing is saved. A fragment is never sent to
   any server. Too big to fit (never seen in practice): no redirect with data, the page says so and links the new site. */
import { readDevice, pack, fragment, ROUTE_RE } from '/vedic-math/js/handoff-schema.js';

const NEW = 'https://learnvedicmath.com';
const OLD_SCOPE = '/vedic-math/';
const route = ROUTE_RE.test(location.hash) ? location.hash : '';
const $ = id => document.getElementById(id);

/* One count through the main site's GoatCounter, the bucket only; never with Do Not Track or GPC */
function count(bucket) {
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
  const q = new URLSearchParams({ p: 'move/handoff/' + bucket, t: 'Vedic Math hand-off: ' + bucket, e: 'true', rnd: Math.random().toString(36).slice(2, 8) });
  try { navigator.sendBeacon('https://sbmadhav.goatcounter.com/count?' + q); } catch (e) { /* analytics never blocks the move */ }
}

/* The old app's worker and caches, gone before the move; at most two seconds */
async function retireOld() {
  const work = (async () => {
    try {
      const regs = navigator.serviceWorker ? await navigator.serviceWorker.getRegistrations() : [];
      await Promise.all(regs.filter(r => new URL(r.scope).pathname.startsWith(OLD_SCOPE)).map(r => r.unregister()));
    } catch (e) { /* no workers here */ }
    try {
      if (self.caches) { const keys = await caches.keys(); await Promise.all(keys.filter(k => k.startsWith('vedic-math-')).map(k => caches.delete(k))); }
    } catch (e) { /* storage blocked */ }
  })();
  await Promise.race([work, new Promise(r => setTimeout(r, 2000))]);
}

function go(url) { $('go').href = url; location.replace(url); }

async function main() {
  await retireOld();
  let device = null;
  try { device = readDevice(k => localStorage.getItem(k), () => Object.keys(localStorage)); } catch (e) { device = null; }
  if (!device) { count('empty'); return go(`${NEW}/play/${route}`); }
  let packed = null;
  try { packed = await pack(device); } catch (e) { packed = null; } // a browser without CompressionStream
  if (!packed || packed.tooBig) {
    count('too-big');
    $('moving').hidden = true; $('stay').hidden = false;
    return;
  }
  try { localStorage.setItem('vm.migratedAt', String(Date.now())); } catch (e) { /* storage blocked */ }
  count('sent');
  go(`${NEW}/import/${fragment(packed.data, route)}`);
}
main();
