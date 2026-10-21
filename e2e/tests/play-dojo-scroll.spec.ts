import AxeBuilder from '@axe-core/playwright';
import { test, expect, open, chromiumOnly } from './fixtures';

/* Sutra Spellbook, Discovery Locks and the Lost Śulba Scroll (openspec play-experiences): keyboard play keeps
   focus, Sparks events fire only for first clears, the scroll keeps its own class names, and the pages pass axe. */

/* Record the vmplay events (the app turns them into Sparks, js/app.js onPlay) */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any; w.__plays = [];
    document.addEventListener('vmplay', (e: any) => w.__plays.push(e.detail.action));
  });
});
const plays = (page: import('@playwright/test').Page, action: string) => page.evaluate(a => (window as any).__plays.filter((x: string) => x === a).length, action);
const stored = (page: import('@playwright/test').Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(`vm.play.p1.${k}`) || 'null'), key);

test('Spellbook: a keyboard cast keeps focus on the digits after each key press', async ({ page, issues }) => {
  await open(page, '#/dojo/spells');
  await expect(page.locator('.sp-board .sp-node').first()).toBeVisible();
  /* The first lesson's problem, recomputed with the same seed the page uses */
  const edges: string[] = await page.evaluate(async () => {
    const C = await e2eMod('play/exp/spells-core');
    const K = await e2eMod('play/kit');
    const id = C.ORDER.challenger[0], s = C.spellById(id);
    const b = s.board(s.gen(K.rng(`learn:${id}:0`), 0, 'challenger'));
    return C.solution(b).flatMap((x: { edges: string[] }) => x.edges);
  });
  const node = (id: string) => page.locator(`.sp-board .sp-node[data-id="${id}"]`);
  const focused = page.locator('.sp-board .sp-node:focus');
  for (const e of edges) {
    const [a, b] = e.split('|');
    await node(a).focus();
    await page.keyboard.press('Enter');
    /* the digits are redrawn, and focus stays on the one just pressed */
    await expect(focused).toHaveAttribute('data-id', a);
    await expect(focused).toHaveAttribute('aria-pressed', 'true');
    if (e === edges[edges.length - 1]) { await node(b).focus(); await page.keyboard.press('Enter'); break; }
    await node(b).focus();
    await page.keyboard.press('Enter');
    await expect(focused).toHaveAttribute('data-id', b);
    await expect(focused).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(page.locator('.sp-after')).toBeVisible();
  await expect(page.locator('.sp-after .md-btn--primary')).toBeFocused();
  expect(await plays(page, 'spells/learn')).toBe(1);
  expect(issues.console).toEqual([]);
});

test('Spellbook: a learn link cannot skip ahead to a spell not yet unlocked', async ({ page }) => {
  const later: string = await page.goto('/play/').then(() => page.evaluate(async () => (await e2eMod('play/exp/spells-core')).ORDER.challenger[2]));
  await open(page, `#/dojo/spells/learn/${later}`);
  /* a fresh Player gets the first lesson instead */
  const first: string = await page.evaluate(async () => (await e2eMod('play/exp/spells-core')).ORDER.challenger[0]);
  const want: string = await page.evaluate(async id => (await e2eMod('play/exp/spells-core')).spellById(id).sutra, first);
  await expect(page.locator('.sp-sutra')).toHaveText(want);
});

test('Spellbook: a new target starts with no spell chosen, so the last spell is never cast on it by itself', async ({ page, issues }) => {
  await page.addInitScript(() => { try { localStorage.setItem('vm.play.p1.spells', JSON.stringify({ learned: ['crosswise', 'sq5'], pace: 'calm' })); } catch (e) { /* storage blocked */ } });
  await open(page, '#/dojo/spells');
  await expect(page.locator('.sp-m')).toHaveCount(2);
  await expect(page.locator('.sp-idle')).toBeVisible();
  await page.locator('[data-spell="crosswise"]').click();
  await expect(page.locator('[data-spell="crosswise"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sp-idle')).toHaveCount(0);
  /* aim at the other monster: the choice is cleared and the host asks again */
  await page.locator('.sp-m:not(.is-target)').click();
  await expect(page.locator('.sp-m.is-target')).toHaveCount(1);
  await expect(page.locator('.sp-idle')).toBeVisible();
  await expect(page.locator('.sp-board, .sp-misfit')).toHaveCount(0);
  await expect(page.locator('[data-spell][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('.sp-combo')).toHaveText('×0');
  expect(issues.console).toEqual([]);
});

test('Spellbook: after a monster is beaten, the one still walking becomes the target, not a newcomer', async ({ page, issues }) => {
  await page.addInitScript(() => { try { localStorage.setItem('vm.play.p1.spells', JSON.stringify({ learned: ['crosswise'], pace: 'calm' })); } catch (e) { /* storage blocked */ } });
  /* Every win note the page shows, kept here: the note lives only until the beaten monster leaves (0.5 s with reduced
     motion), so waiting to see it on the page missed it on a busy machine although the win had happened */
  await page.addInitScript(() => {
    const w = window as any; w.__spWins = [];
    new MutationObserver(recs => { for (const r of recs) r.addedNodes.forEach(n => { if (n instanceof HTMLElement && n.matches('.sp-win')) w.__spWins.push(n.textContent); }); })
      .observe(document, { childList: true, subtree: true });
  });
  await open(page, '#/dojo/spells');
  await expect(page.locator('.sp-m')).toHaveCount(2);
  const first = await page.locator('.sp-m.is-target').getAttribute('data-m');
  const survivor = await page.locator('.sp-m:not(.is-target)').getAttribute('data-m');
  /* Cast with the hints: each shows the next stroke as ghost lines between two digits; join them from the keyboard.
     The board gets is-cast the moment the last stroke completes the spell (the win note follows a beat later), so
     that is the stop: looking for the win note here instead raced it and, missing it, cast the next monster too. */
  for (let guard = 0; guard < 40 && !(await page.locator('.sp-board.is-cast').count()); guard++) {
    await page.locator('.sp-hint').click();
    const pair = await page.evaluate(() => {
      const svg = document.querySelector('.sp-ink') as SVGSVGElement, [, , vw, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number);
      const g = document.querySelector('.sp-guide line.sp-ghost'); if (!g) return null;
      const at = (x: number, y: number) => [...document.querySelectorAll<HTMLElement>('.sp-board .sp-node:not(.is-hidden)')]
        .find(n => Math.abs(parseFloat(n.style.left) - (x / vw) * 100) < 0.01 && Math.abs(parseFloat(n.style.top) - (y / vh) * 100) < 0.01)?.dataset.id;
      const a = at(+g.getAttribute('x1')!, +g.getAttribute('y1')!), b = at(+g.getAttribute('x2')!, +g.getAttribute('y2')!);
      return a && b ? [a, b] : null;
    });
    if (!pair) break;
    for (const id of pair) { await page.locator(`.sp-board .sp-node[data-id="${id}"]`).focus(); await page.keyboard.press('Enter'); }
  }
  await expect.poll(() => page.evaluate(() => (window as any).__spWins as string[])).toEqual([expect.stringMatching(/ = \d+\. /)]);
  await expect(page.locator(`.sp-m[data-m="${first}"]`)).toHaveCount(0);
  await expect(page.locator('.sp-m')).toHaveCount(2);
  await expect(page.locator('.sp-m.is-target')).toHaveAttribute('data-m', survivor!);
  expect(issues.console).toEqual([]);
});

/* Feed the Twin Wall three numbers, then predict two answers; returns when the level is cleared */
async function clearFeedLevel(page: import('@playwright/test').Page) {
  for (let i = 0; i < 3; i++) {
    const offer = page.locator('.lk-offer:not([disabled])').first();
    await expect(offer).toBeVisible();
    await expect(page.locator('.lk-machine')).not.toHaveClass(/is-running/);
    await offer.click();
    await expect(page.locator('.lk-tape-list li')).toHaveCount(i + 1);
  }
  const clear = page.locator('.lk-clear');
  for (let n = 0; n < 8 && !(await clear.isVisible()); n++) {
    const ask = page.locator('.lk-q-ask');
    await expect(ask.or(clear).first()).toBeVisible();
    if (await clear.isVisible()) break;
    await expect(page.locator('.lk-result')).toHaveText('');
    const x = parseInt((await ask.textContent()) || '', 10);
    await page.keyboard.type(String(x * 11));
    await page.keyboard.press('Enter');
    await expect(page.locator('.lk-result .lk-ok').or(clear).first()).toBeVisible();
    /* the next question replaces the panel, or the level clears */
    await expect(page.locator('.lk-result .lk-ok')).toHaveCount(0);
  }
  await expect(clear).toContainText('Level cleared');
}

test('Locks: level 1 clears by keyboard, and a replay pays no second Sparks event', async ({ page, issues }) => {
  await open(page, '#/dojo/locks/eleven');
  await clearFeedLevel(page);
  await expect(page.locator('.lk-next')).toBeFocused();
  expect((await stored(page, 'locks')).eleven.done).toBe(1);
  expect(await plays(page, 'locks/level')).toBe(1);
  /* replay level 1 */
  await page.locator('a.lk-lv[href="#/dojo/locks/eleven/0"]').click();
  await expect(page.locator('.lk-say')).toContainText('Feed the lock');
  await clearFeedLevel(page);
  expect(await plays(page, 'locks/level')).toBe(1);
  expect((await stored(page, 'locks')).eleven.done).toBe(1);
  expect(issues.console).toEqual([]);
});

test('Locks: keyboard focus moves to the next offer after feeding the lock', async ({ page }) => {
  await open(page, '#/dojo/locks/eleven');
  const offer = page.locator('.lk-offer').first();
  await offer.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.lk-tape-list li')).toHaveCount(1);
  await expect(page.locator('.lk-offer:focus')).toHaveCount(1);
  await expect(page.locator('.lk-offer:focus')).toBeEnabled();
});

test('Locks: an offer clicked after the last required feed is refused, so only one predict phase starts', async ({ page, issues }) => {
  await open(page, '#/dojo/locks/eleven');
  const tape = page.locator('.lk-tape-list li');
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.lk-machine')).not.toHaveClass(/is-running/);
    await page.locator('.lk-offer:not([disabled])').first().click();
    await expect(tape).toHaveCount(i + 1);
  }
  /* the lock has had its three feeds; in the moment before Predict, one more offer is still on screen */
  await page.locator('.lk-offer:not([disabled])').first().click();
  await expect(page.locator('.lk-q-ask')).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(tape).toHaveCount(3);
  /* one key press is handled once */
  await page.keyboard.press('7');
  await expect(page.locator('.lk-q-typed')).toHaveText('7');
  expect(issues.console).toEqual([]);
});

test.describe('Calm on', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('vm.calm', '1'); if (!localStorage.getItem('vm.play.p1.locks')) localStorage.setItem('vm.play.p1.locks', JSON.stringify({ eleven: { done: 2, hints: 0 } })); } catch (e) { /* storage blocked */ } });
  });
  test('Locks: "Beat the lock" has no clock under Calm, and a slow right answer still counts', async ({ page, issues }) => {
    await page.clock.install();
    await open(page, '#/dojo/locks/eleven/2');
    await expect(page.locator('.lk-lv.is-now')).toContainText('Beat the lock');
    await expect(page.locator('.lk-say')).toContainText('Calm is on: no clocks');
    const ask = page.locator('.lk-q-ask');
    await expect(ask).toBeVisible();
    await expect(page.locator('.lk-timer')).toHaveCount(0);
    /* a whole minute passes before the answer */
    await page.clock.fastForward('01:00');
    const x = parseInt((await ask.textContent()) || '', 10);
    await page.keyboard.type(String(x * 11));
    await page.keyboard.press('Enter');
    await expect(page.locator('.lk-result .lk-ok')).toBeVisible();
    await expect(page.locator('.lk-result')).not.toContainText('quicker');
    await expect(page.locator('.lk-goal i.is-on')).toHaveCount(1);
    expect(issues.console).toEqual([]);
  });
});

