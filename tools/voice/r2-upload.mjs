/* CI voice-upload job (openspec change learnvedicmath, design D17; deploy-pipeline "Voice files exist before the site
   that names them"): put the Studio voice files of the release named by js/voice-index.js into the R2 bucket served at
   https://voice.learnvedicmath.com/, then check that every file the index names is there. The deploy job needs this
   one, so the site never names a voice file the host does not have.

     GH_TOKEN=... R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=learnvedicmath-voice \
       node tools/voice/r2-upload.mjs

   - With no tag in the index nothing has been recorded: nothing is uploaded, and read aloud uses the device's voice.
   - The archive must match the SHA-256 in the index, and every file whose name carries a content hash (the line set,
     the clip directory, each pack and its map) must match that hash, or nothing is uploaded and the file is named.
   - Only objects the bucket does not have yet are uploaded (file names are content or text hashes, so a name never
     changes meaning), with Cache-Control: public, max-age=31536000, immutable and If-None-Match: *, so an existing
     object is never overwritten. Nothing is ever deleted.
     A whole line's clip (l/<hash>.m4a) is named by its text, so changing the voice itself must give its clips new
     names (another prefix or a voice part in the hash), or the bucket keeps playing the old recordings.
   - Afterwards the bucket is listed again, and every file of the release must be in it.
   Locally and in test/voice-tools.test.mjs: VOICE_ARCHIVE=<a .tar> and VOICE_INDEX=<a module>, as for ci-fetch.mjs.
   The S3 calls are a minimal AWS Signature Version 4 client (R2's S3 API, region auto); no SDK is installed. */
import { readFileSync, existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const TYPES = { '.m4a': 'audio/mp4', '.json': 'application/json', '.bin': 'application/octet-stream' };
const sha256 = b => createHash('sha256').update(b).digest('hex');
const HASHED = /^(?:l\/set|p\/[\w-]+)\.([0-9a-f]{10})\.(?:bin|json|m4a)$/;

/* Every file of an unpacked release, as { key, path }; fails on a hashed name whose content does not match it */
export function releaseFiles(dir) {
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const files = walk(dir).map(p => ({ key: relative(dir, p).split('\\').join('/'), path: p }));
  for (const f of files) {
    const m = f.key.match(HASHED);
    if (m && sha256(readFileSync(f.path)).slice(0, 10) !== m[1]) throw new Error(`${f.key}: its content does not match the hash in its name`);
    if (!/^(l|p)\/[\w.-]+\.(m4a|json|bin)$/.test(f.key)) throw new Error(`${f.key}: not a voice file name`);
  }
  return files;
}

/* The names the committed index points at directly */
export const indexedKeys = idx => [idx.lineSet, idx.dir, ...idx.packs.flatMap(p => [p.audio, p.map])];

/* Upload what is missing, never overwrite or delete, then check. client: { list(): Promise<Set<key>>, put(key, body, headers) } */
export async function sync({ files, idx, client, log = console.log }) {
  for (const k of indexedKeys(idx)) if (!files.some(f => f.key === k)) throw new Error(`${k} is named by js/voice-index.js but is not in the release`);
  const have = await client.list();
  const missing = files.filter(f => !have.has(f.key));
  let n = 0;
  for (const f of missing) {
    const ext = f.key.slice(f.key.lastIndexOf('.'));
    await client.put(f.key, readFileSync(f.path), { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': CACHE_CONTROL, 'if-none-match': '*' });
    if (++n % 500 === 0) log(`studio voice: ${n} of ${missing.length} uploaded`);
  }
  const after = await client.list();
  const absent = files.filter(f => !after.has(f.key)).map(f => f.key);
  if (absent.length) throw new Error(`${absent.length} files of the release are not in the bucket after the upload, for example ${absent.slice(0, 3).join(', ')}`);
  log(`studio voice: ${missing.length} uploaded, ${files.length - missing.length} already there, ${files.length} checked in the bucket`);
  return { uploaded: missing.length, skipped: files.length - missing.length };
}

/* ---------- a minimal S3 client for R2 (AWS Signature Version 4) ---------- */
export function s3Client({ accountId, accessKeyId, secretAccessKey, bucket, fetchFn = fetch, now = () => new Date(), host = `${accountId}.r2.cloudflarestorage.com`, region = 'auto' }) {
  const service = 's3';
  const hmac = (k, s) => createHmac('sha256', k).update(s).digest();
  const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  async function call(method, key, query = {}, body = Buffer.alloc(0), extra = {}) {
    const t = now(), amzDate = t.toISOString().replace(/[-:]|\.\d{3}/g, ''), day = amzDate.slice(0, 8);
    const path = (bucket ? '/' + bucket : '') + (key ? '/' + key.split('/').map(enc).join('/') : (bucket ? '' : '/'));
    const qs = Object.keys(query).sort().map(k => `${enc(k)}=${enc(query[k])}`).join('&');
    const payload = sha256(body);
    const headers = { host, 'x-amz-content-sha256': payload, 'x-amz-date': amzDate, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k.toLowerCase(), v])) };
    const names = Object.keys(headers).sort();
    const canonical = [method, path, qs, names.map(n => `${n}:${String(headers[n]).trim()}\n`).join(''), names.join(';'), payload].join('\n');
    const scope = `${day}/${region}/${service}/aws4_request`;
    const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
    const kSigning = hmac(hmac(hmac(hmac('AWS4' + secretAccessKey, day), region), service), 'aws4_request');
    const signature = createHmac('sha256', kSigning).update(toSign).digest('hex');
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`;
    delete headers.host;
    const res = await fetchFn(`https://${host}${path}${qs ? '?' + qs : ''}`, { method, headers, body: method === 'PUT' ? body : undefined });
    return res;
  }
  return {
    call,
    async list() {
      const keys = new Set();
      let token = null;
      do {
        const res = await call('GET', '', { 'list-type': '2', 'max-keys': '1000', ...(token ? { 'continuation-token': token } : {}) });
        if (!res.ok) throw new Error(`listing the bucket: HTTP ${res.status}`);
        const xml = await res.text();
        for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.add(m[1].replace(/&amp;/g, '&'));
        token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? (xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/) || [])[1] : null;
      } while (token);
      return keys;
    },
    async put(key, body, headers) {
      const res = await call('PUT', key, {}, body, headers);
      if (res.status === 412) return; // already there: never overwritten
      if (!res.ok) throw new Error(`uploading ${key}: HTTP ${res.status}`);
    },
  };
}

