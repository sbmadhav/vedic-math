import { test, expect, APP } from './fixtures';

/* The landing page and the pages for grown-ups (openspec change learnvedicmath: hosting "Returning Players go straight
   into the game", "Old links reach the same screen", "Not found"; landing-pages). The landing page is static, readable
   without JavaScript, loads no game module, and sends a device that already has Players into the game before it paints
   unless the URL has ?home. It writes nothing to storage. */

test.describe('a first visit', () => {
  test.use({ seedMode: null, tourSeen: false });

  test('shows the landing page, loads no game module, Firebase or YouTube, and writes no storage', async ({ page, issues }) => {
    const asked: string[] = [];
    page.on('request', r => asked.push(r.url()));
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('main h1')).toHaveText('Math in your head, the sutra way');
    await expect(page.getByRole('img', { name: 'The Nikhilam Family: the Devanagari digits one, zero and nine' })).toBeVisible();
    // Bolt is inside the game section, never in the hero (landing-interactive-hero)
    await expect(page.locator('section.lv-hero')).not.toContainText('Bolt');
    await expect(page.locator('section.lv-hero .lv-bolt-art')).toHaveCount(0);
    for (const m of ['Explorer', 'Challenger', 'Pro']) await expect(page.locator('.lv-modes')).toContainText(m);
    await expect(page.locator('main')).toContainText("Bharati Krishna Tirtha's 1965 book");
    await expect(page.locator('main')).toContainText('They are not found in the Vedas.');
    await page.waitForLoadState('networkidle');
    expect(asked.filter(u => /\/js\/(app|cloud|store)\.js|\/vendor\/firebase\/|youtube|ytimg|google/.test(u))).toEqual([]);
    // Only what the test fixture itself seeds (sound off); the page writes nothing
    expect((await page.evaluate(() => Object.keys(localStorage))).filter(k => k !== 'vm.sound')).toEqual([]);
    expect(issues.console).toEqual([]);
    expect(issues.failed).toEqual([]);
  });

  test('Start learning opens the app and its Mode picker', async ({ page }) => {
    await page.goto('/');
    const start = page.locator('main a.lv-play');
    await expect(start).toHaveText('Start learning');
    await expect(page.locator('main h2').first()).toHaveText('One short rule, one line of work');
    await expect(page.locator('#lv-modes-h')).toHaveText('Pick how you learn');
    await start.click();
    await expect(page).toHaveURL(/\/play\/$/);
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
  });

  test('an old game link (#/route) goes on to the game with the same route', async ({ page }) => {
    await page.goto('/#/sutras');
    await expect(page).toHaveURL(/\/play\/#\/sutras$/);
  });
});

test.describe('JavaScript off', () => {
  test.use({ javaScriptEnabled: false, seedMode: null });
  for (const url of ['/', '/parents/', '/teachers/', '/privacy/']) {
    test(`${url} shows its whole text, header and footer`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator('body > header .md-brand')).toBeVisible();
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('footer')).toContainText('Privacy');
    });
  }
});

