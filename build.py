#!/usr/bin/env python3
"""Build the publishable Vedic Math into an output directory and stamp cache versions there.

    python3 build.py               builds into _site/
    python3 build.py --out DIR     builds into DIR (emptied first)

This repo is served at https://sbmadhav.com/vedic-math/ (GitHub project Pages under the
sbmadhav.github.io custom domain), so every page URL starts with /vedic-math/. CI runs this
script and publishes the output (.github/workflows/ci.yml), the same pattern as
sbmadhav.github.io's site-build.py.

The source in git is never stamped: index.html loads plain /vedic-math/js/app.js and
/vedic-math/math.css with no import map, and sw.js says VERSION = 'dev' with an empty PRECACHE
(a 'dev' worker caches nothing). Stamps exist only in the build output, so version numbers never
show up in diffs or merge conflicts.

What the build does:
- Copies every file git knows about (tracked, or untracked but not ignored) except the repo-only
  files. The exclude list is `exclude:` in _config.yml, the single list for both this script and a
  Jekyll branch deploy. Like Jekyll, it also leaves out any path with a part that starts with "."
  or "_". Writes .nojekyll so Pages serves the output as is.
- In the copied index.html: an import map that pins every module under /vedic-math/js/ (skills/
  included) to ?v=<hash of that file>, so a visitor never runs a new app.js against old imports;
  the entry script and math.css get the same stamp. Files that live in the main site repo (the
  design-system CSS, the Explore menu, analytics, fonts, icons) stay unstamped absolute URLs,
  because this repo cannot hash them.
- In the copied sw.js, between the "build.py: precache" markers: VERSION and the PRECACHE list.
  That is every file of this repo the page loads, at the exact URL index.html uses, with a hash the
  worker checks on install, plus the shared files index.html and manifest.webmanifest reference (no
  hash). VERSION hashes all of that and the rest of sw.js, so any change to the app is a new cache.

It fails if the source carries stamps (an import map, a ?v= on app.js or math.css, or a VERSION
other than 'dev'), and on a module import it cannot pin.
"""
import argparse, fnmatch, hashlib, json, pathlib, posixpath, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
BASE = "/vedic-math/"
MAP_START, MAP_END = "<!-- build.py: import map (generated, do not edit) -->", "<!-- /build.py: import map -->"
SW_START, SW_END = "/* build.py: precache (generated, do not edit) */", "/* /build.py: precache */"
SW_DEV = "const VERSION = 'dev';\nconst PRECACHE = [];"
SHARED = ["/design-system/tokens.css", "/design-system/components.css", "/assets/explore.js", "/assets/analytics.js"]

h = lambda b: hashlib.sha256(b).hexdigest()[:10]


def fail(msg):
    sys.exit(f"build.py: {msg}")


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


def publishable(out):
    files = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                           cwd=ROOT, capture_output=True, check=True).stdout.decode().split("\0")
    patterns = [p.rstrip("/") for p in excludes()]
    if out.is_relative_to(ROOT):  # never publish an earlier build that sits inside the repo
        patterns.append(out.relative_to(ROOT).as_posix())
    keep = []
    for f in filter(None, files):
        parts = f.split("/")
        if any(p[0] in "._" for p in parts):
            continue
        prefixes = ["/".join(parts[:i]) for i in range(1, len(parts) + 1)]
        if any(fnmatch.fnmatchcase(pre, pat) for pre in prefixes for pat in patterns):
            continue
        if (ROOT / f).is_file():  # skips files deleted but not yet staged
            keep.append(f)
    return sorted(keep)


def check_source(html, sw):
    if 'type="importmap"' in html or MAP_START in html:
        fail("index.html carries an import map; the source must not (the build adds it)")
    for url in [BASE + "js/app.js", BASE + "math.css", *SHARED]:
        if re.search(r'(?:src|href)="' + re.escape(url) + r'\?v=', html):
            fail(f"index.html loads {url} with ?v=; the source must keep the plain URL")
    blocks = re.findall(re.escape(SW_START) + r"\n?(.*?)\n?" + re.escape(SW_END), sw, re.S)
    if len(blocks) != 1:
        fail("sw.js: precache markers not found")
    if blocks[0].strip() != SW_DEV:
        fail(f"sw.js is stamped; the source must keep\n{SW_DEV}\nbetween the precache markers (the build stamps the copy)")


