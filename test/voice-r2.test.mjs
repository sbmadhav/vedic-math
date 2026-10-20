/* tools/voice/r2-upload.mjs (openspec change learnvedicmath, design D17; task 7.7): a file whose content does not match
   its hashed name is refused, objects the bucket has are skipped, nothing is overwritten or deleted, and every file of
   the release must be in the bucket afterwards. The S3 calls are signed with AWS Signature Version 4. Runs on a fake
   bucket; no network. */
import test from './support/node-test.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { releaseFiles, sync, s3Client, indexedKeys, CACHE_CONTROL } from '../tools/voice/r2-upload.mjs';

const dir = mkdtempSync(join(tmpdir(), 'voice-r2-'));
test.after(() => rmSync(dir, { recursive: true, force: true }));
const h10 = s => createHash('sha256').update(s).digest('hex').slice(0, 10);

function release(name, { corrupt = false } = {}) {
  const root = join(dir, name);
  const set = 'set-bytes', dirJ = '{"c":1}', pack = 'pack-audio', map = '{"m":1}';
  const files = { [`l/set.${h10(set)}.bin`]: set, [`p/dir.${h10(dirJ)}.json`]: dirJ, [`p/core.${h10(pack)}.m4a`]: corrupt ? 'tampered' : pack, [`p/core.${h10(map)}.json`]: map, 'l/00000000000001.m4a': 'line-1', 'l/00000000000002.m4a': 'line-2' };
  for (const [k, v] of Object.entries(files)) { mkdirSync(join(root, k, '..'), { recursive: true }); writeFileSync(join(root, k), v); }
  const idx = { lineSet: `l/set.${h10(set)}.bin`, dir: `p/dir.${h10(dirJ)}.json`, packs: [{ name: 'core', audio: `p/core.${h10(pack)}.m4a`, map: `p/core.${h10(map)}.json` }] };
  return { root, idx };
}
function bucket(have = []) {
  const objects = new Map(have.map(k => [k, 'old']));
  const log = { puts: [], deletes: 0 };
  return {
    objects, log,
    client: {
      list: async () => new Set(objects.keys()),
      put: async (key, body, headers) => { log.puts.push({ key, headers }); if (objects.has(key) && headers['if-none-match'] === '*') return; objects.set(key, body.toString()); },
      delete: async () => { log.deletes++; },
    },
  };
}

test('a release is uploaded with immutable caching and no overwrite, and checked in the bucket', async () => {
  const { root, idx } = release('good'), b = bucket();
  const res = await sync({ files: releaseFiles(root), idx, client: b.client, log: () => {} });
  assert.deepEqual(res, { uploaded: 6, skipped: 0 });
  for (const p of b.log.puts) {
    assert.equal(p.headers['cache-control'], CACHE_CONTROL);
    assert.equal(p.headers['if-none-match'], '*');
  }
  assert.equal(b.log.puts.find(p => p.key.endsWith('.m4a')).headers['content-type'], 'audio/mp4');
  for (const k of indexedKeys(idx)) assert.ok(b.objects.has(k), k);
});

test('objects the bucket already has are skipped, never overwritten, and nothing is deleted', async () => {
  const { root, idx } = release('again'), first = releaseFiles(root).map(f => f.key);
  const b = bucket([first[0], first[1], 'l/99999999999999.m4a']);
  const res = await sync({ files: releaseFiles(root), idx, client: b.client, log: () => {} });
  assert.deepEqual(res, { uploaded: 4, skipped: 2 });
  assert.ok(!b.log.puts.some(p => p.key === first[0] || p.key === first[1]));
  assert.equal(b.objects.get(first[0]), 'old');
  assert.ok(b.objects.has('l/99999999999999.m4a'), 'an object of an older release stays');
  assert.equal(b.log.deletes, 0);
});

test('a file whose content does not match its hashed name is refused before anything is uploaded', () => {
  const { root } = release('bad', { corrupt: true });
  assert.throws(() => releaseFiles(root), /p\/core\.[0-9a-f]{10}\.m4a: its content does not match the hash in its name/);
});

test('a release missing a file the index names, or a bucket missing a file afterwards, fails', async () => {
  const { root, idx } = release('short');
  rmSync(join(root, idx.dir));
  await assert.rejects(sync({ files: releaseFiles(root), idx, client: bucket().client, log: () => {} }), /is named by js\/voice-index\.js but is not in the release/);
  const { root: r2, idx: i2 } = release('lost'), b = bucket();
  b.client.put = async () => {}; // the bucket swallows every upload
  await assert.rejects(sync({ files: releaseFiles(r2), idx: i2, client: b.client, log: () => {} }), /files of the release are not in the bucket after the upload/);
});

test('the S3 client signs with AWS Signature Version 4 for R2, lists every page and treats 412 as already there', async () => {
  const calls = [];
  const pages = ['<ListBucketResult><Contents><Key>l/a.m4a</Key></Contents><IsTruncated>true</IsTruncated><NextContinuationToken>tok</NextContinuationToken></ListBucketResult>',
    '<ListBucketResult><Contents><Key>p/b.json</Key></Contents><IsTruncated>false</IsTruncated></ListBucketResult>'];
  const fetchFn = async (url, init) => { calls.push({ url, init }); return init.method === 'GET' ? { ok: true, status: 200, text: async () => pages.shift() } : { ok: false, status: 412 }; };
  const c = s3Client({ accountId: 'acct', accessKeyId: 'AKID', secretAccessKey: 'secret', bucket: 'learnvedicmath-voice', fetchFn, now: () => new Date('2026-10-19T12:00:00Z') });
  assert.deepEqual([...await c.list()], ['l/a.m4a', 'p/b.json']);
  assert.match(calls[0].url, /^https:\/\/acct\.r2\.cloudflarestorage\.com\/learnvedicmath-voice\?list-type=2&max-keys=1000$/);
  assert.match(calls[1].url, /continuation-token=tok/);
  const auth = calls[0].init.headers.authorization;
  assert.match(auth, /^AWS4-HMAC-SHA256 Credential=AKID\/20261019\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(calls).includes('secret'), 'the secret never leaves the process');
  await c.put('p/b.json', Buffer.from('{}'), { 'content-type': 'application/json', 'cache-control': CACHE_CONTROL, 'if-none-match': '*' });
  assert.equal(calls[2].init.method, 'PUT');
  assert.match(calls[2].init.headers.authorization, /SignedHeaders=cache-control;content-type;host;if-none-match;x-amz-content-sha256;x-amz-date/);
});

test('the signature matches the AWS Signature Version 4 example for S3 (GET object with a Range header)', async () => {
  let seen;
  const c = s3Client({ accountId: 'x', accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', bucket: '',
    host: 'examplebucket.s3.amazonaws.com', region: 'us-east-1', now: () => new Date('2013-05-24T00:00:00Z'), fetchFn: async (url, init) => { seen = { url, init }; return { ok: true, status: 200 }; } });
  await c.call('GET', 'test.txt', {}, Buffer.alloc(0), { range: 'bytes=0-9' });
  assert.equal(seen.url, 'https://examplebucket.s3.amazonaws.com/test.txt');
  assert.match(seen.init.headers.authorization, /Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41$/);
});