test.describe('the scroll with two pieces found', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { try { if (!localStorage.getItem('vm.play.p1.scroll')) localStorage.setItem('vm.play.p1.scroll', JSON.stringify({ solved: {}, pieces: [1, 2] })); } catch (e) { /* storage blocked */ } });
  });

  test('Lost Scroll: the torn scroll keeps its own classes, also after a visit to the Spellbook', async ({ page, issues }) => {
    /* the Spellbook's stylesheet stays loaded after a visit */
    await open(page, '#/dojo/spells');
    await expect(page.locator('.sp-board')).toBeVisible();
    /* move within the app (no reload), so the Spellbook's stylesheet is still on the page */
    await page.evaluate(() => { location.hash = '#/sutras/lost-scroll'; });
    await expect(page.locator('#view h1')).toHaveText('The Lost Śulba Scroll');
    expect(await page.evaluate(() => [...document.styleSheets].some(s => /css\/play\/spells\.css/.test(s.href || '')))).toBe(true);
    const scroll = page.locator('.sc-map-scroll');
    await expect(scroll.locator('svg.sc-psvg')).toBeVisible();
    await expect(scroll.locator('.sc-prod')).toHaveCount(2);
    await expect(scroll.locator('.sc-piece')).toHaveCount(6);
    await expect(scroll.locator('.sc-piece.is-found .sc-pglyph')).toHaveCount(2);
    await expect(scroll.locator('.sc-pnum')).toHaveCount(4);
    expect(await scroll.locator('[class*="sp-"]').count()).toBe(0);
    /* the first glyph's head (a circle) is filled like its beak: neither the Spellbook's .sp-glyph rules nor the
       piece's own parchment fill reach the glyph */
    const style = await scroll.locator('.sc-pglyph').first().evaluate(g => {
      const c = g.querySelector('circle.sc-pg')!, p = g.querySelector('path.sc-pg')!;
      return { circle: getComputedStyle(c).fill, path: getComputedStyle(p).fill, width: getComputedStyle(c).strokeWidth };
    });
    expect(style.circle).toBe(style.path);
    expect(style.width).not.toBe('6px');
    expect(issues.console).toEqual([]);
  });
});

