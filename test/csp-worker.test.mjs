/* worker/csp-lib.js, the /_csp report endpoint (openspec change learnvedicmath, security-headers spec; design D5):
   it logs the directive, the blocked origin, the page path, the disposition and the browser family, and nothing else
   about the visitor; it refuses anything that is not a POST of a report up to 8 KB, and logs nothing then. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, summarize, blockedOrigin, MAX_BYTES } from '../worker/csp-lib.js';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const post = (body, type = 'application/reports+json', extra = {}) => new Request('https://learnvedicmath.com/_csp', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
  headers: { 'content-type': type, 'user-agent': UA, 'x-forwarded-for': '203.0.113.9', referer: 'https://learnvedicmath.com/play/?secret=1', ...extra },
});
async function run(req) {
  const lines = [];
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
  assert.equal(status, 204);
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), { csp: { directive: 'script-src-elem', blocked: 'https://evil.example.net', page: '/play/', disposition: 'enforce', browser: 'chrome' } });
});

test('nothing personal is logged: no IP, query, fragment, referrer, sample or source file', async () => {
  const { lines } = await run(post([modern]));
  for (const bad of ['203.0.113.9', 'seed', 'arena', 'Swift', 'player', 'alert', 'cookie', 'referrer', 'secret', 'js/app.js', 'lineNumber', 'Mozilla']) assert.ok(!lines[0].includes(bad), bad);
});

test('the older report-uri format is read the same way', async () => {
  const { status, lines } = await run(post({ 'csp-report': { 'document-uri': 'https://learnvedicmath.com/parents/?x=1', 'blocked-uri': 'inline', 'violated-directive': 'style-src-attr', disposition: 'report', 'script-sample': 'color:red' } }, 'application/csp-report'));
  assert.equal(status, 204);
  assert.deepEqual(JSON.parse(lines[0]).csp, { directive: 'style-src-attr', blocked: 'inline', page: '/parents/', disposition: 'report', browser: 'chrome' });
});

test('keywords and schemes are kept as words, never as URLs', () => {
  assert.equal(blockedOrigin('eval'), 'eval');
  assert.equal(blockedOrigin('data:image/png;base64,AAAA'), 'data');
  assert.equal(blockedOrigin('blob:https://learnvedicmath.com/1234'), 'blob');
  assert.equal(blockedOrigin('chrome-extension://abcdef/script.js'), 'chrome-extension');
  assert.equal(blockedOrigin('https://a.example:8443/p?q#f'), 'https://a.example:8443');
  assert.equal(blockedOrigin('not a url'), 'other');
  assert.equal(summarize({ body: { effectiveDirective: 'img-src<script>', documentURL: 'javascript:alert(1)' } }, '').directive, 'img-srcscript');
  /* A page URL that is not http(s) carries its content where a path would be: never logged */
  assert.equal(summarize({ body: { effectiveDirective: 'img-src', documentURL: 'data:text/plain,alice@example.com' } }, '').page, 'other');
  assert.equal(summarize({ body: { effectiveDirective: 'img-src', documentURL: 'javascript:alert(1)' } }, '').page, 'other');
  /* The legacy violated-directive with the policy's sources keeps only the directive */
  assert.equal(summarize({ 'csp-report': { 'violated-directive': "script-src 'self' https://cdn.example", 'document-uri': 'https://learnvedicmath.com/' } }, '').directive, 'script-src');
});

test('anything else is refused and logs nothing: a GET, a wrong type, too big, not JSON', async () => {
  const get = await run(new Request('https://learnvedicmath.com/_csp'));
  assert.equal(get.status, 405);
  const text = await run(post([modern], 'text/plain'));
  assert.equal(text.status, 415);
  const big = await run(post('[' + JSON.stringify(modern) + ',' + ' '.repeat(MAX_BYTES) + ']'));
  assert.equal(big.status, 413);
  const declared = await run(post('[]', 'application/reports+json', { 'content-length': String(MAX_BYTES + 1) }));
  assert.equal(declared.status, 413);
  const junk = await run(post('{not json', 'application/csp-report'));
  assert.equal(junk.status, 400);
  for (const r of [get, text, big, declared, junk]) assert.deepEqual(r.lines, []);
});

test('only CSP reports are logged, at most 20 a request', async () => {
  const others = await run(post([{ type: 'deprecation', body: { id: 'x' } }]));
  assert.equal(others.status, 204);
  assert.deepEqual(others.lines, []);
  const many = await run(post(Array.from({ length: 30 }, () => ({ type: 'csp-violation', body: { effectiveDirective: 'img-src', blockedURL: 'https://a.example/', documentURL: 'https://learnvedicmath.com/' } }))));
  assert.equal(many.lines.length, 20);
});
