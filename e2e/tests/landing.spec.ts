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
    await expect(page.locator('main h1')).toHaveText('Math tricks you can do in your head, and games to practise them');
    await expect(page.locator('.lv-bolt')).toBeVisible();
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

  test('Play opens the game and its Mode picker', async ({ page }) => {
    await page.goto('/');
    await page.locator('main a.lv-play').click();
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
  await expect(page.locator('main a[href="/play/"]')).toBeVisible();
  await expect(page.locator('main a[href="/?home"]')).toBeVisible();
});

test.describe('pages for grown-ups', () => {
  test('/parents/ shows the contact for questions and deletion and links the privacy policy', async ({ page }) => {
    await page.goto('/parents/');
    await expect(page.locator('main')).toContainText('privacy@learnvedicmath.com');
    await expect(page.locator('main')).toContainText('Players under 13 post nothing');
    await expect(page.locator('main a[href="/privacy/"]')).toBeVisible();
  });

  test('/teachers/ promises no school plan', async ({ page }) => {
    await page.goto('/teachers/');
    await expect(page.locator('main')).toContainText('There is no school or classroom plan yet');
    await expect(page.locator('main')).toContainText('separate written agreement');
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

  test('no page shows the Explore menu, a "Made by" credit or a link to sbmadhav.com', async ({ page }) => {
    const hosts = new Set<string>();
    page.on('request', r => hosts.add(new URL(r.url()).host));
    for (const url of ['/?home', '/parents/', '/teachers/', '/privacy/', '/terms/', '/licenses/', APP]) {
      await page.goto(url);
      await expect(page.locator('#exploreBtn, .xp-btn')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(/Made by Madhav|built by Madhav|by Madhav Srinivasan/i);
      expect(await page.locator('a[href*="sbmadhav.com"]').count(), url).toBe(0);
    }
    expect([...hosts].filter(h => /sbmadhav/.test(h))).toEqual([]);
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

/* Pause motion before paint on the landing page (accessibility spec "Landing page") */
test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('with Pause motion on, Bolt and the landing page hold still', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('motion-paused', '1'); } catch (e) { /* storage blocked */ } });
    await page.goto('/?home');
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    expect(running).toBe(0);
  });
});