test('Lost Scroll: a chapter 1 puzzle is solved and saved; in preview nothing is saved or counted', async ({ page, issues }) => {
  const answer: number = await page.goto('/play/').then(() => page.evaluate(async () => (await e2eMod('play/exp/scroll-core')).puzzlesFor(1, 'challenger')[0].answer));
  await open(page, '#/sutras/lost-scroll/preview/1');
  await expect(page.locator('.sc-preview')).toContainText('nothing solved here is saved');
  await page.locator('#scAns').fill(String(answer));
  await page.locator('#scAns').press('Enter');
  await expect(page.locator('.sc-feedback.is-ok')).toBeVisible();
  expect(await stored(page, 'scroll')).toBeNull();
  expect(await plays(page, 'scroll/solve')).toBe(0);

  await open(page, '#/sutras/lost-scroll/1');
  await expect(page.locator('.sc-preview')).toHaveCount(0);
  await page.locator('#scAns').fill(String(answer));
  await page.locator('#scAns').press('Enter');
  await expect(page.locator('.sc-feedback.is-ok')).toBeVisible();
  expect((await stored(page, 'scroll')).solved['challenger:c1p1']).toBe(true);
  expect(await plays(page, 'scroll/solve')).toBe(1);
  /* Next puzzle moves focus to the new puzzle's title */
  await page.locator('.sc-next-p').click();
  await expect(page.locator('.sc-p-title')).toBeFocused();
  expect(issues.console).toEqual([]);
});

