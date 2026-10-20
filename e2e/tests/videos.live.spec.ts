import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, chromiumOnly } from './fixtures';
import { BASE_URL } from '../playwright.config';

/* The daily check that every Watch shelf video still plays (openspec watch-shelf, design decision 6).
   For each entry in js/videos.js: YouTube's oEmbed answers 200 (404: deleted or private, 401: embedding off),
   then the privacy-enhanced embed (without autoplay) loads in a real browser within 10 seconds, shows no error
   screen and has its video element. A failure names the entry's id and title.

   It reads only YouTube: the page holding the iframe is answered locally at the site's own origin (YouTube
   refuses embeds that send no referrer, "Video player configuration error"), so nothing is requested from
   the site, Firestore or GoatCounter. Tagged @live-videos: the daily and on-demand runs include it, the run
   after a push leaves it out (.github/workflows/e2e.yml). Chromium only, no retries. */

type Video = { id: string; title: string; yt: string };
/* js/videos.js is plain data with no imports: evaluate it without the module loader */
const SRC = readFileSync(join(__dirname, '..', '..', 'js', 'videos.js'), 'utf8');
const { VIDEOS } = new Function(`${SRC.replace(/^export /gm, '')}\nreturn { VIDEOS };`)() as { VIDEOS: Video[] };

const HOST = `${new URL(BASE_URL).origin}/play/__video-check.html`;
const PAGE = '<!doctype html><meta charset="utf-8"><title>Video check</title><iframe id="f" width="640" height="360" allow="encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>';

test.describe('every Watch shelf video still plays embedded', { tag: '@live-videos' }, () => {
  test.describe.configure({ mode: 'parallel', retries: 0 });

  for (const v of VIDEOS) {
    test(`${v.id} (${v.yt}): ${v.title}`, async ({ page, request }, testInfo) => {
      chromiumOnly(testInfo, 'the live video check runs in chromium only');
      const name = `${v.id} "${v.title}" (https://www.youtube.com/watch?v=${v.yt})`;

      const o = await request.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v.yt}&format=json`);
      expect(o.status(), `${name}: oEmbed says ${o.status()} (404 deleted or private, 401 embedding turned off)`).toBe(200);

      await page.route(HOST, r => r.fulfill({ status: 200, contentType: 'text/html', body: PAGE }));
      await page.goto(HOST);
      await page.evaluate(src => { (document.getElementById('f') as HTMLIFrameElement).src = src; },
        `https://www.youtube-nocookie.com/embed/${v.yt}?rel=0&modestbranding=1&playsinline=1`);
      const player = page.frameLocator('#f');
      // The player settles into "unstarted" (ready to play) or YouTube's error screen; give a late error a moment
      await expect(player.locator('.html5-video-player.unstarted-mode, .html5-video-player.ytp-embed-error, .ytp-error').first(),
        `${name}: the embedded player did not load within 10 s`).toBeAttached({ timeout: 10_000 });
      await page.waitForTimeout(1500);
      const error = player.locator('.ytp-error');
      const why = (await error.count()) ? ((await error.first().innerText().catch(() => '')) || 'error').replace(/\s+/g, ' ').trim() : '';
      expect(why, `${name}: YouTube shows its error screen`).toBe('');
      await expect(player.locator('.html5-video-player.ytp-embed-error'), `${name}: YouTube shows its error screen`).toHaveCount(0);
      await expect(player.locator('video'), `${name}: no video element`).toHaveCount(1);
    });
  }
});
