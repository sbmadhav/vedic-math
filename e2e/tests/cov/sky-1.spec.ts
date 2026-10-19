import { test, expect, open } from '../fixtures';

/* sky spec, Requirements "The Sky is home for Players who try it" and "Constellations hold the Tricks' Stars":
   one test per scenario. */
type Page = import('@playwright/test').Page;
const star = (page: Page, k: string) => page.locator(`.sky-star[data-star="${k}"]`);

test.describe('the Sky on', () => {
  test.use({ seedPlayer: { sky: true } });

  test('Turning it on: a Challenger with "Try the new Sky" on sees the Sky instead of the tile home', async ({ page }) => {
    await open(page);
    await expect(page.locator('#view h1')).toHaveText('Your Sky');
    await expect(page.locator('.sky')).toHaveCount(1);
    await expect(page.locator('h1.home-h')).toHaveCount(0);
  });

  test('Ekādhikena Pūrvena: its Constellation holds six Stars, three for sq5 and three for the recurring-decimal Trick', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-names')).toContainText('Ekādhikena');
    const ids: string[] = await page.evaluate(() => import('/js/sky.js' as string).then((m: any) => {
      const c = m.CONSTELLATIONS.find((x: any) => /Ek[āa]dhikena/.test(x.sutra));
      return [...c.tricks];
    }));
    expect(ids.sort()).toEqual(['recip', 'sq5']);
    for (const t of ['sq5', 'recip']) for (const n of [1, 2, 3]) await expect(star(page, `${t}:${n}`), `${t}:${n}`).toHaveCount(1);
  });

  test('Count: the Sky has 17 Constellations and 63 Stars', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky-names text')).toHaveCount(17);
    await expect(page.locator('.sky-star')).toHaveCount(63);
  });

  test('Another Player on the device: switching to a Player who did not turn the Sky on shows the tile home', async ({ page }) => {
    await open(page);
    await expect(page.locator('.sky')).toHaveCount(1);
    /* The second Player joins after the fixture has made the first, so their order is fixed */
    await page.evaluate(() => {
      const v = JSON.parse(localStorage.getItem('vm.players')!);
      v.list.push({ id: 'p2', name: 'Calm Otter 7', avatar: 'coral', mode: 'challenger', created: Date.now() });
      v.active = 'p2';
      localStorage.setItem('vm.players', JSON.stringify(v));
    });
    await page.reload();
    await expect(page.locator('h1.home-h')).toHaveText('Ready to get faster?');
    await expect(page.locator('.sky')).toHaveCount(0);
  });
});

test.describe('Explorer', () => {
  test.use({ seedMode: 'explorer', seedPlayer: { sky: true } });
  test('Explorer: the Me page has no "Try the new Sky" switch and home is the Explorer home', async ({ page }) => {
    await open(page, '#/me');
    await expect(page.locator('#view')).not.toContainText('Try the new Sky');
    await open(page);
    await expect(page.locator('h1.home-h')).toHaveText('What do you want to play?');
    await expect(page.locator('.sky')).toHaveCount(0);
  });
});