def main():
    ap = argparse.ArgumentParser(description="Build Vedic Math into an output directory with cache stamps.")
    ap.add_argument("--out", help="output directory, emptied first (default: _site/ in the repo)")
    arg = ap.parse_args().out
    out = pathlib.Path(arg).resolve() if arg else ROOT / "_site"
    if out == ROOT or ROOT.is_relative_to(out):
        fail("--out must not be the repo itself")

    src = lambda p: (ROOT / p).read_bytes()
    fhash = lambda p: h(src(p))
    html, sw = (ROOT / "index.html").read_text(), (ROOT / "sw.js").read_text()
    check_source(html, sw)

    files = publishable(out)
    for required in ["index.html", "sw.js", "math.css", "manifest.webmanifest", "js/app.js"]:
        if required not in files:
            fail(f"{required} is missing from the publishable files")
    js = [f for f in files if f.startswith("js/") and f.endswith(".js")]
    versions = {BASE + p: fhash(p) for p in js}

    # Every static import must be a relative or absolute path inside /vedic-math/js/, or a full URL
    # (CDN). A bare specifier would fail without the map, and a path outside the folder would not be pinned.
    import_re = re.compile(r"""(?:^|[;\n}])\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|(?:^|[;\n}])\s*import\s*['"]([^'"]+)['"]""")
    for p in js:
        for m in import_re.finditer(src(p).decode()):
            spec = m.group(1) or m.group(2)
            if re.match(r"https?://", spec):
                continue
            if not spec.startswith(("./", "../", "/")):
                fail(f"{p}: bare import '{spec}' is not covered by the import map")
            resolved = posixpath.normpath(spec if spec.startswith("/") else posixpath.join(posixpath.dirname(BASE + p), spec))
            if resolved not in versions:
                fail(f"{p}: import '{spec}' resolves to {resolved}, outside the versioned /vedic-math/js/ modules")

    # ---------- index.html: import map and stamps ----------
    imports = {u: f"{u}?v={v}" for u, v in versions.items()}
    map_block = MAP_START + '\n<script type="importmap">\n' + json.dumps({"imports": imports}, indent=1) + "\n</script>\n" + MAP_END + "\n"
    entry = re.search(r'<script type="module" src="/vedic-math/js/app\.js"></script>', html)
    if not entry:
        fail("index.html: module entry script not found")
    html = html[:entry.start()] + map_block + html[entry.start():]
    own = {BASE + "js/app.js": versions[BASE + "js/app.js"], BASE + "math.css": fhash("math.css")}
    for url, v in own.items():
        html, n = re.subn(r'((?:src|href)=")' + re.escape(url) + '"', rf'\g<1>{url}?v={v}"', html)
        if not n:
            fail(f"index.html: no reference to {url}")
    for url in SHARED:
        if not re.search(r'(?:src|href)="' + re.escape(url) + '"', html):
            fail(f"index.html: no reference to {url}")

    # ---------- sw.js: precache list and VERSION ----------
    own_files = {BASE: "index.html", f"{BASE}math.css?v={own[BASE + 'math.css']}": "math.css", BASE + "manifest.webmanifest": "manifest.webmanifest"}
    own_files.update({imports[BASE + p]: p for p in js})
    refs = set(re.findall(r'(?:src|href)="(/[^"]*)"', html)) | set(re.findall(r'url\((/[^)]+)\)', html))
    manifest = json.loads(src("manifest.webmanifest"))
    refs |= {posixpath.join(BASE, i["src"]) for i in manifest.get("icons", [])}
    shared = sorted(u for u in refs if u != "/" and not u.startswith(BASE))
    missing = sorted(u for u in refs if u.startswith(BASE) and u not in own_files)
    if missing:
        fail(f"index.html: {', '.join(missing)} would not be saved for offline use; add it to own_files in build.py")
    shell_hash = h(html.encode())
    precache = [[u, shell_hash if f == "index.html" else fhash(f)] for u, f in own_files.items()] + [[u, None] for u in shared]
    listing = "[\n" + ",\n".join(" " + json.dumps(e) for e in precache) + "\n]"
    block = re.compile(re.escape(SW_START) + r".*?" + re.escape(SW_END), re.S)
    sw_version = h((listing + block.sub(SW_START + SW_END, sw)).encode())
    sw = block.sub(lambda m: f"{SW_START}\nconst VERSION = '{sw_version}';\nconst PRECACHE = {listing};\n{SW_END}", sw)

    # ---------- write the output ----------
    if out.exists():
        if any(out.iterdir()) and not (out / ".nojekyll").exists():
            fail(f"{out} is not empty and is not an earlier build (no .nojekyll); refusing to delete it")
        shutil.rmtree(out)
    for f in files:
        (out / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / f, out / f)
    (out / "index.html").write_text(html)
    (out / "sw.js").write_text(sw)
    (out / ".nojekyll").write_bytes(b"")

    rel = out.relative_to(ROOT) if out.is_relative_to(ROOT) else out
    print(f"{rel}/: {len(files)} files, {len(imports)} modules pinned, app.js v={own[BASE + 'js/app.js']}, "
          f"math.css v={own[BASE + 'math.css']}, sw.js VERSION={sw_version} ({len(own_files)} own + {len(shared)} shared files precached)")


if __name__ == "__main__":
    main()