test.describe('a returning Player', () => {
  test('goes straight into the game, before the landing page paints', async ({ page }) => {
    const res = await page.goto('/');
    await expect(page).toHaveURL(/\/play\/$/);
    await expect(page.locator('#view h1, #view h2').first()).toBeVisible();
    expect(res).toBeTruthy();
  });

  test('?home keeps the landing page, as the brand link from the game does', async ({ page }) => {
    await page.goto(`${APP}`);
    await page.locator('body > header .md-brand').click();
    await expect(page).toHaveURL(/\/\?home$/);
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/\?home$/);
  });

  test('an old deep link reaches the same screen: /#/sutras/ekadhikena opens that Sutra in the game', async ({ page }) => {
    await page.goto('/#/sutras/s1');
    await expect(page).toHaveURL(/\/play\/#\/sutras\/s1$/);
    await expect(page.locator('#sdTitle')).toBeVisible();
  });

  test('an old /vedic-math/ path on the new host answers 301 to /play/, and the route rides along', async ({ page, request }) => {
    const res = await request.get('/vedic-math/x?y=1', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toMatch(/\/play\/(\?y=1)?$/);
    await page.goto('/vedic-math/#/arena');
    await expect(page).toHaveURL(/\/play\/#\/arena$/);
    await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
  });
});

test('an unknown path answers 404 with a page that links to the landing page and the game', async ({ page }) => {
  const res = await page.goto('/plya/');
  expect(res!.status()).toBe(404);
  await expect(page.locator('main a[href="/play/"]')).toHaveText('Start learning');
  await expect(page.locator('footer a[href="/play/"]')).toHaveText('Learn');
  await expect(page.locator('main a[href="/?home"]')).toBeVisible();
});

test.describe('pages for grown-ups', () => {
  test('/parents/ shows the contact for questions and deletion and links the privacy policy', async ({ page }) => {
    await page.goto('/parents/');
    await expect(page.locator('main')).toContainText('privacy@learnvedicmath.com');
    await expect(page.locator('main')).toContainText('Players under 13 post nothing');
    await expect(page.locator('main a[href="/privacy/"]')).toBeVisible();
  });

  /* The summary above the fold (UX audit 2026-10-29, task 1.2): three claims, each one the privacy policy makes */
  for (const [width, height] of [[320, 640], [1280, 720]] as const) {
    test(`/parents/ at ${width}px opens with the three-point summary above the fold`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/parents/');
      const facts = page.getByRole('list', { name: 'In short' });
      await expect(facts.locator('li strong')).toHaveText(['No accounts needed', 'Under 13: nothing is posted online', 'Free, with no ads']);
      const box = (await facts.locator('li strong').first().boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      if (width >= 1280) {
        const rows = new Set(await facts.locator('li').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top))));
        expect(rows.size, 'the three sit side by side on a wide screen').toBe(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }

  test('/parents/ says World boards are off while this site serves no Firebase config', async ({ page }) => {
    await page.goto('/parents/');
    await expect(page.locator('main')).toContainText('World boards are switched off on this site for now, so today no score is sent anywhere.');
  });

  test('/teachers/ promises no school plan', async ({ page }) => {
    await page.goto('/teachers/');
    await expect(page.locator('main')).toContainText('There is no school or classroom plan yet');
    await expect(page.locator('main')).toContainText('separate written agreement');
    await expect(page.locator('main')).toContainText('There are no class accounts or class leaderboards');
  });

  test('/teachers/ has a 5-minute warm-up whose button opens the Arena', async ({ page }) => {
    await page.goto('/teachers/');
    const box = page.getByRole('region', { name: "A 5-minute warm-up for today's class" });
    await expect(box).toContainText('the same ones for every Player in the same Mode today');
    await expect(box).toContainText('With Calm on, the Arena starts on an untimed round: pick Daily challenge for the 60-second race.');
    await box.getByRole('link', { name: 'Open the Arena' }).click();
    await expect(page).toHaveURL(/\/play\/#\/arena$/);
    await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
  });

  test('/privacy/ and /terms/ show the policy with its last-updated line, and nothing meant only for the lawyer', async ({ page }) => {
    await page.goto('/privacy/');
    await expect(page.locator('main')).toContainText('Last updated:');
    await expect(page.locator('main h2').first()).toBeVisible();
    await expect(page.locator('main')).not.toContainText('For the reviewing lawyer');
    await expect(page.locator('main')).toContainText('privacy@learnvedicmath.com');
    await page.goto('/terms/');
    await expect(page.locator('main')).toContainText('Last updated:');
  });

  /* No draft placeholder is ever shown (UX audit 2026-10-29, task 1.1; build.py fails on one too) */
  test('no grown-up page shows text in [square brackets] or a note meant for the owner', async ({ page }) => {
    for (const url of ['/parents/', '/teachers/', '/privacy/', '/privacy/retention/', '/privacy/security/', '/terms/', '/licenses/']) {
      await page.goto(url);
      const text = await page.locator('body').innerText();
      expect(text.match(/\[[^[\]]+\]/g), url).toBeNull();
      expect(text, url).not.toMatch(/Open items|remove before publishing|to confirm/);
    }
  });

  test('no page shows the Explore menu, a "Made by" credit or a link to sbmadhav.com', async ({ page }) => {
    const hosts = new Set<string>();
    page.on('request', r => hosts.add(new URL(r.url()).host));
    for (const url of ['/?home', '/parents/', '/teachers/', '/privacy/', '/terms/', '/licenses/', APP]) {
      await page.goto(url);
      await expect(page.locator('#exploreBtn, .xp-btn')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(/Made by Madhav|built by Madhav|by Madhav Srinivasan/i);
      expect(await page.locator('a[href*="sbmadhav.com"]').count(), url).toBe(0);
    }
    // The site's own host is allowed: a pull request preview is served from <name>.sbmadhav.workers.dev
    const own = new URL(page.url()).host;
    expect([...hosts].filter(h => h !== own && /sbmadhav/.test(h))).toEqual([]);
  });
});

/* The warm-up button on a device with no Player yet: the Mode picker comes first, then the Arena it asked for */
test.describe('the teachers warm-up on a new device', () => {
  test.use({ seedMode: null });
  test('picks a Mode first, then opens the Arena', async ({ page }) => {
    await page.goto('/teachers/');
    await page.getByRole('link', { name: 'Open the Arena' }).click();
    await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
    await page.locator('.mode-card[data-mode="challenger"]').click();
    await expect(page.locator('#view h1')).toHaveText('60 seconds. Same questions for everyone.');
  });
});

/* The game's footer (landing-pages "Grown-up pages are found from the game"), in every Mode */
for (const mode of ['explorer', 'challenger', 'pro'] as const) {
  test.describe(`${mode} footer`, () => {
    test.use({ seedMode: mode });
    test('links For grown-ups and Privacy, both keeping the landing page from redirecting', async ({ page }) => {
      await page.goto(APP);
      const foot = page.locator('footer.mq-foot');
      await expect(foot.getByRole('link', { name: 'For grown-ups' })).toHaveAttribute('href', '/parents/?home');
      await expect(foot.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy/?home');
      await foot.getByRole('link', { name: 'For grown-ups' }).click();
      await expect(page).toHaveURL(/\/parents\/\?home$/);
      await expect(page.locator('main h1')).toHaveText('For parents');
    });
  });
}

/* The hero is the Nikhilam Family (landing-pages "The landing page"): the same width rules Bolt had at every
   width, no layout shift, no horizontal scroll */
for (const [width, w] of [[320, 120], [375, 120], [768, 768 * 0.22], [1280, 220]] as const) {
  test(`at ${width}px the family hero is ${Math.round(w)}px wide, does not shift and does not scroll sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/?home');
    const hero = page.locator('svg.lv-family');
    await expect(hero).toBeVisible();
    const box = (await hero.boundingBox())!;
    expect(Math.abs(box.width - w)).toBeLessThan(1);
    expect(box.height / box.width).toBeCloseTo(86 / 108, 2);
    // On a phone the family sits above the heading; wider, beside it
    const h1 = (await page.locator('main h1').boundingBox())!;
    if (width <= 700) expect(box.y + box.height).toBeLessThanOrEqual(h1.y); else expect(box.x).toBeGreaterThan(h1.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const shift = await page.evaluate(() => new Promise<number>(done => {
      if (!PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) return done(0);
      let sum = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) sum += e.value; })
        .observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => done(sum), 500);
    }));
    expect(shift).toBe(0);
  });
}

/* Motion on the landing page (accessibility spec "Landing page", calm "Calm stops motion") */
const running = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('the family moves gently', async ({ page }) => {
    await page.goto('/?home');
    await expect.poll(() => running(page)).toBeGreaterThan(0);
  });

  test('with Pause motion on, the family and the landing page hold still', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('motion-paused', '1'); } catch (e) { /* storage blocked */ } });
    await page.goto('/?home');
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    expect(await running(page)).toBe(0);
  });

  test('with Calm on, the family and the landing page hold still', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); } catch (e) { /* storage blocked */ } });
    await page.goto('/?home');
    await expect(page.locator('html')).toHaveClass(/(^|\s)calm(\s|$)/);
    expect(await running(page)).toBe(0);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the family holds still', async ({ page }) => {
    await page.goto('/?home');
    await expect(page.locator('svg.lv-family')).toBeVisible();
    expect(await running(page)).toBe(0);
  });
});

/* The Mode cards (openspec change landing-modes-and-return): each card is a link into the game in its Mode, named by
   its call to action, and the game drops the query once it has set the Mode. */
const CARDS = [['explorer', 'Explorer', 'What do you want to play?'], ['challenger', 'Challenger', 'Learn a sutra, then use it'], ['pro', 'Pro', 'Mental math, the sutra way']] as const;
const activeMode = (page: import('@playwright/test').Page) => page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || '{}'); return ((p.list || []).find((x: any) => x.id === p.active) || {}).mode ?? null; });

test.describe('Mode cards on a first visit', () => {
  test.use({ seedMode: null });
  for (const [id, name, heading] of CARDS) {
    test(`"Start as ${name}" is a link that opens the game on the ${name} Home, with no query left`, async ({ page }, info) => {
      await page.goto('/');
      const card = page.getByRole('link', { name: `Start as ${name}` });
      await expect(card).toHaveAttribute('href', `/play/?mode=${id}`);
      await expect(card).toBeVisible();
      await expect(card.locator('.lv-mode-cta')).toHaveText(`Start as ${name}`);
      if (info.project.use.hasTouch) await card.tap(); else await card.click();
      await expect(page.locator('h1.home-h')).toHaveText(heading);
      await expect(page).toHaveURL(/\/play\/(#\/)?$/);
      expect(await activeMode(page)).toBe(id);
    });
  }

  test('the lede says a tap starts in that Mode, and a card rings on keyboard focus and opens by Enter', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main .md-band .md-lede').first()).toContainText('Tap one to start in that Mode. You can change it any time');
    const card = page.locator('a.lv-mode[data-mode="pro"]');
    await card.focus();
    await expect(card).toBeFocused();
    expect(await card.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.keyboard.press('Enter');
    await expect(page.locator('h1.home-h')).toHaveText('Mental math, the sutra way');
  });
});

/* Hover lifts a card when motion is allowed; reduced motion, Pause motion and Calm keep it still */
const lift = async (page: import('@playwright/test').Page) => {
  const card = page.locator('a.lv-mode[data-mode="explorer"]');
  await card.hover();
  await page.waitForTimeout(250);
  return card.evaluate(el => getComputedStyle(el).transform);
};
test.describe('Mode card motion', () => {
  test.use({ seedMode: null, reducedMotion: 'no-preference' });
  test('hover lifts the card', async ({ page }, info) => {
    test.skip(!!info.project.use.hasTouch, 'no hover on a touch screen');
    await page.goto('/');
    expect(await lift(page)).not.toBe('none');
  });
  for (const [what, key] of [['Pause motion', 'motion-paused'], ['Calm', 'vm.calm']] as const) {
    test(`with ${what} on, hover leaves the card still`, async ({ page }, info) => {
      test.skip(!!info.project.use.hasTouch, 'no hover on a touch screen');
      await page.addInitScript(k => { try { localStorage.setItem(k, '1'); } catch (e) { /* storage blocked */ } }, key);
      await page.goto('/');
      expect(await lift(page)).toBe('none');
    });
  }
});
test.describe('Mode card, reduced motion', () => {
  test.use({ seedMode: null });
  test('hover leaves the card still', async ({ page }, info) => {
    test.skip(!!info.project.use.hasTouch, 'no hover on a touch screen');
    await page.goto('/');
    expect(await lift(page)).toBe('none');
  });
});

test.describe('welcome back', () => {
  test('the hero greets the Player and their Mode card is marked; nothing is written', async ({ page }) => {
    await page.goto('/?home');
    const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
    await expect(page.locator('body')).toHaveAttribute('data-visit', 'back');
    await expect(page.locator('main h1')).toHaveText('Welcome back, Swift Tiger 42');
    await expect(page.locator('main a.lv-play')).toHaveText('Keep playing');
    const mine = page.getByRole('link', { name: 'Keep playing as Challenger' });
    await expect(mine).toHaveAttribute('aria-current', 'true');
    await expect(mine).toHaveAttribute('href', '/play/');
    await expect(mine.locator('.lv-mode-badge')).toHaveText('Your Mode');
    await expect(page.getByRole('link', { name: 'Switch to Explorer' })).toHaveAttribute('href', '/play/?mode=explorer');
    await expect(page.getByRole('link', { name: 'Switch to Pro' })).toHaveAttribute('href', '/play/?mode=pro');
    await expect(page.locator('.lv-mode-badge')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
  });

  test('a Player with no Mode yet is welcomed, and every card still reads "Start as"', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('vm.players', JSON.stringify({ active: 'p1', list: [{ id: 'p1', name: 'Calm Otter 7', avatar: 'teal', mode: null, created: 1 }] })); } catch (e) { /* storage blocked */ } });
    await page.goto('/?home');
    await expect(page.locator('main h1')).toHaveText('Welcome back, Calm Otter 7');
    for (const [, name] of CARDS) await expect(page.getByRole('link', { name: `Start as ${name}` })).toBeVisible();
    await expect(page.locator('[aria-current="true"].lv-mode')).toHaveCount(0);
  });

  test('a Nickname is shown as text, never as markup', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('vm.players', JSON.stringify({ active: 'p1', list: [{ id: 'p1', name: '<img src=x onerror=alert(1)>', avatar: 'teal', mode: 'pro', created: 1 }] })); } catch (e) { /* storage blocked */ } });
    await page.goto('/?home');
    await expect(page.locator('main h1 img')).toHaveCount(0);
    await expect(page.locator('main h1')).toContainText('Welcome back, <img');
  });
});

/* The sutras and the method (openspec change sutras-first, landing-pages "The landing page leads with the Sutras and
   the method" and "Three Sutras one tap from their Deep dives"): right after the hero, in plain HTML. */
test.describe('the sutras and the method', () => {
  test.use({ seedMode: null });

  test('One short rule, one line of work: 98 × 97 both ways, three Sutra cards with a meaning and an example each, linking to their Deep dives, and the honest origin line', async ({ page }) => {
    await page.goto('/');
    const sec = page.locator('section.lv-sutras');
    const hero = (await page.locator('section.lv-hero').boundingBox())!, s = (await sec.boundingBox())!, modes = (await page.locator('#lv-modes-h').boundingBox())!;
    expect(s.y).toBeGreaterThanOrEqual(hero.y + hero.height);
    expect(modes.y).toBeGreaterThanOrEqual(s.y + s.height);
    await expect(sec.locator('h2')).toHaveText('One short rule, one line of work');
    await expect(sec.locator('.md-lede')).toHaveText('A sutra is a short rule that turns a long sum into a step or two you can do in your head. Every trick here is built on one of them.');
    const ways = sec.locator('.lv-way');
    await expect(ways.locator('figcaption')).toHaveText(['The school way', 'The sutra way Multiply numbers near 10, 100 or 1000 Nikhilaṃ Navataścaramaṃ Daśataḥ']);
    await expect(ways.nth(0).locator('.lv-steps li')).toHaveText(['98 × 7 = 686', '98 × 90 = 8820', '686 + 8820 = 9506']);
    await expect(ways.nth(1).locator('.lv-steps li')).toHaveText(['98 is 2 below 100, and 97 is 3 below.', '98 − 3 = 95, and 2 × 3 = 06.', 'So the answer is 9506.']);
    const cards = sec.locator('a.lv-sutra');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('b[lang="sa-Latn"]')).toHaveText(['Ekādhikena Pūrveṇa', 'Nikhilaṃ Navataścaramaṃ Daśataḥ', 'Ūrdhva-Tiryagbhyām']);
    await expect(cards.locator('.lv-sutra-m')).toHaveText(['By one more than the one before', 'All from 9 and the last from 10', 'Vertically and crosswise']);
    await expect(cards.locator('.lv-sutra-ex')).toHaveText(['65²: 6 × 7 = 42, then 25, so 4225', '1000 − 368: 9 − 3, 9 − 6, 10 − 8, so 632', '21 × 13: 2, then 2 × 3 + 1 × 1 = 7, then 3, so 273']);
    for (const [i, id] of ['s1', 's2', 's3'].entries()) await expect(cards.nth(i)).toHaveAttribute('href', `/play/#/sutras/${id}`);
    await expect(cards.locator('.lv-trick')).toHaveText(['Square numbers ending in 5', 'Subtract from 100, 1000, 10000', 'Multiply any two numbers in one line']);
    await expect(cards.first()).toHaveAccessibleName(/Square numbers ending in 5.*Ekādhikena Pūrveṇa.*By one more than the one before.*See how it works/);
    const note = sec.locator('.lv-sutras-note');
    await expect(note).toContainText("The 16 sutras and 13 sub-sutras are from Bharati Krishna Tirtha's book Vedic Mathematics, published in 1965. They are not found in the Vedas; each one is ordinary algebra you can check.");
    await expect(note.getByRole('link', { name: 'See all 29 sutras' })).toHaveAttribute('href', '/play/#/sutras');
  });

  /* landing-interactive-hero (#172 review): the step buttons show only once the script runs, so a module that fails to
     load leaves every step on screen and no buttons that do nothing */
  test('when the step script cannot load, the sutra way shows every step and no visible Back or Next', async ({ page }) => {
    await page.route(/\/js\/life\.js(\?.*)?$/, route => route.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    const card = page.locator('#lv-demo');
    await expect(card.locator('.lv-steps li')).toHaveCount(3);
    for (const li of await card.locator('.lv-steps li').all()) await expect(li).toBeVisible();
    await expect(card).not.toHaveAttribute('data-step', /./);
    await expect(card.getByRole('button', { name: 'Next' })).toBeHidden();
    await expect(card.getByRole('button', { name: 'Back' })).toBeHidden();
  });

  /* #172 review: a visitor who finishes the steps before js/analytics.js has run is still counted, once */
  test('finishing the steps before analytics has loaded still sends math/landing/demo/done once', async ({ page }) => {
    const STUB = `window.__events = window.__events || []; window.siteTrack = (path, title) => { window.__events.push(path + ' ' + title); };`;
    let release: () => void = () => {};
    const held = new Promise<void>(r => { release = r; });
    await page.route(/\/js\/analytics\.js(\?.*)?$/, async route => { await held; await route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }); });
    await page.goto('/', { waitUntil: 'commit' });
    const card = page.locator('#lv-demo');
    await expect(card).toHaveAttribute('data-step', '1');
    for (let i = 0; i < 2; i++) await card.locator('.lv-demo-next').click();
    await expect(card).toHaveAttribute('data-step', '3');
    expect(await page.evaluate(() => typeof (window as any).siteTrack)).toBe('undefined');
    release();
    await expect.poll(() => page.evaluate(() => ((window as any).__events || []).filter((e: string) => e.startsWith('math/landing/')))).toEqual(['math/landing/demo/done Vedic Math: landing demo finished']);
  });

  test('a Sutra card opens its Deep dive in the game, with no Mode picker and no Mode stored', async ({ page }) => {
    await page.goto('/');
    await page.locator('a.lv-sutra[href="/play/#/sutras/s3"]').click();
    await expect(page).toHaveURL(/\/play\/#\/sutras\/s3$/);
    await expect(page.locator('dialog.sutra-modal #sdTitle')).toHaveText('Ūrdhva-Tiryagbhyām');
    await expect(page.locator('.mode-pick')).toHaveCount(0);
    expect(await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('vm.players') || 'null'); return p && p.list && p.list[0] ? p.list[0].mode : null; }) ?? null).toBeNull();
  });
});

test.describe('JavaScript off, the sutras and the method', () => {
  test.use({ javaScriptEnabled: false, seedMode: null });
  test('/ shows One short rule, one line of work with both ways and the three Sutra cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.lv-sutras h2')).toHaveText('One short rule, one line of work');
    await expect(page.locator('.lv-sutras .lv-way')).toHaveCount(2);
    await expect(page.locator('.lv-sutras a.lv-sutra')).toHaveCount(3);
    await expect(page.locator('.lv-sutras')).toContainText('9506');
  });
});

test('welcome back keeps the sutras section under its own hero', async ({ page }) => {
  await page.goto('/?home');
  await expect(page.locator('main h1')).toHaveText('Welcome back, Swift Tiger 42');
  await expect(page.locator('.lv-sutras h2')).toHaveText('One short rule, one line of work');
  await expect(page.locator('main :is(h1, h2)').nth(1)).toHaveText('One short rule, one line of work');
});
