/* The Content-Security-Policy report endpoint, POST /_csp (openspec change learnvedicmath, design D5; security-headers
   spec). workers/src/index.ts is the Worker entry and sends /_csp here; the logic lives in its own module because a
   Worker's entry module may export only handlers. TypeScript since openspec change react-typescript (task 1.4), with
   the same behavior as the move's worker/csp-lib.js. Browsers send reports from report-to (application/reports+json)
   and report-uri (application/csp-report).

   It keeps nothing personal. For each report it logs one line to Workers Logs with exactly: the directive, the
   blocked resource reduced to its origin (or "inline", "eval", "wasm-eval", "data", "blob", "self"), the page path
   without query or fragment, the disposition (enforce or report) and the browser family. Never the IP address, a full
   URL, the referrer, the script sample or anything else in the report. Anything that is not a POST of a report up to
   8 KB is refused (405, 413, 415) and logs nothing. Reviewed monthly (docs/legal/security-program.md). */
export const MAX_BYTES = 8 * 1024;
const TYPES: readonly string[] = ['application/reports+json', 'application/csp-report'];
const KEYWORDS = new Set(['inline', 'eval', 'wasm-eval', 'trusted-types-policy', 'trusted-types-sink', 'self']);

/* The blocked resource as an origin or a keyword, never a path or query */
export function blockedOrigin(raw: unknown): string {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'none';
  if (KEYWORDS.has(s)) return s;
  if (/^(data|blob|filesystem|about|chrome-extension|moz-extension|safari-extension|safari-web-extension):/.test(s)) return s.slice(0, s.indexOf(':'));
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) ? u.origin : u.protocol.replace(':', '');
  } catch { return 'other'; }
}

/* The page path only: no query, no fragment, and capped (a crafted report cannot write long lines) */
export function pagePath(raw: unknown): string {
  try {
    const u = new URL(String(raw));
    /* data:, blob: and other schemes carry their content where a path would be: never logged */
    return /^https?:$/.test(u.protocol) ? u.pathname.slice(0, 80) : 'other';
  } catch { return 'other'; }
}

export function browserFamily(ua: unknown): string {
  const s = String(ua || '');
  if (/Edg\//.test(s)) return 'edge';
  if (/Firefox\//.test(s)) return 'firefox';
  if (/Chrome\/|CriOS\//.test(s)) return 'chrome';
  if (/Safari\//.test(s)) return 'safari';
  return 'other';
}

const word = (s: unknown): string => String(s || '').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 40) || 'unknown';

/* A report as a browser sends it: its fields are read by name, and anything may be missing or of another type */
type Fields = Record<string, unknown>;
export type Summary = { directive: string; blocked: string; page: string; disposition: 'enforce' | 'report'; browser: string };

const fields = (v: unknown): Fields => (v && typeof v === 'object' ? (v as Fields) : {});

/* One report, either format, reduced to the five fields we keep */
export function summarize(report: unknown, ua: unknown): Summary {
  const r = fields(report);
  const b = report && typeof report === 'object' ? fields(r['csp-report'] || r.body || report) : {};
  return {
    /* The legacy violated-directive also carries the policy's sources ("script-src 'self' https://..."): its first word only */
    directive: word(String(b.effectiveDirective || b['effective-directive'] || b['violated-directive'] || b.violatedDirective || '').trim().split(/\s+/)[0]),
    blocked: blockedOrigin(b.blockedURL ?? b['blocked-uri'] ?? b.blockedURI),
    page: pagePath(b.documentURL || b['document-uri'] || r.url),
    disposition: word(b.disposition) === 'report' ? 'report' : 'enforce',
    browser: browserFamily(ua),
  };
}

export async function handle(request: Request, log: (line: string) => void = console.log): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
  const type = ((request.headers.get('content-type') || '').split(';')[0] ?? '').trim().toLowerCase();
  if (!TYPES.includes(type)) return new Response(null, { status: 415 });
  const declared = +(request.headers.get('content-length') || 0);
  if (declared > MAX_BYTES) return new Response(null, { status: 413 });
  /* Read at most MAX_BYTES + 1, whatever the header said */
  const reader = request.body ? request.body.getReader() : null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel().catch(() => {}); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
  }
  let data: unknown;
  try { data = JSON.parse(new TextDecoder().decode(chunks.length === 1 ? chunks[0] : Uint8Array.from(chunks.flatMap(c => [...c])))); }
  catch { return new Response(null, { status: 400 }); }
  const reports = (Array.isArray(data) ? (data as unknown[]) : [data]).slice(0, 20)
    .filter(r => r && typeof r === 'object' && (fields(r)['csp-report'] || fields(r).type === 'csp-violation'));
  const ua = request.headers.get('user-agent');
  for (const r of reports) log(JSON.stringify({ csp: summarize(r, ua) }));
  return new Response(null, { status: 204 });
}