async function main() {
  const fail = m => { console.error(`::error::studio voice: ${m}`); process.exit(1); };
  const { STUDIO } = await import(process.env.VOICE_INDEX ? pathToFileURL(resolve(process.env.VOICE_INDEX)).href : '../../js/voice-index.js');
  if (!STUDIO.tag) { console.log('studio voice: js/voice-index.js names no release yet; nothing to upload, the built-in voice reads aloud'); return; }
  if (!/^voice-[0-9a-f]{10}$/.test(STUDIO.tag) || !/^[0-9a-f]{64}$/.test(STUDIO.sha256 || '')) fail('the tag or sha256 in js/voice-index.js is malformed');
  if (STUDIO.base !== 'https://voice.learnvedicmath.com/') fail(`js/voice-index.js names ${STUDIO.base}, not the R2 voice host`);
  const env = k => process.env[k] || fail(`${k} is not set`);
  let tar = process.env.VOICE_ARCHIVE && resolve(process.env.VOICE_ARCHIVE);
  if (!tar) {
    const dir = mkdtempSync(join(tmpdir(), 'voice-'));
    try { execFileSync('gh', ['release', 'download', STUDIO.tag, '--pattern', `${STUDIO.tag}.tar`, '--dir', dir], { stdio: 'inherit' }); }
    catch (e) { fail(`could not download ${STUDIO.tag}.tar from the release ${STUDIO.tag}`); }
    tar = join(dir, `${STUDIO.tag}.tar`);
  }
  if (!existsSync(tar)) fail(`${tar} does not exist`);
  const got = sha256(readFileSync(tar));
  if (got !== STUDIO.sha256) fail(`${STUDIO.tag}.tar has sha256 ${got}, but js/voice-index.js expects ${STUDIO.sha256}`);
  const out = mkdtempSync(join(tmpdir(), 'voice-files-'));
  execFileSync('tar', ['-C', out, '-xf', tar]);
  try {
    const files = releaseFiles(out);
    const client = s3Client({ accountId: env('R2_ACCOUNT_ID'), accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY'), bucket: env('R2_BUCKET') });
    await sync({ files, idx: STUDIO, client });
  } catch (e) { fail(e.message); }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
