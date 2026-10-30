import { test, expect, APP, pinStoryDay, type Page } from './fixtures';

/* The first-visit Mode picker after the design audit (packet P7): the picker heading on the type scale above the card
   titles, the hero's headline on the display-l token, one column of row cards on phones and tablets, and the
   background sky (js/sky-bg.js) kept out of the hero with an edgeless caption plaque and never a compact caption.
   Live hosts are answered by the fixtures; storage is empty (a first visit). */

test.use({ seedMode: null });

const px = (s: string) => parseFloat(s);
const sky = (page: Page) => page.locator('canvas.vm-bg');
const state = (page: Page) => sky(page).evaluate(c => ({ ...(c as HTMLCanvasElement).dataset }) as Record<string, string>);
type Box = { x: number; y: number; width: number; height: number };
const meets = (b: number[], r: Box) => b[0] < r.x + r.width && r.x < b[2] && b[1] < r.y + r.height && r.y < b[3];

async function picker(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(APP);
  await expect(page.locator('.mode-pick .mode-card')).toHaveCount(3);
}

test('the picker heading is a 24px title above the card titles; the ages are a small label', async ({ page }) => {
  await picker(page, 1280, 800);
  const [h2, title, small] = await page.evaluate(() => ['.pick-h', '.mode-card b', '.mode-card small'].map(s => getComputedStyle(document.querySelector(s)!).fontSize));
  expect(px(h2)).toBe(24);
  expect(px(h2)).toBeGreaterThan(px(title));
  expect(px(title)).toBeGreaterThan(px(small));
  await expect(page.locator('.pick-h')).toHaveText('Pick who is playing'); // no Try a trick above the cards any more (try-trick-in-modes)
});

test("the hero's headline is the display-l size of the design system", async ({ page }) => {
  await picker(page, 1280, 800);
  const [h1, token] = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.fontSize = 'var(--text-display-l-size)';
    document.body.append(probe);
    const out = [getComputedStyle(document.querySelector('.mq-hero .md-heading')!).fontSize, getComputedStyle(probe).fontSize];
    probe.remove();
    return out;
  });
  expect(px(token)).toBeGreaterThan(0);
  expect(h1).toBe(token);
});

test('at 390 by 780 the cards are one column of rows (icon beside the words): the first in full, the second begun, no sideways scroll', async ({ page }) => {
  await picker(page, 390, 780);
  const cards = page.locator('.mode-pick .mode-card');
  const boxes = await cards.evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.right, r.bottom]; }));
  expect(new Set(boxes.map(b => Math.round(b[0]))).size, 'one column').toBe(1);
  const [ic, b] = await page.evaluate(() => [document.querySelector('.mode-card .mode-ic')!, document.querySelector('.mode-card b')!].map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
  expect(ic[2]).toBe(48);
  expect(b[0], 'the title starts to the right of the icon').toBeGreaterThan(ic[0] + ic[2]);
  expect(boxes[0][3], 'Explorer is on screen in full').toBeLessThanOrEqual(780);
  // Three row cards do not fit under the hero at this height (the blurbs take two lines); the second card's title does
  const second = (await cards.nth(1).locator('b').boundingBox())!;
  expect(second.y + second.height).toBeLessThanOrEqual(780);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('at 768 the cards are one column', async ({ page }) => {
  await picker(page, 768, 1024);
  const xs = await page.locator('.mode-pick .mode-card').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().x)));
  expect(new Set(xs).size).toBe(1);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.mode-pick')!).gridTemplateColumns.split(' ').length)).toBe(1);
});

test('at 1280 the cards are three across', async ({ page }) => {
  await picker(page, 1280, 800);
  const ys = await page.locator('.mode-pick .mode-card').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().y)));
  expect(new Set(ys).size).toBe(1);
});

/* The still frame (reduced motion, the suite's default) holds the day's story where there is room. A tall screen has
   room below the picker; the story and its caption stay out of the hero, and the plaque has no stroked edge. The day
   is fixed: the taller drawings (the Meru-prastāra, the rope and peg) have room only for the drawing here. */
test('the sky keeps its story out of the hero, never with a compact caption, and the caption plaque has no edge', async ({ page }, testInfo) => {
  await picker(page, 1280, 1100);
  await pinStoryDay(page, 'nakshatras');
  await picker(page, 1280, 1100);
  await expect(sky(page)).toHaveAttribute('data-phase', 'still', { timeout: 10_000 });
  const s = await state(page), hero = (await page.locator('.mq-hero').boundingBox())!;
  expect(s.place).not.toBe('compact');
  expect(s.story, 'the pinned day\'s story is placed at 1280 by 1100').toBe('nakshatras');
  expect(meets(s.box.split(',').map(Number), hero), `story ${s.story} at ${s.box} is clear of the hero`).toBe(false);
  expect(s.cap, 'the story has its caption').toBeTruthy();
  const [x, y, w, h] = s.cap.split(',').map(Number);
  expect(meets([x, y, x + w, y + h], hero)).toBe(false);
  const k = await sky(page).evaluate(c => (c as HTMLCanvasElement).width / (c as HTMLCanvasElement).clientWidth);
  if (k !== 1) { testInfo.annotations.push({ type: 'skip', description: `canvas pixels per CSS px ${k}: the edge row is not a whole pixel` }); return; }
  const [edge, inside] = await sky(page).evaluate((c, [x, y, w]) => {
    const g = (c as HTMLCanvasElement).getContext('2d')!;
    const at = (cx: number, cy: number) => Array.from(g.getImageData(Math.round(cx), Math.round(cy), 1, 1).data);
    return [at(x + w / 2, y), at(x + w / 2, y + 4)];
  }, [x, y, w]);
  expect(inside[3], 'the plaque is drawn').toBeGreaterThan(100);
  for (let i = 0; i < 4; i++) expect(Math.abs(edge[i] - inside[i]), `channel ${i}: the edge pixel is the plaque fill`).toBeLessThanOrEqual(3);
});

test('on a phone the picker shows no story in its first screen', async ({ page }) => {
  await picker(page, 390, 780);
  await expect(sky(page)).toHaveAttribute('data-phase', /./, { timeout: 10_000 });
  const s = await state(page), hero = (await page.locator('.mq-hero').boundingBox())!;
  expect(s.place).not.toBe('compact');
  if (s.box) expect(meets(s.box.split(',').map(Number), hero)).toBe(false);
});
