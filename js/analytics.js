/* Learn Vedic Math analytics (openspec analytics; design D10, D11). A classic script, loaded with defer by every page.

   - GoatCounter, site code learnvedicmath, with count.js served from this site (vendor/goatcounter/count.js): page
     views and the named events the app sends through window.siteTrack(path, title). No cookies, nothing stored in
     the browser, no personal data; event paths are fixed words, route names and documented buckets.
   - Cloudflare Web Analytics with the manual snippet (cookieless page loads and Core Web Vitals), only when
     CF_TOKEN is set (the owner adds the site in Cloudflare and gives the public token, task 1.12). Automatic injection
     stays off in Cloudflare, because it would ignore the off switch below.
   - Off switch: nothing loads and nothing is sent with Do Not Track or Global Privacy Control, and none on local
     development hosts. Loads only after the page has loaded and the browser is idle, so it never slows the first view.
   - <html data-analytics="events-only"> (the hand-off import page) sends no page view, only the events it records.

   window.siteTrack(name, title) is always safe to call; events wait in a queue until count.js is there. */
(() => {
  const CODE = 'learnvedicmath';                               // https://learnvedicmath.goatcounter.com
  const ENDPOINT = `https://${CODE}.goatcounter.com/count`;
  const SCRIPT = '/vendor/goatcounter/count.js';
  const CF_TOKEN = '';                                         // Cloudflare Web Analytics site token (public); empty: off
  const CF_BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';

  const optedOut = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|.*\.local|.*\.test)$/.test(location.hostname);
  const off = optedOut || local;
  const eventsOnly = document.documentElement.dataset.analytics === 'events-only';

  const queue = [];
  const ready = () => !!(window.goatcounter && typeof window.goatcounter.count === 'function');
  // Never throws: if count.js is blocked or not there yet, the event waits in the queue
  const send = e => { if (ready()) window.goatcounter.count(e); else queue.push(e); };
  window.siteTrack = (name, title) => {
    if (off || !name) return;
    send({ path: String(name).slice(0, 120), title: String(title || name).slice(0, 120), event: true });
  };
  if (off) return;

  // Links that leave the site (sources, videos on YouTube) are counted by host and path only
  document.addEventListener('click', ev => {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (!a || a.host === location.host || !/^https?:/.test(a.protocol)) return;
    window.siteTrack('out/' + a.host + a.pathname.replace(/\/$/, ''), 'Outbound: ' + a.host);
  }, true);

  function load() {
    if (eventsOnly) window.goatcounter = Object.assign(window.goatcounter || {}, { no_onload: true });
    const s = document.createElement('script');
    s.async = true;
    s.src = SCRIPT;
    s.dataset.goatcounter = ENDPOINT;
    s.onload = () => setTimeout(() => queue.splice(0).forEach(send), 300);
    document.head.appendChild(s);
    if (CF_TOKEN && !eventsOnly) {
      const b = document.createElement('script');
      b.defer = true;
      b.src = CF_BEACON;
      b.dataset.cfBeacon = JSON.stringify({ token: CF_TOKEN, spa: false });
      document.head.appendChild(b);
    }
  }
  const idle = fn => ('requestIdleCallback' in window) ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500);
  if (document.readyState === 'complete') idle(load); else addEventListener('load', () => idle(load), { once: true });
})();
