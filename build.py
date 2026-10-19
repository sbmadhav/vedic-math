#!/usr/bin/env python3
"""Build Learn Vedic Math into an output directory and stamp cache versions there.

    python3 build.py                          the site for https://learnvedicmath.com/, into _site/
    python3 build.py --out DIR                the same, into DIR (emptied first)
    python3 build.py --dev                    the same layout without stamps and with the 'dev' worker, into _dev/
    python3 build.py --preview --out DIR      a branch preview: adds X-Robots-Tag: noindex, nofollow on every response
    python3 build.py --target moved           the Phase B "Vedic Math has moved" output for https://sbmadhav.com/vedic-math/, into _moved/
    python3 build.py --voice static           Studio voice as static assets under /voice/ (Workers Paid, L8 option b)

The site is served by Cloudflare Workers static assets (wrangler.jsonc; openspec change learnvedicmath, design D1)
from the root of learnvedicmath.com: the landing page at /, the game at /play/, the grown-up pages at /parents/,
/teachers/, /privacy/ and /terms/, the hand-off import page at /import/. Modules are at /js/, styles at /css/ and
/math.css. Nothing is loaded from another repo or site: the design system (vendor/design-system/2.1.0/, published at
/ds/2.1.0/), the fonts (fonts/), the icons (icons/), the GoatCounter script and the Firebase SDK (vendor/) are served
from this site, and every same-origin script and stylesheet a page loads is pinned with ?v=<hash>.

The source in git is never stamped: play/index.html has no import map and loads plain /js/app.js and /math.css, and
sw.js says VERSION = 'dev' with an empty PRECACHE. Stamps exist only in the build output. CI runs this script and
deploys the output (.github/workflows/ci.yml).

What the build does (target site):
- Copies every file git knows about except the repo-only files (`exclude:` in _config.yml, and any path with a part
  starting with "." or "_"). The page sources in site/ and the pinned design system are placed instead.
- Pages: play/index.html (the game) and every site/**/*.html. Each must hold the site header from
  theme/header.html exactly as the vendored compose.py writes it. A page may include a Markdown file with
  <!-- include-md: PATH -->, rendered here (the legal pages and /licenses/).
- In play/index.html: an import map that pins every module under /js/ to ?v=<hash of that file>, and the #vm-css map
  for the play stylesheets. In every page: each same-origin .js and .css it loads gets ?v=<hash>.
- sw.js: VERSION and the PRECACHE list between the "build.py: precache" markers. Every entry has the hash the worker
  checks on install: the game shell /play/, every file it loads, every module at its import-map URL, the play
  stylesheets, the fonts, the icons and the manifest.
- _headers: the security headers on every response, and per page a Content-Security-Policy and a stricter
  Report-Only one, built from that page's inline script hashes and THIRD_PARTIES. No page carries a CSP <meta>.
- _redirects (old /vedic-math/ links to /play/), robots.txt, sitemap.xml, /.well-known/security.txt.

It fails on: stamps in the source; a CSP <meta>, an inline event handler or a javascript: URL in a page; a module
import it cannot pin (bare, outside /js/, or https://); a header that differs from theme/header.html; a vendored file
that does not match its SHA256SUMS; a vendored or font file without an entry in THIRD-PARTY-NOTICES.md; a /vedic-math/
path outside _redirects; a reference to sbmadhav.com other than the export page; a third-party host in neither
THIRD_PARTIES nor LINKS; committed audio, a speech provider host or a key-shaped string; security.txt expiring within
30 days; more or bigger files than Cloudflare serves; a _headers file Cloudflare would refuse.
"""
import argparse, base64, datetime, fnmatch, hashlib, html as htmllib, importlib.util, json, os, pathlib, posixpath, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
ORIGIN = "https://learnvedicmath.com"
APP = "/play/"
DS_DIR, DS_URL = "vendor/design-system/2.1.0", "/ds/2.1.0/"
DS_PUBLISHED = ["tokens.css", "components.css", "header.js"]
DS_TOKENS = DS_URL.lstrip("/") + "tokens.css"
HEADER = "theme/header.html"
EXPORT_PAGE = "https://sbmadhav.com/vm-export/"   # the one sbmadhav.com URL a published file may name (progress hand-off)
MAP_START, MAP_END = "<!-- build.py: import map (generated, do not edit) -->", "<!-- /build.py: import map -->"
SW_START, SW_END = "/* build.py: precache (generated, do not edit) */", "/* /build.py: precache */"
SW_DEV = "const VERSION = 'dev';\nconst PRECACHE = [];"
MARKERS = (".assetsignore", ".nojekyll")  # an earlier build: safe to empty
GENERATED = ("robots.txt", "sitemap.xml", ".well-known/security.txt", "sw.js", "_headers", "_redirects")

# Cloudflare Workers static assets limits (developers.cloudflare.com/workers/platform/limits; design D17)
MAX_FILES = {"r2": 20_000, "static": 100_000}   # Workers Free; Workers Paid when the voice is static assets
MAX_FILE_BYTES = 25 * 1024 * 1024
MAX_HEADER_RULES, MAX_HEADER_LINE, MAX_REDIRECTS = 100, 2_000, 2_000

h = lambda b: hashlib.sha256(b).hexdigest()[:10]


def fail(msg):
    sys.exit(f"build.py: {msg}")


