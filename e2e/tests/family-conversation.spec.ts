import { test, expect, open, APP } from './fixtures';
import { ask, visit, who, say, btn, closeVisit, turns } from './family-kit';
import { TRICK, TALK_ON, TEEN, CHILD, NOTE, fakeFamilyServer, says, talkBox, talkInput, talkNote, openTalk, send, sendAndWait, nearBase, turnstileRenders, watchTalkRequests, type TurnBody } from './family-talk-kit';

/* Talking with the Family (openspec family-helpers step 3, helper-conversation spec, design D15 and D18): the
   behaviors beyond the one-per-scenario coverage specs in e2e/tests/cov/helper-conversation-*.spec.ts. The server is
   always the fake in family-talk-kit.ts and Turnstile the fake in fixtures.ts; nothing here reaches the Worker, the
   model provider or Cloudflare. */

test.describe('a Player of 15 with the helpers and talking on', () => {
  test.use({ seedConsent: TEEN, seedPlayer: TALK_ON });

  test('the chat box with its note, a reply from Bolt then Nava one at a time, and exactly { skillId, numbers, words } with the ticket in a header', async ({ page }) => {
    const log = await fakeFamilyServer(page, () => says(['bolt', 'Because 98 and 97 both sit just under the base, their distances multiply to the right part.'], ['nava', 'Nod nod. Distances first, the rest follows.']));
    await open(page, TRICK);
    const { a, b } = await nearBase(page);
    await openTalk(page);
    await expect(talkNote(page)).toHaveText(NOTE);
    await expect(talkInput(page)).toHaveAttribute('maxlength', '300');
    await sendAndWait(page, 'why do we add 1?', 'Bolt');
    await expect(say(page)).toContainText('their distances multiply');
    await expect(page.locator('.fh-visit .fh-friend[data-f="bolt"]')).toHaveCount(1);
    await btn(page, 'Next').click();
    await expect(who(page)).toHaveText('Nava');
    await expect(say(page)).toContainText('Distances first');
    expect(log.turns.length).toBe(1);
    const { body, headers } = log.turns[0]!;
    expect(Object.keys(body).sort()).toEqual(['numbers', 'skillId', 'words']);
    expect(body.skillId).toBe('v-near-base');
    expect(body.numbers).toEqual([a, b]);
    expect(body.words).toEqual([{ who: 'player', line: 'why do we add 1?' }]);
    expect(headers['x-vm-ticket']).toMatch(/^family\./);
    expect(JSON.stringify(body)).not.toMatch(/Swift|Tiger|"age"|"grade"|p1/);
  });

  test('the next message carries this Visit\'s words only, and a new question starts them afresh', async ({ page }) => {
    const log = await fakeFamilyServer(page, (_b, n) => says(['eka', n === 1 ? 'Look at how far each number is from the base.' : 'Then multiply those two distances.']));
    await open(page, TRICK);
    await openTalk(page);
    await sendAndWait(page, 'where do I start?', 'Eka');
    await send(page, 'and then?');
    await expect.poll(() => log.turns.length).toBe(2);
    expect(log.turns[1]!.body.words).toEqual([
      { who: 'player', line: 'where do I start?' },
      { who: 'eka', line: 'Look at how far each number is from the base.' },
      { who: 'player', line: 'and then?' },
    ]);
    /* The next question: Show me reveals the steps and Next moves on; the Visit closed with the question */
    await closeVisit(page);
    await page.locator('#practice #prShow').click();
    await page.locator('#practice #prCheck').click();
    await expect(page.locator('#practice #prCheck')).toHaveText('Check');
    await openTalk(page);
    await send(page, 'a new one, help');
    await expect.poll(() => log.turns.length).toBe(3);
    expect(log.turns[2]!.body.words).toEqual([{ who: 'player', line: 'a new one, help' }]);
    expect(JSON.stringify(log.turns[2]!.body.words)).not.toContain('where do I start');
  });

  test('a third reply is dropped, and the lines show one at a time with Next', async ({ page }) => {
    await fakeFamilyServer(page, () => says(['bolt', 'First line.'], ['shunya', 'Second line.'], ['nava', 'Third line.']));
    await open(page, TRICK);
    await openTalk(page);
    await sendAndWait(page, 'hello', 'Bolt');
    const seen = await turns(page);
    const said = seen.map(([w, s]) => `${w}: ${s.replace(/<[^>]+>/g, '')}`).filter(x => /line\./.test(x));
    expect(said).toEqual(['Bolt: First line.', 'Shunya: Second line.']);
    await expect(page.locator('.fh-visit')).not.toContainText('Third line.');
  });

  test('the actions are checked before drawing: an example on other numbers draws steps; the question\'s own numbers, the same answer, a bad part, a bad mood or an unknown action draw nothing', async ({ page }) => {
    let nums: number[] = [];
    const log = await fakeFamilyServer(page, (body, n) => {
      nums = body.numbers;
      const [a, b] = nums as [number, number];
      if (n === 1) return { ...says(['eka', 'Watch one on other numbers.']), actions: [{ type: 'showExample', a: b, b: a }, { type: 'pointAt', part: 'kitchen' }, { type: 'react', mood: 'furious' }, { type: 'nextQuestion' }, { type: 'setMode', mode: 'pro' }] };
      if (n === 2) return { ...says(['eka', 'Same answer, other order.']), actions: [{ type: 'showExample', a: a - 1, b: b + 1 }] }; /* usually a different product; the browser decides */
      return { ...says(['eka', 'Here is a worked one.']), actions: [{ type: 'showExample', a: 94, b: 96 }, { type: 'react', mood: 'think' }, { type: 'showSutra' }] };
    });
    await open(page, TRICK);
    const q = await nearBase(page);
    await openTalk(page);
    await sendAndWait(page, 'show me', 'Eka');
    await expect(say(page)).toContainText('Watch one on other numbers.');
    await expect(say(page).locator('.fh-steps')).toHaveCount(0);
    await expect(say(page).locator('.fh-point')).toHaveCount(0);
    await expect(page.locator('#practice #prCheck')).toHaveText('Check'); /* nothing moved the round on */
    await expect(page.locator('#practice #prQ')).toHaveText(q.q);
    await send(page, 'and again');
    await expect(say(page)).toContainText('Same answer, other order.');
    const ex = say(page).locator('.fh-ex');
    if (await ex.count()) { expect((await ex.textContent())!.replace(/\s/g, '')).not.toBe(q.q.replace(/\s/g, '')); await expect(say(page).locator('.fh-ex-a b')).not.toHaveText(String(q.a * q.b)); }
    await send(page, 'one more');
    await expect(say(page)).toContainText('Here is a worked one.');
    await expect(say(page).locator('.fh-ex')).toHaveText(/94 × 96/);
    expect((await say(page).locator('.fh-steps li').count())).toBeGreaterThan(0);
    await expect(say(page).locator('.fh-ex-a b')).toHaveText('9024');
    await expect(say(page).locator('.fh-sutra [lang="sa-Latn"]')).toContainText('Nikhila');
    await expect(page.locator('.fh-visit .fh-friend[data-f="eka"] svg')).toHaveAttribute('data-pose', 'think');
    expect(log.turns.length).toBe(3);
  });

  test('pointAt outlines the question for a moment, counts as a clue, and the first clue counts as the round\'s Hint', async ({ page }) => {
    const log = await fakeFamilyServer(page, (_b, n) => (n === 1
      ? { ...says({ speaker: 'nava', line: 'See how far each number sits from the base.', clue: true }), actions: [{ type: 'pointAt', part: 'distances' }], cluesLeft: 2 }
      : says(['nava', 'In general, the base is the nearest power of ten.'])));
    await open(page, TRICK);
    await openTalk(page);
    await sendAndWait(page, 'a hint?', 'Nava');
    await expect(say(page).locator('.fh-point')).toContainText('Look at how far each number is from the base.');
    await expect(page.locator('#practice #prQ')).toHaveClass(/fh-pointed/);
    await expect(page.locator('#practice #prSay')).toContainText('Hint:'); /* the round's own Hint, counted as the Hint button counts */
    await expect(visit(page)).toBeVisible(); /* the Visit stays open */
    await send(page, 'and in general?');
    await expect.poll(() => log.turns.length).toBe(2);
    expect(log.turns[1]!.body.words[1]).toEqual({ who: 'nava', line: 'See how far each number sits from the base.', clue: true });
    await expect(page.locator('#practice #prQ')).not.toHaveClass(/fh-pointed/, { timeout: 8_000 });
  });

  test('a phone number, an email address and a long number are stripped before sending; the question\'s numbers stay', async ({ page }) => {
    const log = await fakeFamilyServer(page, () => says(['bolt', 'Good question about the method.']));
    await open(page, TRICK);
    const { a, b } = await nearBase(page);
    await openTalk(page);
    await sendAndWait(page, `call me on 555 123 4567 or sam@example.com, how does ${a} times ${b} work? is it 9506?`, 'Bolt');
    const sent = log.turns[0]!.body.words[0]!.line;
    expect(sent).not.toMatch(/555|example\.com|9506/);
    expect(sent).toContain(`how does ${a} times ${b} work?`);
    await expect(page.locator('.fh-visit')).not.toContainText('555');
  });

  test('Turnstile runs once per browser session: two messages, one check, one ticket; a reload keeps the ticket', async ({ page }) => {
    const log = await fakeFamilyServer(page, () => says(['shunya', 'Round and round we go.']));
    const seen = watchTalkRequests(page);
    await open(page, TRICK);
    await openTalk(page);
    expect(seen.some(u => /challenges\.cloudflare\.com/.test(u)), 'nothing from Turnstile before the first message').toBe(false);
    await sendAndWait(page, 'hi', 'Shunya');
    await send(page, 'hi again');
    await expect.poll(() => log.turns.length).toBe(2);
    expect(await turnstileRenders(page)).toBe(1);
    expect(log.sessions).toEqual([{ scope: 'family', token: 'e2e-turnstile-token' }]);
    expect(log.turns.every(t => t.headers['x-vm-ticket'] === log.turns[0]!.headers['x-vm-ticket'])).toBe(true);
    await page.reload();
    await fakeFamilyServer(page, () => says(['shunya', 'Still here.']));
    await expect(page.locator('#practice #prQ')).toBeVisible();
    await openTalk(page);
    await sendAndWait(page, 'after a reload', 'Shunya');
    expect(await turnstileRenders(page), 'the ticket is kept for the browser session').toBe(0);
    expect(log.sessions.length).toBe(1);
  });

  test('offline or a failing route: scripted help from the same speakers, no error, and the round untouched', async ({ page }) => {
    const log = await fakeFamilyServer(page, () => ({ status: 503 }));
    await open(page, TRICK);
    await openTalk(page);
    await send(page, 'why does this work?');
    await expect(who(page)).toHaveText('Bolt');
    await expect(say(page)).not.toContainText(/error|sorry|failed/i);
    await expect(say(page)).toContainText(/Good question|heart of it|Think of it/);
    expect(log.turns.length).toBe(1);
    await expect(page.locator('#practice #prCheck')).toHaveText('Check');
    /* The route gone entirely: the same scripted help */
    await page.unroute(/\/api\/family\/v1\/turn(\?|$)/);
    await page.route(/\/api\/family\/v1\/turn(\?|$)/, r => r.abort('connectionfailed'));
    await send(page, 'just tell me');
    await expect(who(page)).toHaveText(/Shunya|Nava/);
    await expect(say(page)).not.toContainText(/error|sorry|failed/i);
  });

  test('a reply that is scripted at the server shows like any other, with no error', async ({ page }) => {
    await fakeFamilyServer(page, () => ({ ...says(['bolt', 'Good question. Write how far each number is from the base.']), source: 'scripted' }));
    await open(page, TRICK);
    await openTalk(page);
    await sendAndWait(page, 'why?', 'Bolt');
    await expect(say(page)).toContainText('Write how far each number is from the base.');
    await expect(page.locator('.fh-visit')).not.toContainText(/error|limit|cap/i);
  });

  test('a reply holding the question\'s answer is replaced in the browser too', async ({ page }) => {
    await fakeFamilyServer(page, b => says(['shunya', `Easy, it is ${b.numbers[0]! * b.numbers[1]!}!`]));
    await open(page, TRICK);
    const { a, b } = await nearBase(page);
    await openTalk(page);
    await sendAndWait(page, 'what is the answer?', 'Shunya');
    await expect(say(page)).not.toContainText(String(a * b));
    await expect(say(page)).toContainText(/yours/);
  });

  test('text only: a reply with read aloud on requests no audio and speaks nothing', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('vm.voice', '1'); } catch (e) { /* storage blocked */ } (window as unknown as { __spoken: string[] }).__spoken = []; const s = window.speechSynthesis; if (s) { const orig = s.speak.bind(s); s.speak = u => { (window as unknown as { __spoken: string[] }).__spoken.push(u.text); orig(u); }; } });
    await fakeFamilyServer(page, () => says(['eka', 'The method is the thing to listen for.']));
    const audio: string[] = [];
    page.on('request', r => { if (/voice\.learnvedicmath\.com|\.mp3|\.m4a|\/api\/voice\//.test(r.url())) audio.push(r.url()); });
    await open(page, TRICK);
    await openTalk(page);
    await sendAndWait(page, 'say it', 'Eka');
    await expect(say(page)).toContainText('listen for');
    const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.filter(t => /listen for/.test(t)));
    expect(spoken).toEqual([]);
    expect(audio.filter(u => /method|listen/.test(u))).toEqual([]);
  });

  test('the chat box takes no focus, Escape closes the Visit, and the Me switch stays on after a reload', async ({ page }) => {
    await fakeFamilyServer(page, () => says(['bolt', 'Hi.']));
    await open(page, TRICK);
    await page.locator('#practice .ans-in').first().focus();
    await openTalk(page);
    expect(await page.evaluate(() => !!document.activeElement && document.activeElement.closest('.fh-talk') === null)).toBe(true);
    await closeVisit(page);
    await open(page, '#/me');
    await expect(page.locator('#familyTalkSwitch')).toHaveAttribute('aria-checked', 'true');
    await page.locator('#familyTalkSwitch').click();
    await expect(page.locator('#familyMsg')).toHaveText('Talking with the Family is off.');
    await page.reload();
    await expect(page.locator('#familyTalkSwitch')).toHaveAttribute('aria-checked', 'false');
    await page.goto(`${APP}${TRICK}`);
    await ask(page).click();
    await expect(visit(page)).toBeVisible();
    await expect(talkBox(page)).toHaveCount(0);
  });

  test('with the conversation switched off at the server there is no chat box, and nothing but the status is asked', async ({ page }) => {
    const log = await fakeFamilyServer(page, () => says(['bolt', 'Hi.']), { on: false });
    const seen = watchTalkRequests(page);
    await open(page, TRICK);
    await ask(page).click();
    await expect(visit(page)).toBeVisible();
    await expect.poll(() => log.statusReads).toBe(1);
    await expect(talkBox(page)).toHaveCount(0);
    expect(seen.filter(u => !/status/.test(u))).toEqual([]);
  });
});

