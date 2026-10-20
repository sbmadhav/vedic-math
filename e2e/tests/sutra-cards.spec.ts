import { test, expect, APP } from './fixtures';

/* The back of every Sutra card fits its actions: Learn more on one line as the main action, with Listen and flip back
   below it, all inside the card at desktop and phone widths (the card is as tall as its taller side) */
for (const [w, h] of [[1280, 800], [768, 900], [375, 740], [320, 640]]) {
  test(`every Sutra card back fits Learn more, Listen and flip back at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${APP}#/sutras`);
    const cards = page.locator('.sutra-card');
    await expect(cards.first()).toBeVisible();
    const n = await cards.count();
    expect(n).toBeGreaterThanOrEqual(16);
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      // The layout is under test, not the tap: flip through the card's own button handler, then wait for the flip
      await card.evaluate(el => (el.querySelector('.sutra-face') as HTMLButtonElement).click());
      await expect(card).toHaveClass(/flipped/);
      const r = await card.evaluate(el => {
        const box = el.getBoundingClientRect(), back = el.querySelector('.sutra-back')!;
        const more = el.querySelector('.sutra-more')!, line = parseFloat(getComputedStyle(more).lineHeight) || 20;
        const acts = [...el.querySelectorAll('.sutra-acts > *')].map(x => x.getBoundingClientRect());
        return {
          oneLine: more.getBoundingClientRect().height < line * 2 + 20,
          inside: acts.every(a => a.top >= box.top - 1 && a.bottom <= box.bottom + 1 && a.left >= box.left - 1 && a.right <= box.right + 1),
          scrolls: back.scrollHeight > back.clientHeight + 1,
          moreFirst: el.querySelector('.sutra-acts')!.firstElementChild === more,
        };
      });
      expect(r, `card ${i + 1}`).toEqual({ oneLine: true, inside: true, scrolls: false, moreFirst: true });
      await card.evaluate(el => (el.querySelector('.sutra-flipback') as HTMLButtonElement).click());
    }
  });
}
