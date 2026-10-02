"""Confirm the authenticmarketing.xyz download serves a GitHub Release, then write version.json.

    python3 site_release.py poll --tag v1.4.3 [--timeout-min 60] [--sums-file SHA256SUMS]
    python3 site_release.py version-json --tag v1.4.3 --out ../version.json

poll passes only when, on the plain URL and a cache-busted URL, both files answer 200 with the
release's checksums, the HTML is served as an attachment with nosniff, and the HTML's PAGE
version equals the tag. A bot challenge from the host counts as unknown, never as a pass.
version-json reads the page and library versions from the released HTML, never from a working
tree, and refuses to move version.json backwards.
"""

import argparse
import datetime
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request

REPO = "Authentic-Marketing/redactor-ux-for-logtotal-sanitizer"
SITE = "https://authenticmarketing.xyz/wp-content/uploads/2026/09"
HTML, ZIP, SUMS = "redactor-ux.html", "logtotal-sanitizer-web-app.zip", "SHA256SUMS"
TAG_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
UA = "redactor-release-check/1 (+https://github.com/" + REPO + ")"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.headers, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read() if e.fp else b""
    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        return 0, {}, str(e).encode()


def release_asset(tag, name):
    code, _, body = get(f"https://github.com/{REPO}/releases/download/{tag}/{name}")
    if code != 200:
        sys.exit(f"release {tag} has no {name} (HTTP {code})")
    return body


def parse_sums(text):
    found = {}
    for line in text.splitlines():
        m = re.match(r"^([0-9a-f]{64})\s+\*?(\S+)$", line.strip())
        if m and m.group(2) in (HTML, ZIP):
            if m.group(2) in found:
                sys.exit(f"duplicate line for {m.group(2)}")
            found[m.group(2)] = m.group(1)
    if set(found) != {HTML, ZIP}:
        sys.exit(f"{SUMS} must hold exactly one line for {HTML} and one for {ZIP}")
    return found


def page_version(html):
    m = re.search(r"const PAGE = \{ version: '([0-9.]+)' \};", html.decode("utf-8", "replace"))
    return m.group(1) if m else None


def check_once(tag, want):
    """Return (state, detail): state is 'pass', 'fail' or 'unknown'."""
    for name, h in want.items():
        for url in (f"{SITE}/{name}", f"{SITE}/{name}?release-check={int(time.time())}"):
            code, headers, body = get(url)
            if b"sgcaptcha" in body[:4096].lower() or code in (0, 202, 429, 503):
                return "unknown", f"{url} answered {code} (challenge or network)"
            if code != 200:
                return "fail", f"{url} answered {code}"
            if hashlib.sha256(body).hexdigest() != h:
                return "fail", f"{url} hash differs from the release"
            if name == HTML:
                if "attachment" not in headers.get("Content-Disposition", ""):
                    return "fail", f"{url} is not served as an attachment"
                if headers.get("X-Content-Type-Options", "").lower() != "nosniff":
                    return "fail", f"{url} lacks nosniff"
                if page_version(body) != tag[1:]:
                    return "fail", f"{url} reports page {page_version(body)}, not {tag[1:]}"
    return "pass", "both files match on the plain and cache-busted URLs"


def poll(args):
    want = parse_sums((open(args.sums_file, "rb").read() if args.sums_file else release_asset(args.tag, SUMS)).decode())
    deadline = time.time() + args.timeout_min * 60
    while True:
        state, detail = check_once(args.tag, want)
        print(f"{datetime.datetime.now(datetime.timezone.utc):%H:%M:%S} {state}: {detail}", flush=True)
        if state == "pass":
            return 0
        if time.time() >= deadline:
            print(f"site did not serve {args.tag} within {args.timeout_min} minutes")
            return 1
        time.sleep(args.interval)


def version_json(args):
    html = release_asset(args.tag, HTML)
    text = html.decode("utf-8", "replace")
    page = page_version(html)
    lib = re.search(r"const LIB = \{ name: '([^']+)', version: '([^']+)'", text)
    if page != args.tag[1:] or not lib:
        sys.exit(f"released HTML reports page {page}, expected {args.tag[1:]}, or lacks LIB")
    try:
        current = json.load(open(args.out))["web_app"]["version"]
    except (FileNotFoundError, KeyError, ValueError):
        current = "0.0.0"
    if tuple(int(x) for x in current.split(".")) >= tuple(int(x) for x in page.split(".")):
        print(f"version.json already at {current}; nothing to do")
        return 0
    manifest = {
        "schema": 1,
        "web_app": {"version": page, "download_url": f"{SITE}/{HTML}"},
        "library": {"name": lib.group(1), "version": lib.group(2)},
        "generated": datetime.date.today().isoformat(),
    }
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(json.dumps(manifest, indent=2) + "\n")
    print("written", args.out, json.dumps(manifest))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["poll", "version-json"])
    ap.add_argument("--tag", required=True)
    ap.add_argument("--timeout-min", type=int, default=60)
    ap.add_argument("--interval", type=int, default=60)
    ap.add_argument("--sums-file")
    ap.add_argument("--out", default="version.json")
    args = ap.parse_args()
    if not TAG_RE.match(args.tag):
        sys.exit(f"tag {args.tag!r} is not vX.Y.Z")
    return poll(args) if args.command == "poll" else version_json(args)


if __name__ == "__main__":
    sys.exit(main())
