// Makes the screenshots the web app manifest shows in the richer install dialog (openspec change install-app):
// screenshots/home-narrow.png and star-narrow.png (390 x 844 at 2x, 780 x 1688) and home-wide.png (1280 x 800).
// Run against a local build after a visible change to Home or a Star, and commit the files:
//
//   python3 build.py --voice off && node e2e/local-server.mjs 8380 _site     (in one terminal)
//   cd e2e && BASE_URL=http://localhost:8380 node screenshots.mjs             (in another)
//
// A made-up returning Challenger (no real data), Daybreak, motion reduced, the tour and the Install nudge out of the way.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.BASE_URL || 'http://localhost:8380').replace(/\/$/, '');
const out = name => fileURLToPath(new URL(`../screenshots/${name}`, import.meta.url));
mkdirSync(fileURLToPath(new URL('../screenshots/', import.meta.url)), { recursive: true });

const seed = () => {
  const day = d => { const t = new Date(Date.now() - d * 864e5); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  localStorage.setItem('vm.players', JSON.stringify({ active: 'p1', list: [{ id: 'p1', name: 'Swift Tiger 42', avatar: 'teal', mode: 'challenger', created: Date.now() - 9 * 864e5 }] }));
  localStorage.setItem('mathquest.v1.p1', JSON.stringify({ v: 3, sparks: 640, days: { [day(2)]: 3, [day(1)]: 2, [day(0)]: 1 } }));
  localStorage.setItem('vm.tour', 'done');
  localStorage.setItem('vm.sound', '0');
  localStorage.setItem('vm.install', JSON.stringify({ later: 3, until: 0, installed: 0 }));
};

const browser = await chromium.launch();
async function shot(viewport, scale, hash, name) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block', isMobile: scale > 1, hasTouch: scale > 1 });
  await ctx.addInitScript(seed);
  await ctx.route(/goatcounter|cloudflareinsights/, r => r.fulfill({ status: 204 }));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/learn/${hash}`);
  await page.locator('#view h1, #view h2').first().waitFor();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(name) });
  console.log(`screenshots/${name}`);
  await ctx.close();
}
await shot({ width: 390, height: 844 }, 2, '#/', 'home-narrow.png');
await shot({ width: 390, height: 844 }, 2, '#/star/from9/1', 'star-narrow.png');
await shot({ width: 1280, height: 800 }, 1, '#/', 'home-wide.png');
await browser.close();