test.describe('who is offered it', () => {
  test('Me offers Talk with the Family to a Player of 15 with the helpers on, off by default', async ({ page }) => {
    await page.addInitScript(() => { const p = JSON.parse(localStorage.getItem('vm.players') || 'null'); if (p) { p.list[0].age = 15; p.list[0].family = true; localStorage.setItem('vm.players', JSON.stringify(p)); } });
    await open(page, '#/me');
    const sw = page.locator('#familyTalkSwitch');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(sw).toContainText('Talk with the Family');
    await expect(page.locator('#familyTalkAbout')).toContainText(NOTE);
    await expect(page.locator('#familyTalkAbout')).toContainText('For Players 13 and over.');
    await sw.click();
    await expect(page.locator('#familyTalkSwitch')).toHaveAttribute('aria-checked', 'true');
  });

  test.describe('an under-13 Player', () => {
    test.use({ seedConsent: CHILD, seedPlayer: TALK_ON });
    test('no option in Me, no chat box, and no request to Turnstile or the conversation route, even with the switch forced on', async ({ page }) => {
      const seen = watchTalkRequests(page);
      await open(page, '#/me');
      await expect(page.locator('#familySwitch')).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('#familyTalkSwitch')).toHaveCount(0);
      await page.goto(`${APP}${TRICK}`);
      await ask(page).click();
      await expect(visit(page)).toBeVisible();
      await turns(page);
      await expect(talkBox(page)).toHaveCount(0);
      expect(seen).toEqual([]);
    });
  });

  test.describe('no Age answer', () => {
    test.use({ seedPlayer: { family: true } });
    test('without a Grade answer of 9 or above it is not offered; with grade 9 it is', async ({ page }) => {
      await open(page, '#/me');
      await expect(page.locator('#familySwitch')).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('#familyTalkSwitch')).toHaveCount(0);
      await page.evaluate(async () => { const s = await e2eMod('store'); s.setGrade(9); location.hash = '#/'; });
      await page.evaluate(() => { location.hash = '#/me'; });
      await expect(page.locator('#familyTalkSwitch')).toHaveCount(1);
      await page.evaluate(async () => { const s = await e2eMod('store'); s.setGrade(8); location.hash = '#/'; });
      await page.evaluate(() => { location.hash = '#/me'; });
      await expect(page.locator('#familyTalkSwitch')).toHaveCount(0);
    });
  });
});
