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

/* Colors: every token-colored part of Bolt resolves to the current scheme's token value */
const PARTS: [string, 'fill' | 'stroke', string][] = [
  ['.b-body', 'fill', '--teal'],
  ['.b-body', 'stroke', '--on-accent'],
  ['.b-ball', 'fill', '--coral'],
  ['.b-armr', 'fill', '--sky'],
  ['.b-belly', 'fill', '--sun'],
  ['.b-cheek', 'fill', '--coral'],
  ['.b-tip', 'fill', '--sun'],
  ['.b-pupil', 'fill', '--on-accent'],
  ['.m-talk', 'fill', '--coral'],
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

test('Bolt follows the scheme: its token colors change from Daybreak to Deep Space', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page, '#/star/sq5/1');
  const light = await boltColors(page);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await expect.poll(async () => (await boltColors(page)).filter(c => c.got !== c.want).length).toBe(0);
  const dark = await boltColors(page);
  const body = (cs: typeof light) => cs.find(c => c.sel === '.b-body' && c.prop === 'fill')!.got;
  expect(body(dark)).not.toBe(body(light));
});

/* SPEC-GAP: math.css sets --bolt-eye: white and --bolt-screen: color-mix(in srgb, var(--teal) 14%, white), so the eye
   whites, the belly button and part of the face screen use the literal color white, not a design token (in Deep Space
   no token is white: --card, --bg and --ink are all other colors). The spec says Bolt's colors come from the tokens. */
test.fixme('every color Bolt paints is a design token, including the eyes and the button (dark scheme)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page, '#/star/sq5/1');
  const bad = await page.evaluate(() => {
    const probe = document.createElement('div'); document.body.append(probe);
    const names = ['--bg', '--bg-alt', '--card', '--ink', '--ink-muted', '--line', '--edge', '--ledge', '--coral', '--teal', '--sun', '--sky', '--plum',
      '--coral-strong', '--teal-strong', '--sun-strong', '--sky-strong', '--plum-strong', '--on-accent', '--focus'];
    const tokens = new Set(names.map(v => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; }));
    probe.remove();
    const svg = document.querySelector('.star-bolt svg.bolt')!;
    const out: string[] = [];
    for (const el of svg.querySelectorAll('.b-white, .b-btn')) {
      const f = getComputedStyle(el).fill;
      if (!tokens.has(f)) out.push(`${el.getAttribute('class')} fill ${f}`);
    }
    return out;
  });
  expect(bad).toEqual([]);
});