# ---------- Third parties (openspec change learnvedicmath, design D10) ----------
# The one list of hosts outside this site that a page or worker may reach. The Content-Security-Policy is built from
# it, the build fails when a published file names a host that is in neither this list nor LINKS, and
# e2e/tests/third-party.spec.ts fails on a request to a host not here. "csp" maps a directive to the pages that allow
# the host there ("play" is the game only, "*" every page). An empty csp means no page contacts it (only a worker,
# which gets its own policy from its own response).
THIRD_PARTIES = [
    {"host": "https://voice.learnvedicmath.com", "own": True, "csp": {"media-src": "play", "connect-src": "play"},
     "why": "Studio voice files (R2 bucket learnvedicmath-voice, design D17)", "when": "When read aloud plays a recorded line"},
    {"host": "https://www.youtube-nocookie.com", "csp": {"frame-src": "play"},
     "why": "A video plays in the page (privacy-enhanced mode)", "when": "After the Player taps play; no frame before"},
    {"host": "https://learnvedicmath.goatcounter.com", "csp": {"connect-src": "*", "img-src": "*"},
     "why": "Analytics beacons (cookieless; count.js is served from /vendor/goatcounter/)", "when": "After load and idle; never with Do Not Track or GPC"},
    {"host": "https://static.cloudflareinsights.com", "csp": {"script-src": "*"},
     "why": "Cloudflare Web Analytics beacon script (manual snippet, cookieless)", "when": "After load and idle, from js/analytics.js; never with Do Not Track or GPC"},
    {"host": "https://cloudflareinsights.com", "csp": {"connect-src": "*"},
     "why": "Cloudflare Web Analytics endpoint", "when": "After load and idle; never with Do Not Track or GPC"},
    {"host": "https://cdn.jsdelivr.net", "csp": {},
     "why": "Natural voice library (voice worker only)", "when": "After the Player opts in and confirms the download"},
    {"host": "https://huggingface.co", "csp": {},
     "why": "Natural voice model (voice worker only)", "when": "After the Player opts in and confirms the download"},
]
# Firebase hosts come from js/cloud-config.js (firebase_sources below): World boards, for Players 13 and over only.

# Hosts published files only link to or cite (a Player opens them by following a link); a page never fetches them
LINKS = {
    "en.wikipedia.org", "gretil.sub.uni-goettingen.de", "archive.org", "arxiv.org", "list.indology.info", "www.wisdomlib.org",
    "www.khanacademy.org", "www.bprim.org", "github.com", "www.youtube.com", "www.vedicmaths.org", "www.thenewsminute.com",
    "www.ms.uky.edu", "www.jainqq.org", "www.desmos.com", "titus.uni-frankfurt.de", "sanskritdocuments.org", "projecteuler.net",
    "polypad.amplify.com", "nrich.maths.org", "namboothiri.com", "dharmawiki.org", "brilliant.org", "artofproblemsolving.com",
    "www.w3.org", "www.sitemaps.org",  # XML namespaces, not requests
    "www.ftc.gov", "www.ecfr.gov", "policies.google.com", "www.cloudflare.com", "www.goatcounter.com", "firebase.google.com",
    "support.google.com", "openfontlicense.org", "www.apache.org", "opensource.org",
}
OWN_HOST = re.compile(r"^([\w-]+\.)*learnvedicmath\.com$")


def firebase_sources():
    """The Firebase and App Check hosts js/cloud.js talks to, or none when leaderboards are off. The SDK itself is
    served from /vendor/firebase/, so it needs no script host."""
    cfg = (ROOT / "js/cloud-config.js").read_text()
    if re.search(r"export const FIREBASE\s*=\s*null", cfg):
        return {}
    auth = re.search(r"""authDomain:\s*["']([\w.-]+)["']""", cfg)
    if not auth:
        fail("js/cloud-config.js: no authDomain in FIREBASE (the CSP lists it)")
    src = {
        # Auth's popup and redirect helper (gapi), which Safari and mobile browsers load as soon as Auth starts
        "script-src": ["https://apis.google.com"],
        "connect-src": ["https://firestore.googleapis.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com"],
        # Auth's hidden helper frame on the authDomain (same Safari and mobile case)
        "frame-src": [f"https://{auth.group(1)}"],
    }
    if re.search(r"""export const appCheckSiteKey\s*=\s*['"][^'"]+['"]""", cfg):
        # App Check with reCAPTCHA (Enterprise or v3): Google's documented hosts
        src["script-src"] += ["https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"]
        src["connect-src"] += ["https://content-firebaseappcheck.googleapis.com", "https://www.google.com/recaptcha/"]
        src["frame-src"] += ["https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/"]
    return src


def allowed_hosts():
    bare = lambda u: re.sub(r"^https://", "", u).split("/")[0]
    hosts = {bare(t["host"]) for t in THIRD_PARTIES} | LINKS
    for srcs in firebase_sources().values():
        hosts |= {bare(s) for s in srcs}
    cfg = (ROOT / "js/cloud-config.js").read_text()
    hosts |= set(re.findall(r"""["']([\w-]+\.(?:firebaseapp\.com|firebasestorage\.app|appspot\.com))["']""", cfg))
    return hosts


# ---------- repo files ----------
def excludes():
    """The `exclude:` list in _config.yml (plain "- item" lines; no YAML library needed)."""
    out, inside = [], False
    for line in (ROOT / "_config.yml").read_text().splitlines():
        if re.match(r"exclude:\s*$", line):
            inside = True
        elif inside and re.match(r"\s*-\s", line):
            out.append(line.split("-", 1)[1].split(" #")[0].strip().strip("'\""))
        elif inside and line.strip() and not line.lstrip().startswith("#"):
            inside = False
    if not out:
        fail("found no exclude: list in _config.yml")
    return out