test('Lost Scroll: solved rope, square and meter puzzles reopen showing their answer, and stay put', async ({ page, issues }) => {
  await page.goto('/play/');
  const want = await page.evaluate(async () => {
    const S = await e2eMod('play/exp/scroll-core');
    const solved: Record<string, boolean> = {}, at: Record<string, [number, number, unknown]> = {};
    for (const n of [2, 4]) S.puzzlesFor(n, 'challenger').forEach((p: { id: string, kind: string, answer: unknown }, i: number) => { solved[`challenger:${p.id}`] = true; if (['rope', 'square', 'meter'].includes(p.kind)) at[p.kind] = [n, i, p.answer]; });
    localStorage.setItem('vm.play.p1.scroll', JSON.stringify({ solved, pieces: [] }));
    return at;
  });
  const step = async (n: number, i: number) => {
    await open(page, `#/sutras/lost-scroll/preview/${n}`);
    await page.locator(`.sc-step[data-step="${i}"]`).click();
    await expect(page.locator('.sc-puzzle.is-solved .sc-feedback')).toHaveText('Solved already. Here is what you found.');
  };
  const [rn, ri, [b, c]] = want.rope as [number, number, [number, number]];
  await step(rn, ri);
  const pegB = page.locator('[data-peg="b"]');
  await expect(pegB).toHaveAttribute('aria-valuenow', String(b));
  await expect(page.locator('[data-peg="c"]')).toHaveAttribute('aria-valuenow', String(c));
  await expect(page.locator('.sc-rope-read .sc-tick')).toHaveText('square corner!');
  await pegB.focus(); await page.keyboard.press('ArrowRight');
  await expect(pegB).toHaveAttribute('aria-valuenow', String(b));

  const [sn, si, [x, y]] = want.square as [number, number, [number, number]];
  await step(sn, si);
  await expect(page.locator('.sc-sq-p')).toHaveAttribute('aria-valuetext', `${x} across, ${y} up`);
  await expect(page.locator('.sc-sq-read .sc-tick')).toHaveText('double!');

  const [mn, mi, pat] = want.meter as [number, number, string];
  await step(mn, mi);
  await expect(page.locator('button.sc-dial small')).toHaveText([...pat]);
  await expect(page.locator('button.sc-dial').first()).toBeDisabled();
  expect(issues.console).toEqual([]);
});

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });
    for (const route of ['#/dojo/locks', '#/sutras/lost-scroll']) {
      test(`${route} has no serious or critical axe violations`, async ({ page }, testInfo) => {
        chromiumOnly(testInfo);
        await open(page, route);
        await page.waitForLoadState('networkidle');
        const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
        const bad = res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
          .map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 5).map(n => n.target.join(' ')).join(' | ')}`);
        expect(bad).toEqual([]);
      });
    }
  });
}
