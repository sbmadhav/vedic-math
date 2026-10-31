import { test, expect, open, heldClock } from '../fixtures';

/* openspec star-round, Requirement "Bolt teaches and reacts": scenarios "A miss" and "Colors".
   The round is Square numbers ending in 5 (every answer is n², at least 225), so typing 1 is always a miss. */

type Page = import('@playwright/test').Page;
const bolt = (page: Page) => page.locator('.star-bolt svg.bolt');
const tag = (page: Page) => page.locator('#stMain .star-tag');

test.describe('Bolt: a miss', () => {
  test('a main-question miss shows the surprised pose, then the explain pose during the replay', async ({ page }) => {
    await heldClock(page);
    await open(page, '#/star/sq5/1');
    await expect(tag(page)).toHaveText('Question 1 of 4');
    await expect(bolt(page)).toHaveAttribute('data-pose', 'idle');
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    // The miss: surprised, before the replay starts
    await expect(page.locator('#stSay')).toContainText('Not quite');
    await expect(bolt(page)).toHaveAttribute('data-pose', 'surprised');
    await expect(page.locator('.star-replay')).toHaveCount(0);
    // The replay: explain, and it stays explain while the steps play
    await page.clock.runFor(1000);
    await expect(page.locator('.star-replay')).toBeVisible();
    await expect(bolt(page)).toHaveAttribute('data-pose', 'explain');
    await expect(page.locator('.star-step')).toHaveCount(1);
    await page.clock.runFor(2600);
    await expect(page.locator('.star-step')).toHaveCount(2);
    await expect(bolt(page)).toHaveAttribute('data-pose', 'explain');
    // Bolt's image is hidden from assistive technology; what Bolt says is text on the page
    await expect(bolt(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#stSay')).toHaveText('Here is how the trick does it.');
  });
});

/* Colors: every part of Bolt resolves to the design system's fixed Bolt tokens (--bolt-*), the same in both schemes */
const PARTS: [string, 'fill' | 'stroke', string][] = [
  ['.b-body', 'fill', '--bolt-body'],
  ['.b-body', 'stroke', '--bolt-line'],
  ['.b-ball', 'fill', '--bolt-accent'],
  ['.b-armr', 'fill', '--bolt-body'],
  ['.b-belly', 'fill', '--bolt-belly'],
  ['.b-cheek', 'fill', '--bolt-accent'],
  ['.b-tip', 'fill', '--bolt-belly'],
  ['.b-pupil', 'fill', '--bolt-line'],
  ['.b-screen', 'fill', '--bolt-screen'],
  ['.b-white', 'fill', '--bolt-eye'],
  ['.b-btn', 'fill', '--bolt-eye'],
  ['.m-talk', 'fill', '--bolt-accent'],
];

async function boltColors(page: Page) {
  return page.evaluate(parts => {
    const probe = document.createElement('div'); document.body.append(probe);
    const tok = (v: string) => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    const svg = document.querySelector('.star-bolt svg.bolt')!;
    const out = parts.map(([sel, prop, v]) => {
      const el = svg.querySelector(sel)!;
      return { sel, prop, token: v, got: getComputedStyle(el)[prop as 'fill'], want: tok(v) };
    });
    probe.remove();
    return out;
  }, PARTS);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const how of ['system', 'override'] as const) {
    test(`Bolt's colors come from the design tokens in the ${scheme} scheme (${how})`, async ({ page }) => {
      if (how === 'system') await page.emulateMedia({ colorScheme: scheme });
      else await page.emulateMedia({ colorScheme: scheme === 'dark' ? 'light' : 'dark' });
      await open(page, '#/star/sq5/1');
      if (how === 'override') await page.evaluate(s => document.documentElement.setAttribute('data-theme', s), scheme);
      await expect(bolt(page)).toBeVisible();
      // Poll: some parts have a short color transition after the scheme changes
      await expect.poll(async () => (await boltColors(page)).filter(c => c.got !== c.want).map(c => `${c.sel} ${c.prop} ${c.got} != var(${c.token}) ${c.want}`)).toEqual([]);
      // Nothing in Bolt's markup carries its own color
      const inline = await bolt(page).evaluate(svg => [...svg.querySelectorAll('*')].filter(e => e.hasAttribute('fill') || e.hasAttribute('stroke') || (e as SVGElement).style.fill || (e as SVGElement).style.stroke).length);
      expect(inline).toBe(0);
    });
  }
}

test('Bolt keeps his colors: the same in Daybreak and Deep Space, with a glow only in Deep Space', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page, '#/star/sq5/1');
  const light = await boltColors(page);
  expect(await bolt(page).evaluate(svg => getComputedStyle(svg).filter)).toBe('none');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect.poll(async () => (await boltColors(page)).filter(c => c.got !== c.want).length).toBe(0);
  expect((await boltColors(page)).map(c => c.got)).toEqual(light.map(c => c.got));
  await expect.poll(() => bolt(page).evaluate(svg => getComputedStyle(svg).filter)).toContain('drop-shadow');
});