def git_files(out):
    """Every file git knows about (tracked, or untracked but not ignored), minus an earlier build inside the repo."""
    files = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                           cwd=ROOT, capture_output=True, check=True).stdout.decode().split("\0")
    skip = out.relative_to(ROOT).as_posix() if out.is_relative_to(ROOT) else None
    return sorted(f for f in filter(None, files)
                  if not (skip and (f == skip or f.startswith(skip + "/"))) and (ROOT / f).is_file())  # is_file: deleted, not staged


def publishable(all_files):
    patterns = [p.rstrip("/") for p in excludes()]
    keep = []
    for f in all_files:
        parts = f.split("/")
        if any(p[0] in "._" for p in parts):
            continue
        prefixes = ["/".join(parts[:i]) for i in range(1, len(parts) + 1)]
        if any(fnmatch.fnmatchcase(pre, pat) for pre in prefixes for pat in patterns):
            continue
        keep.append(f)
    return keep


# ---------- Studio voice guards (openspec better-voice) ----------
# The recordings never live in git: publish.mjs uploads them as a GitHub Release archive, and the CI voice-upload job
# copies them to the voice host (tools/voice/r2-upload.mjs), or with --voice static ci-fetch.mjs unpacks them into
# the output after this build. The site never talks to a speech provider, so no provider host, key or token may appear
# in a published file. The Firebase web config's apiKey (js/cloud-config.js) is a public project identifier, not a
# secret, and is the one key allowed. sounds/ is the one exception to "no committed audio": the 29 Sutra name clips
# and the Om (openspec sutra-pronunciation) are small, hand-made and committed on purpose (js/say-clips.js pins them).
AUDIO_EXT = (".m4a", ".mp3", ".wav", ".ogg", ".opus", ".aac", ".flac", ".tar")
PROVIDER_HOSTS = re.compile(r"texttospeech\.googleapis\.com|api\.elevenlabs\.io|api\.openai\.com|tts\.speech\.microsoft\.com"
                            r"|\.cognitiveservices\.azure\.com|polly\.[a-z0-9-]+\.amazonaws\.com")
SECRETS = re.compile(r"AIza[0-9A-Za-z_-]{30,}|\bAQ\.[0-9A-Za-z_-]{20,}|\bya29\.[0-9A-Za-z_-]{20,}|\bsk-[0-9A-Za-z_-]{20,}")
FIREBASE_KEY = re.compile(r"apiKey:\s*[\"']AIza[0-9A-Za-z_-]{30,}[\"']")
TEXT_EXT = (".js", ".mjs", ".html", ".css", ".json", ".webmanifest", ".txt", ".md", ".svg", ".xml", ".map", ".csv", ".yml", ".yaml")
SBMADHAV = re.compile(r"(?:https?:)?//(?:[\w-]+\.)*sbmadhav\.(?:com|github\.io)|sbmadhav\.goatcounter\.com")
SHARED_PATHS = re.compile(r"(?<![\w.-])/(?:assets/(?:explore|analytics|count)\.js|assets/(?:fonts|icons)/|design-system/)")


def check_voice(files):
    for f in files:
        if f.startswith("voice/") or (f.lower().endswith(AUDIO_EXT) and not f.startswith("sounds/")):
            fail(f"{f}: audio is never committed; record it with tools/voice/ and publish it as a release archive (tools/voice/publish.mjs)")


def check_published(out, voice):
    """Checks on the finished output of the site target."""
    hosts = allowed_hosts()
    files = [p for p in out.rglob("*") if p.is_file()]
    if voice == "r2" and (out / "voice").exists():
        fail("voice/ is in the output; with the R2 voice host no voice file is published with the site (design D17)")
    if len(files) > MAX_FILES[voice]:
        fail(f"{len(files)} files in the output; Cloudflare Workers allows {MAX_FILES[voice]} per version on this plan (design D17)")
    for p in files:
        rel = p.relative_to(out).as_posix()
        if p.stat().st_size > MAX_FILE_BYTES:
            fail(f"{rel}: {p.stat().st_size} bytes; Cloudflare Workers serves files up to 25 MiB")
        if not (p.suffix in TEXT_EXT or p.name in ("_headers", "_redirects")):
            continue
        text = p.read_text(encoding="utf-8", errors="ignore")
        if rel == "js/cloud-config.js":
            text = FIREBASE_KEY.sub("", text)
        host, secret = PROVIDER_HOSTS.search(text), SECRETS.search(text)
        if host:
            fail(f"{rel}: names a speech provider ({host.group(0)}); the site must only play its own recorded files")
        if secret:
            fail(f"{rel}: holds something shaped like an API key or token ({secret.group(0)[:6]}...); keys stay in the shell that records")
        if rel != "_redirects" and "/vedic-math/" in text:
            fail(f"{rel}: names a /vedic-math/ path; the site is served from the root of learnvedicmath.com (only _redirects maps old links)")
        if "gstatic.com/firebasejs" in text:
            fail(f"{rel}: names gstatic.com/firebasejs; the Firebase SDK is served from /vendor/firebase/")
        m = SBMADHAV.search(text.replace(EXPORT_PAGE, ""))
        if m:
            fail(f"{rel}: refers to {m.group(0)}; the site loads and links nothing on sbmadhav.com except the export page {EXPORT_PAGE}")
        if rel.startswith(("vendor/", "ds/", "fonts/")):
            continue  # vendored code and licence texts: pinned by SHA256SUMS and reviewed when vendored; their comments may name anything
        m = SHARED_PATHS.search(text)
        if m:
            fail(f"{rel}: loads {m.group(0)} from the old shared site; this site serves its own copy")
        for m in re.finditer(r"https?://([a-z0-9][a-z0-9.-]*[a-z0-9])", text.replace(EXPORT_PAGE, ""), re.I):
            name = m.group(1).lower()
            if not (OWN_HOST.match(name) or name in hosts):
                fail(f"{rel}: names {name}, which is not in THIRD_PARTIES or LINKS in build.py; add it there, with its reason, first")


