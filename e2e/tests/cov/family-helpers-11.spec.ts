import { test, expect, open } from '../fixtures';
import { SKILL, ON, say, askFriend } from '../family-kit';

/* family-helpers spec (change family-helpers), Requirement "Text now, voices once recorded", Scenario "No voice yet":
   with Read aloud on, a Visit's words show and nothing speaks them. The question itself is still read aloud (it may
   start late, once the voices load), so the check is on what is said, not that nothing is. Nothing in the Family's
   code calls the voice at all (test/family-helpers.test.mjs). */
test.use({ seedPlayer: ON });

test('No voice yet: the words show in the bubble and no speech starts for them', async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('vm.voice', '1'); } catch (e) { /* blocked */ }
    const w = window as any; w.__said = [];
    const synth = { speaking: false, pending: false, paused: false, speak: (u: any) => { w.__said.push(String(u.text)); }, cancel() {}, pause() {}, resume() {}, getVoices: () => [], addEventListener() {}, removeEventListener() {}, onvoiceschanged: null };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    if (!('SpeechSynthesisUtterance' in window)) (window as any).SpeechSynthesisUtterance = function (this: any, t: string) { this.text = t; };
  });
  await open(page, SKILL);
  await askFriend(page);
  await expect(say(page)).not.toBeEmpty();
  const words = ((await say(page).textContent()) || '').replace(/\s+/g, ' ').trim();
  await page.waitForTimeout(800);
  const said: string[] = await page.evaluate(() => (window as any).__said);
  expect(said.filter(t => /Shunya|Nava|Eka|Swift Tiger/.test(t) || (t.trim().length > 3 && words.includes(t.trim())) || t.includes(words.slice(0, 20)))).toEqual([]);
});
