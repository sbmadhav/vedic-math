/* workers/src/csp.ts, the /_csp report endpoint (openspec change learnvedicmath, security-headers spec; design D5):
   it logs the directive, the blocked origin, the page path, the disposition and the browser family, and nothing else
   about the visitor; it refuses anything that is not a POST of a report up to 8 KB, and logs nothing then. Ported
   from test/csp-worker.test.mjs (openspec change react-typescript, task 1.4); runs inside the Workers runtime
   (@cloudflare/vitest-plugin), the runtime that serves it, together with the Worker's router (workers/src/index.ts). */
import { test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import worker from './index.ts';
import { handle, summarize, blockedOrigin, MAX_BYTES } from './csp.ts';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const post = (body: unknown, type = 'application/reports+json', extra: Record<string, string> = {}) => new Request('https://learnvedicmath.com/_csp', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
  headers: { 'content-type': type, 'user-agent': UA, 'x-forwarded-for': '203.0.113.9', referer: 'https://learnvedicmath.com/play/?secret=1', ...extra },
});
async function run(req: Request) {
  const lines: string[] = [];
  const res = await handle(req, l => lines.push(l));
  return { status: res.status, lines };
}
const modern = {
  type: 'csp-violation', age: 1, url: 'https://learnvedicmath.com/play/?seed=42#/arena', user_agent: UA,
  body: { documentURL: 'https://learnvedicmath.com/play/?seed=42#/arena', blockedURL: 'https://evil.example.net/x.js?player=Swift%20Tiger', effectiveDirective: 'script-src-elem',
    disposition: 'enforce', sample: 'alert(document.cookie)', referrer: 'https://learnvedicmath.com/', statusCode: 200, lineNumber: 4, sourceFile: 'https://learnvedicmath.com/js/app.js?v=1' },
};

test('a blocked script logs one line: directive, origin, page path, disposition, browser', async () => {
  const { status, lines } = await run(post([modern]));
  expect(status).toBe(204);
  expect(lines.length).toBe(1);
  expect(JSON.parse(lines[0]!)).toEqual({ csp: { directive: 'script-src-elem', blocked: 'https://evil.example.net', page: '/play/', disposition: 'enforce', browser: 'chrome' } });
});

test('nothing personal is logged: no IP, query, fragment, referrer, sample or source file', async () => {
  const { lines } = await run(post([modern]));
  for (const bad of ['203.0.113.9', 'seed', 'arena', 'Swift', 'player', 'alert', 'cookie', 'referrer', 'secret', 'js/app.js', 'lineNumber', 'Mozilla']) expect(lines[0], bad).not.toContain(bad);
});

test('the older report-uri format is read the same way', async () => {
  const { status, lines } = await run(post({ 'csp-report': { 'document-uri': 'https://learnvedicmath.com/parents/?x=1', 'blocked-uri': 'inline', 'violated-directive': 'style-src-attr', disposition: 'report', 'script-sample': 'color:red' } }, 'application/csp-report'));
  expect(status).toBe(204);
  expect(JSON.parse(lines[0]!).csp).toEqual({ directive: 'style-src-attr', blocked: 'inline', page: '/parents/', disposition: 'report', browser: 'chrome' });
});

test('keywords and schemes are kept as words, never as URLs', () => {
  expect(blockedOrigin('eval')).toBe('eval');
  expect(blockedOrigin('data:image/png;base64,AAAA')).toBe('data');
  expect(blockedOrigin('blob:https://learnvedicmath.com/1234')).toBe('blob');
  expect(blockedOrigin('chrome-extension://abcdef/script.js')).toBe('chrome-extension');
  expect(blockedOrigin('https://a.example:8443/p?q#f')).toBe('https://a.example:8443');
  expect(blockedOrigin('not a url')).toBe('other');
  expect(summarize({ body: { effectiveDirective: 'img-src<script>', documentURL: 'javascript:alert(1)' } }, '').directive).toBe('img-srcscript');
  /* A page URL that is not http(s) carries its content where a path would be: never logged */
  expect(summarize({ body: { effectiveDirective: 'img-src', documentURL: 'data:text/plain,alice@example.com' } }, '').page).toBe('other');
  expect(summarize({ body: { effectiveDirective: 'img-src', documentURL: 'javascript:alert(1)' } }, '').page).toBe('other');
  /* The legacy violated-directive with the policy's sources keeps only the directive */
  expect(summarize({ 'csp-report': { 'violated-directive': "script-src 'self' https://cdn.example", 'document-uri': 'https://learnvedicmath.com/' } }, '').directive).toBe('script-src');
});

test('anything else is refused and logs nothing: a GET, a wrong type, too big, not JSON', async () => {
  const get = await run(new Request('https://learnvedicmath.com/_csp'));
  expect(get.status).toBe(405);
  const text = await run(post([modern], 'text/plain'));
  expect(text.status).toBe(415);
  const big = await run(post('[' + JSON.stringify(modern) + ',' + ' '.repeat(MAX_BYTES) + ']'));
  expect(big.status).toBe(413);
  const declared = await run(post('[]', 'application/reports+json', { 'content-length': String(MAX_BYTES + 1) }));
  expect(declared.status).toBe(413);
  const junk = await run(post('{not json', 'application/csp-report'));
  expect(junk.status).toBe(400);
  for (const r of [get, text, big, declared, junk]) expect(r.lines).toEqual([]);
});

test('only CSP reports are logged, at most 20 a request', async () => {
  const others = await run(post([{ type: 'deprecation', body: { id: 'x' } }]));
  expect(others.status).toBe(204);
  expect(others.lines).toEqual([]);
  const many = await run(post(Array.from({ length: 30 }, () => ({ type: 'csp-violation', body: { effectiveDirective: 'img-src', blockedURL: 'https://a.example/', documentURL: 'https://learnvedicmath.com/' } }))));
  expect(many.lines.length).toBe(20);
});

/* The Worker's router (workers/src/index.ts): /_csp is the report endpoint, anything else goes to the static assets */
test('the Worker sends /_csp to the report endpoint and every other path to the static assets', async () => {
  const assets: string[] = [];
  const fake = { ...env, ASSETS: { fetch: async (r: Request) => { assets.push(new URL(r.url).pathname); return new Response('asset'); } } as unknown as Fetcher };
  const call = (r: Request) => worker.fetch(r as Request<unknown, IncomingRequestCfProperties>, fake);
  expect((await call(post([modern]))).status).toBe(204);
  expect((await call(new Request('https://learnvedicmath.com/_csp'))).status).toBe(405);
  expect(await (await call(new Request('https://learnvedicmath.com/play/'))).text()).toBe('asset');
  expect(assets).toEqual(['/play/']);
});