def check_vendor_sums(all_files):
    """A vendored package with a SHA256SUMS file must match it byte for byte (a new version is a deliberate PR)."""
    for f in all_files:
        if not (f.startswith("vendor/") and f.endswith("/SHA256SUMS")):
            continue
        d = posixpath.dirname(f)
        for line in (ROOT / f).read_text().splitlines():
            if not line.strip():
                continue
            want, name = line.split(None, 1)
            p = ROOT / d / name.lstrip("*").strip()
            if not p.is_file():
                fail(f"{p.relative_to(ROOT)}: listed in {f} but missing")
            if hashlib.sha256(p.read_bytes()).hexdigest() != want:
                fail(f"{p.relative_to(ROOT)}: does not match {f}; vendor a new version instead of editing a vendored file")


def check_notices(all_files):
    """Every vendored and font file is covered by a path in THIRD-PARTY-NOTICES.md (published at /licenses/)."""
    paths = re.findall(r"`((?:vendor|fonts)/[^`]*)`", (ROOT / "THIRD-PARTY-NOTICES.md").read_text())
    for f in all_files:
        if f.startswith(("vendor/", "fonts/")) and not any(f == p or (p.endswith("/") and f.startswith(p)) for p in paths):
            fail(f"{f}: no entry in THIRD-PARTY-NOTICES.md; add the package, its licence and its path before publishing it")


def check_security_txt(text, today):
    m = re.search(r"^Expires:\s*(\S+)", text, re.M)
    if not m:
        fail("site/.well-known/security.txt has no Expires line")
    expires = datetime.datetime.fromisoformat(m.group(1).replace("Z", "+00:00")).date()
    if expires - today < datetime.timedelta(days=30):
        fail(f"site/.well-known/security.txt expires on {expires}: renew security.txt (a new Expires, under a year ahead)")
    if expires - today > datetime.timedelta(days=366):
        fail(f"site/.well-known/security.txt expires on {expires}; RFC 9116 asks for less than a year ahead")


# ---------- pages ----------
CSP_META = re.compile(r"""<meta\s+http-equiv=["']?Content-Security-Policy""", re.I)
INLINE_SCRIPT = re.compile(r"<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>", re.S | re.I)
RUNS = re.compile(r"""\btype=["']?(text/javascript|module|importmap|application/javascript)\b""", re.I)
INCLUDE_MD = re.compile(r"<!-- include-md: ([\w./-]+) -->")


def load_compose():
    sys.dont_write_bytecode = True  # no __pycache__ inside the vendored copy
    spec = importlib.util.spec_from_file_location("compose", ROOT / DS_DIR / "compose.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def check_page(name, html):
    if CSP_META.search(html):
        fail(f"{name} carries a Content-Security-Policy <meta>; the source must not (the build writes the policy into _headers)")
    if 'type="importmap"' in html or MAP_START in html or 'id="vm-css"' in html:
        fail(f"{name} carries an import map; the source must not (the build adds it)")
    if re.search(r'(?:src|href)="/[^"]*\?v=', html):
        fail(f"{name} loads a file with ?v=; the source must keep the plain URL (the build stamps the copy)")
    handler = re.search(r"""<[a-z][^>]*\s(on[a-z]+)\s*=""", html, re.I)
    if handler:
        fail(f"{name} has an inline event handler ({handler.group(1)}=...), which the CSP blocks; use on() from js/life.js")
    if re.search(r"""(href|src|action)\s*=\s*["']?\s*javascript:""", html, re.I):
        fail(f"{name} has a javascript: URL, which the CSP blocks")


def inline_md(text):
    """Inline Markdown: code, links, bold, italics. The text is escaped first, so nothing in it becomes markup."""
    text = htmllib.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{htmllib.escape(m.group(2))}">{m.group(1)}</a>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", text)
    return text


