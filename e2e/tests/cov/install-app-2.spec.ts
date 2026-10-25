import { test, expect } from '../fixtures';

/* install-app spec (openspec change install-app), Requirement "Icons, screenshots and shortcuts": one test per scenario. */

test('What the install dialog shows: each file is served from this site at its stated size, and every shortcut starts with /play/#/', async ({ request }) => {
  const m = await (await request.get('/manifest.webmanifest')).json();
  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['192x192', 'maskable'], ['512x512', 'maskable']])
    expect(m.icons.some((i: { sizes: string; purpose?: string }) => i.sizes === size && (i.purpose || 'any') === purpose), `${size} ${purpose}`).toBe(true);
  expect(m.icons.some((i: { type: string }) => i.type === 'image/svg+xml')).toBe(true);
  for (const f of ['narrow', 'wide']) expect(m.screenshots.some((s: { form_factor: string }) => s.form_factor === f), f).toBe(true);
  for (const f of [...m.icons, ...m.screenshots].filter((x: { type: string }) => x.type === 'image/png')) {
    const r = await request.get(f.src);
    expect(r.status(), f.src).toBe(200);
    const png = await r.body();
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, f.src).toBe(f.sizes);
  }
  for (const s of m.screenshots) expect(s.label, s.src).toBeTruthy();
  expect(m.shortcuts.map((s: { short_name: string }) => s.short_name)).toEqual(['Arena', 'Practice', 'Sutras']);
  for (const s of m.shortcuts) expect(s.url).toMatch(/^\/play\/#\//);
  expect(m.launch_handler.client_mode).toContain('navigate-existing');
});
