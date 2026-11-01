import { test, expect, open, APP } from '../fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from '../family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests } from '../family-talk-kit';
test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

/* helper-conversation spec (change family-helpers), Requirement "Text only at first". */

test('Read aloud on: a reply shows as text and no audio is requested for it', async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('vm.voice', '1'); } catch (e) { /* storage blocked */ }
    const w = window as unknown as { __spoken: string[] }; w.__spoken = [];
    if (window.speechSynthesis) { const orig = window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak = u => { w.__spoken.push(u.text); orig(u); }; }
  });
  await fakeFamilyServer(page, () => says(['eka', 'The method is the thing to listen for here.']));
  const audio: string[] = [];
  page.on('request', r => { if (/voice\.learnvedicmath\.com|\.mp3|\.m4a|\/api\/voice\//.test(r.url())) audio.push(r.url()); });
  await open(page, TRICK);
  await openTalk(page);
  await sendAndWait(page, 'tell me', 'Eka');
  await expect(say(page)).toContainText('listen for here');
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.filter(t => /listen for here/.test(t)))).toEqual([]);
  expect(audio.filter(u => /listen|method|api\/voice/.test(u))).toEqual([]);
});