def markdown(src):
    """The small Markdown the legal drafts and the notices use: headings, paragraphs, lists, quotes, rules, tables.
    Its title is dropped first (the page has its own h1), so a ## section is an h2; HTML comments are dropped."""
    src = re.sub(r"<!--.*?-->", "", src, flags=re.S)
    out, para, items, kind = [], [], [], None

    def flush():
        nonlocal para, items, kind
        if para:
            out.append("<p>" + inline_md(" ".join(para)) + "</p>")
        if items:
            out.append(f"<{kind}>" + "".join(f"<li>{inline_md(i)}</li>" for i in items) + f"</{kind}>")
        para, items, kind = [], [], None

    lines, i = src.splitlines(), 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s:
            flush()
        elif m := re.match(r"(#{1,4})\s+(.*)", s):
            flush()
            n = max(2, min(len(m.group(1)), 5))
            slug = re.sub(r"[^a-z0-9]+", "-", m.group(2).lower()).strip("-")
            out.append(f'<h{n} id="{slug}">{inline_md(m.group(2))}</h{n}>')
        elif re.match(r"^(-{3,}|\*{3,})$", s):
            flush()
            out.append("<hr>")
        elif s.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.match(r"^:?-+:?$", c) for c in cells):
                    rows.append(cells)
                i += 1
            i -= 1
            head, *body = rows
            out.append('<div class="lv-table"><table><thead><tr>' + "".join(f"<th>{inline_md(c)}</th>" for c in head) + "</tr></thead><tbody>"
                       + "".join("<tr>" + "".join(f"<td>{inline_md(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table></div>")
        elif m := re.match(r"([-*]|\d+\.)\s+(.*)", s):
            k = "ol" if m.group(1)[0].isdigit() else "ul"
            if para or (kind and kind != k):
                flush()
            kind = k
            items.append(m.group(2))
        elif s.startswith(">"):
            flush()
            out.append("<blockquote><p>" + inline_md(s.lstrip("> ")) + "</p></blockquote>")
        elif items and line.startswith(("  ", "\t")):
            items[-1] += " " + s
        else:
            if items:
                flush()
            para.append(s)
        i += 1
    flush()
    return "\n".join(out)


def publishable_md(src):
    """A document as a page shows it: without its own title (the page has the h1), without the drafting note
    (a quote starting **DRAFT), and without any section headed "... (remove before publishing)"."""
    out, skip = [], None
    for line in src.splitlines():
        m = re.match(r"(#{1,6})\s", line)
        if m and skip is not None and len(m.group(1)) <= skip:
            skip = None
        if skip is not None:
            continue
        if m and "remove before publishing" in line.lower():
            skip = len(m.group(1))
            continue
        if re.match(r"#\s", line) or line.startswith("> **DRAFT"):
            continue
        out.append(line)
    return "\n".join(out)


def render_includes(name, html):
    def sub(m):
        p = ROOT / m.group(1)
        if not p.is_file():
            fail(f"{name}: includes {m.group(1)}, which does not exist")
        return markdown(publishable_md(p.read_text()))
    return INCLUDE_MD.sub(sub, html)


def csp_hashes(html):
    out = []
    for m in INLINE_SCRIPT.finditer(html):
        if "type=" in m.group(1).lower() and not RUNS.search(m.group(1)):
            continue  # a data block (application/json) never runs; an import map is checked like a script
        out.append("'sha256-" + base64.b64encode(hashlib.sha256(m.group(2).encode()).digest()).decode() + "'")
    return list(dict.fromkeys(out))


def csp(html, page, report_only=False):
    """The policy for one page: this origin, the page's inline script hashes, and THIRD_PARTIES for that page."""
    def extra(directive):
        hosts = [t["host"] for t in THIRD_PARTIES if t["csp"].get(directive) in ("*", page)]
        return hosts + (firebase_sources().get(directive, []) if page == "play" else [])
    j = lambda *parts: " ".join(x for part in parts for x in part)
    frames = extra("frame-src")
    return "; ".join([
        "default-src 'self'",
        # 'wasm-unsafe-eval': the Math Lens digit reader (vendor/tesseract/) compiles WebAssembly; it allows no eval()
        "script-src " + j(["'self'"], ["'wasm-unsafe-eval'"] if page == "play" else [], csp_hashes(html), extra("script-src")),
        # style="" in markup the views build needs 'unsafe-inline' today; the Report-Only variant tries without it
        "style-src 'self'" + ("" if report_only else " 'unsafe-inline'"),
        "img-src " + j(["'self'", "data:"], extra("img-src")),
        "font-src 'self'",
        "connect-src " + j(["'self'"], extra("connect-src")),
        "frame-src " + (j(frames) if frames else "'none'"),
        "worker-src 'self'",
        "manifest-src 'self'",
        "media-src " + j(["'self'"], extra("media-src")),
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
        *(["require-trusted-types-for 'script'"] if report_only else []),
        # The Report-Only variant reports through report-to only, which the Reporting API batches: through report-uri
        # every innerHTML of a view would be one request to /_csp
        *([] if report_only else ["report-uri /_csp"]),
        "report-to csp",
    ])


YT = '"https://www.youtube-nocookie.com"'
COMMON_HEADERS = [
    ("Strict-Transport-Security", "max-age=63072000; includeSubDomains"),
    ("X-Content-Type-Options", "nosniff"),
    ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ("Cross-Origin-Resource-Policy", "same-origin"),
    ("X-Frame-Options", "DENY"),
    ("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=(), "
     f"browsing-topics=(), fullscreen=(self {YT}), autoplay=(self {YT}), encrypted-media=(self {YT}), picture-in-picture=(self {YT})"),
    # Relative, so a preview or a local run reports to its own /_csp, never to production's
    ("Reporting-Endpoints", 'csp="/_csp"'),
]


def headers_file(pages, preview):
    """_headers for Cloudflare static assets. Policies and COOP sit on exact page paths only: Cloudflare joins the values
    of every rule that matches a path, and two policies would both be enforced."""
    rules = [("/*", COMMON_HEADERS + ([("X-Robots-Tag", "noindex, nofollow")] if preview else []))]
    for url, (html, kind) in sorted(pages.items()):
        rules.append((url, [("Cross-Origin-Opener-Policy", "same-origin-allow-popups" if url == "/import/" else "same-origin"),
                            ("Content-Security-Policy", csp(html, kind)),
                            ("Content-Security-Policy-Report-Only", csp(html, kind, report_only=True))]))
    if len(rules) > MAX_HEADER_RULES:
        fail(f"_headers has {len(rules)} rules; Cloudflare allows {MAX_HEADER_RULES}")
    text = "# Written by build.py (do not edit): security headers on every response, and a policy per page.\n"
    for path, hs in rules:
        text += path + "\n" + "".join(f"  {k}: {v}\n" for k, v in hs)
    for line in text.splitlines():
        if len(line) > MAX_HEADER_LINE:
            fail(f"_headers: a line is {len(line)} characters, over Cloudflare's {MAX_HEADER_LINE} ({line[:60]}...); move an inline script out of the page")
    return text


REDIRECTS = ("# Written by build.py: old links from sbmadhav.com/vedic-math/ reach the game (the hash route rides along).\n"
             "/vedic-math /play/ 301\n/vedic-math/* /play/ 301\n")


def stamp_refs(html, versions):
    """Every same-origin .js and .css a page loads gets ?v=<hash> (fonts, icons and the manifest keep plain URLs)."""
    def sub(m):
        v = versions.get(m.group(2))
        return f'{m.group(1)}{m.group(2)}?v={v}"' if v else m.group(0)
    return re.sub(r'((?:src|href)=")(/[^"?#]+\.(?:js|css))"', sub, html)


def page_url(rel):
    """site/parents/index.html -> /parents/; site/404.html -> /404.html; play/index.html -> /play/."""
    rel = rel[len("site/"):] if rel.startswith("site/") else rel
    return "/" + (rel[: -len("index.html")] if rel.endswith("index.html") else rel)


def build_site(args, out):
    dev = args.dev
    today = datetime.date.fromisoformat(os.environ["BUILD_TODAY"]) if os.environ.get("BUILD_TODAY") else datetime.date.today()
    all_files = git_files(out)
    for required in ["play/index.html", "sw.js", "math.css", "manifest.webmanifest", "js/app.js", HEADER, "site/index.html",
                     "site/404.html", "site/.well-known/security.txt", "THIRD-PARTY-NOTICES.md"]:
        if required not in all_files:
            fail(f"{required} is missing")
    check_vendor_sums(all_files)
    check_notices(all_files)
    files = publishable(all_files)
    check_voice(files)
    src = lambda p: (ROOT / p).read_bytes()
    sw = (ROOT / "sw.js").read_text()
    blocks = re.findall(re.escape(SW_START) + r"\n?(.*?)\n?" + re.escape(SW_END), sw, re.S)
    if len(blocks) != 1:
        fail("sw.js: precache markers not found")
    if blocks[0].strip() != SW_DEV:
        fail(f"sw.js is stamped; the source must keep\n{SW_DEV}\nbetween the precache markers (the build stamps the copy)")

    # Published path -> source path. Pages are rendered separately; the design system goes to /ds/2.1.0/.
    publish = {f: f for f in files if not f.startswith("site/")}
    publish.update({DS_URL.lstrip("/") + f: f"{DS_DIR}/{f}" for f in DS_PUBLISHED})
    # The published tokens.css drops its @font-face lines (they point at the old site's /assets/fonts/): theme/fonts.css
    # declares the fonts once, from /fonts/ on this site
    tokens = re.sub(r"(?m)^@font-face[^\n]*\n", "", (ROOT / DS_DIR / "tokens.css").read_text())
    tokens = tokens.replace("/* Self-hosted fonts in /assets/fonts (no third-party requests) */", "/* Fonts: declared once in /theme/fonts.css (build.py took the font rules out of this copy) */")
    body = lambda p: tokens.encode() if p == DS_TOKENS else src(publish[p])
    versions = {"/" + p: h(body(p)) for p in publish if p.endswith((".js", ".css"))}

    compose, partial = load_compose(), (ROOT / HEADER).read_text()
    pages = {}  # url -> [html, kind]
    for rel in ["play/index.html"] + sorted(f for f in all_files if f.startswith("site/") and f.endswith(".html")):
        html = (ROOT / rel).read_text()
        check_page(rel, html)
        if "<!-- md-header -->" in html:
            try:
                fresh = compose.compose(html, partial)
            except compose.ComposeError as e:
                fail(f"{rel}: {e}")
            if fresh != html:
                fail(f"{rel}: its header differs from {HEADER}. Run python3 {DS_DIR}/compose.py {HEADER} {rel}")
        elif rel != "site/404.html":
            fail(f"{rel}: has no <!-- md-header --> block; every page uses the site header ({HEADER})")
        pages[page_url(rel)] = [render_includes(rel, html).replace("{{year}}", str(today.year)), "play" if rel == "play/index.html" else "site"]

    # Every static import is a relative or absolute path inside /js/. A bare specifier would fail without the map, a path
    # outside the folder would not be pinned, and a full URL would run code from another site.
    js = sorted(f for f in publish if f.startswith("js/") and f.endswith(".js"))
    import_re = re.compile(r"""(?:^|[;\n}])\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|[;\n}])\s*import\s*['"]([^'"]+)['"]""")
    for p in js:
        for m in import_re.finditer(src(p).decode()):
            spec = m.group(1) or m.group(2)
            if re.match(r"https?://", spec):
                fail(f"{p}: imports {spec}; every module is served and pinned by this site")
            if not spec.startswith(("./", "../", "/")):
                fail(f"{p}: bare import '{spec}' is not covered by the import map")
            resolved = posixpath.normpath(spec if spec.startswith("/") else posixpath.join(posixpath.dirname("/" + p), spec))
            if not resolved.startswith("/js/") or resolved[1:] not in publish:
                fail(f"{p}: import '{spec}' resolves to {resolved}, outside the versioned /js/ modules")

    imports = {f"/{p}": f"/{p}?v={versions['/' + p]}" for p in js}
    play_css = {f"/{f}": versions["/" + f] for f in publish if f.startswith("css/") and f.endswith(".css")}
    for url, page in pages.items():
        html = page[0]
        if url == APP and not dev:
            map_block = (MAP_START + '\n<script type="importmap">\n' + json.dumps({"imports": imports}, indent=1) + "\n</script>\n"
                         + '<script type="application/json" id="vm-css">' + json.dumps(play_css) + "</script>\n" + MAP_END + "\n")
            entry = re.search(r'<script type="module" src="/js/app\.js"></script>', html)
            if not entry:
                fail("play/index.html: module entry script not found")
            html = html[:entry.start()] + map_block + html[entry.start():]
        if not dev:
            html = stamp_refs(html, versions)
        for m in re.finditer(r'(?:src|href)="(/[^"?#]*)', html):
            if not (m.group(1).endswith("/") or m.group(1)[1:] in publish or m.group(1)[1:] in GENERATED):
                fail(f"{url}: loads or links {m.group(1)}, which is not published")
        page[0] = html

    # ---------- sw.js: precache list and VERSION ----------
    play_html = pages[APP][0]
    own = {APP: None, "/manifest.webmanifest": "manifest.webmanifest"}  # url -> published path (None: the shell)
    for u in re.findall(r'(?:src|href)="(/[^"]+)"', play_html):
        if u.split("?")[0][1:] in publish:
            own[u] = u.split("?")[0][1:]
    own.update({imports[f"/{p}"]: p for p in js})
    own.update({f"{u}?v={v}": u[1:] for u, v in play_css.items()})
    own.update({u: u[1:] for u in re.findall(r"url\((/fonts/[^)]+)\)", (ROOT / "theme/fonts.css").read_text())})
    own.update({i["src"]: i["src"][1:] for i in json.loads(src("manifest.webmanifest")).get("icons", [])})
    for u, p in own.items():
        if p is not None and p not in publish:
            fail(f"{u}: in the precache list but not published")
    precache = [[u, h(play_html.encode()) if p is None else h(body(p))] for u, p in own.items()]
    if dev:
        sw_version = "dev"
    else:
        listing = "[\n" + ",\n".join(" " + json.dumps(e) for e in precache) + "\n]"
        block = re.compile(re.escape(SW_START) + r".*?" + re.escape(SW_END), re.S)
        sw_version = h((listing + block.sub(SW_START + SW_END, sw)).encode())
        sw = block.sub(lambda m: f"{SW_START}\nconst VERSION = '{sw_version}';\nconst PRECACHE = {listing};\n{SW_END}", sw)

    # ---------- generated files ----------
    security_txt = (ROOT / "site/.well-known/security.txt").read_text()
    check_security_txt(security_txt, today)
    listed = sorted(u for u in pages if u not in ("/404.html", "/import/"))
    generated = {
        "_headers": headers_file({u: (p[0], p[1]) for u, p in pages.items() if u != "/404.html"}, args.preview),
        "_redirects": REDIRECTS,
        "robots.txt": f"User-agent: *\nAllow: /\n\nSitemap: {ORIGIN}/sitemap.xml\n",
        "sitemap.xml": '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                       + "".join(f"  <url><loc>{ORIGIN}{u}</loc></url>\n" for u in listed) + "</urlset>\n",
        ".well-known/security.txt": security_txt,
        "sw.js": sw,
        DS_TOKENS: tokens,
        ".assetsignore": "# Written by build.py: files wrangler does not upload as static assets\n.assetsignore\n",
    }
    if sum(1 for l in REDIRECTS.splitlines() if l and not l.startswith("#")) > MAX_REDIRECTS:
        fail(f"_redirects has more than {MAX_REDIRECTS} rules")

    # ---------- write the output ----------
    empty(out)
    for f, s in publish.items():
        (out / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / s, out / f)
    for url, (html, _) in pages.items():
        dest = out / (url[1:] + ("index.html" if url.endswith("/") else ""))
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(html)
    for f, text in generated.items():
        (out / f).parent.mkdir(parents=True, exist_ok=True)
        (out / f).write_text(text)
    check_published(out, args.voice)

    rel = out.relative_to(ROOT) if out.is_relative_to(ROOT) else out
    n = sum(1 for p in out.rglob("*") if p.is_file())
    print(f"{rel}/: {n} files, {len(pages)} pages, {len(imports)} modules pinned, app.js v={versions['/js/app.js']}, "
          f"sw.js VERSION={sw_version} ({len(precache)} files precached){' [dev]' if dev else ''}{' [preview]' if args.preview else ''}")


def empty(out):
    if out.exists():
        if any(out.iterdir()) and not any((out / m).exists() for m in MARKERS):
            fail(f"{out} is not empty and is not an earlier build; refusing to delete it")
        shutil.rmtree(out)
    out.mkdir(parents=True)


# ---------- target moved: the Phase B page for the old origin (design D8, D9) ----------
OLD_BASE = "/vedic-math/"


def build_moved(out):
    """https://sbmadhav.com/vedic-math/ during Phase B. index.html and 404.html are the moved page; its packer and the
    hand-off schema are pinned with ?v=; sw.js ships with KILL = true, the old cache prefix and a built VERSION, so every
    browser that still has the old worker retires it. Paths stay under /vedic-math/, because that is where this is
    served. GitHub Pages cannot send headers, so this page keeps its policy in a <meta>, as the old app did."""
    page_src, pack_src, schema_src = "moved/index.html", "moved/handoff-pack.js", "js/handoff-schema.js"
    for f in (page_src, pack_src, schema_src, "sw.js"):
        if not (ROOT / f).is_file():
            fail(f"{f} is missing (target moved)")
    html = (ROOT / page_src).read_text()
    check_page(page_src, html)
    pack_url, schema_url = OLD_BASE + "js/handoff-pack.js", OLD_BASE + "js/handoff-schema.js"
    entry = f'<script type="module" src="{pack_url}"></script>'
    if entry not in html:
        fail(f"{page_src}: does not load {pack_url} as a module")
    v_pack, v_schema = h((ROOT / pack_src).read_bytes()), h((ROOT / schema_src).read_bytes())
    imports = {pack_url: f"{pack_url}?v={v_pack}", schema_url: f"{schema_url}?v={v_schema}"}
    html = html.replace(entry, '<script type="importmap">\n' + json.dumps({"imports": imports}, indent=1) + "\n</script>\n"
                        + f'<script type="module" src="{pack_url}?v={v_pack}"></script>')
    policy = ("default-src 'none'; script-src 'self' " + " ".join(csp_hashes(html)) + "; style-src 'self' 'unsafe-inline'; "
              "img-src 'self' data: https://sbmadhav.goatcounter.com; connect-src https://sbmadhav.goatcounter.com; "
              "base-uri 'none'; form-action 'none'; object-src 'none'")
    charset = re.search(r'<meta charset="utf-8">\n?', html)
    if not charset:
        fail(f'{page_src} has no <meta charset="utf-8"> to put the policy after')
    html = html[:charset.end()] + f'<meta http-equiv="Content-Security-Policy" content="{policy}">\n' + html[charset.end():]
    sw = (ROOT / "sw.js").read_text()
    block = re.compile(re.escape(SW_START) + r".*?" + re.escape(SW_END), re.S)
    if not block.search(sw) or "const KILL = false;" not in sw or not re.search(r"const PREFIX = '[\w-]+';", sw):
        fail("sw.js: the precache markers, the KILL switch or PREFIX not found")
    sw = re.sub(r"const PREFIX = '[\w-]+';", "const PREFIX = 'vedic-math-';", sw.replace("const KILL = false;", "const KILL = true;", 1), count=1)
    sw_version = h(("moved\n" + block.sub(SW_START + SW_END, sw)).encode())
    sw = block.sub(lambda m: f"{SW_START}\nconst VERSION = '{sw_version}';\nconst PRECACHE = [];\n{SW_END}", sw)
    empty(out)
    (out / "js").mkdir()
    (out / "index.html").write_text(html)
    (out / "404.html").write_text(html)
    shutil.copy2(ROOT / pack_src, out / "js/handoff-pack.js")
    shutil.copy2(ROOT / schema_src, out / "js/handoff-schema.js")
    (out / "sw.js").write_text(sw)
    (out / ".nojekyll").write_bytes(b"")
    for m in re.finditer(r'(?:src|href)="(/[^"]*)"', html):
        if not m.group(1).startswith((OLD_BASE, "/assets/analytics.js")):
            fail(f"{page_src}: {m.group(1)} is outside {OLD_BASE}")
    rel = out.relative_to(ROOT) if out.is_relative_to(ROOT) else out
    print(f"{rel}/: moved page for {OLD_BASE}, handoff-pack.js v={v_pack}, KILL sw.js VERSION={sw_version}")


def main():
    ap = argparse.ArgumentParser(description="Build Learn Vedic Math into an output directory with cache stamps.")
    ap.add_argument("--out", help="output directory, emptied first (default: _site/, _dev/ with --dev, _moved/ for --target moved)")
    ap.add_argument("--dev", action="store_true", help="no stamps and the 'dev' worker, for local runs")
    ap.add_argument("--preview", action="store_true", help="a branch preview: X-Robots-Tag: noindex, nofollow on every response")
    ap.add_argument("--target", choices=["site", "moved"], default="site", help="site (learnvedicmath.com) or moved (the Phase B page for the old origin)")
    ap.add_argument("--voice", choices=["r2", "static"], default="r2", help="where the Studio voice lives (design D17): the R2 voice host (default) or static assets (Workers Paid)")
    args = ap.parse_args()
    default = "_moved" if args.target == "moved" else "_dev" if args.dev else "_site"
    out = pathlib.Path(args.out).resolve() if args.out else ROOT / default
    if out == ROOT or ROOT.is_relative_to(out):
        fail("--out must not be the repo itself")
    if args.target == "moved":
        build_moved(out)
    else:
        build_site(args, out)


if __name__ == "__main__":
    main()
