"""Checks for the optional check-on-open. Never touches the live network: the version URL is
served by page.route() in every case, and a case that expects no request fails if the route is
called at all. Run from this directory with the project's Playwright interpreter."""

import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
import os

# The red-leg runner points this at a deliberately broken copy. The page itself has no hook.
PAGE_FILE = pathlib.Path(os.environ.get("SANITIZER_PAGE", str(HERE.parent / "index.html")))
URL = "https://raw.githubusercontent.com/Authentic-Marketing/logtotal-sanitizer-ui/main/version.json"
DAY = 86400000
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (": " + str(detail) if detail else ""))


def view(page, name):
    """Switch destination. Ported 2026-09-22 from the page verifier: under ruling 14 the
    configure controls live in a rail that is hidden on the sanitize and integrate views,
    and the page opens on sanitize, so a click on a rail control times out unless the
    destination is switched first."""
    page.click('.viewtabs [data-view="%s"]' % name)
    page.wait_for_timeout(150)
    assert page.evaluate("document.body.dataset.view") == name, (
        "destination %s did not apply" % name
    )


def manifest(page="1.1.0", lib="0.2.0-beta.2", url="https://example.test/app.zip", schema=1):
    return json.dumps({
        "schema": schema,
        "web_app": {"version": page, "download_url": url},
        "library": {"name": "@socprime/logtotal-sanitizer", "version": lib},
        "generated": "2026-09-21",
    })


def load(browser, auto=None, last=None, storage=True, serve=None, wait=6000):
    seen = []
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    seed = []
    if not storage:
        seed.append(
            "const t = () => { throw new Error('denied'); };"
            "Object.defineProperty(window, 'localStorage',"
            " { get: () => ({ getItem: t, setItem: t, removeItem: t }) });"
        )
    else:
        if auto is not None:
            seed.append("localStorage.setItem('logtotal-sanitizer-ui.v1.autoCheck', %s);" % json.dumps(auto))
        if last is not None:
            seed.append("localStorage.setItem('logtotal-sanitizer-ui.v1.lastCheck', String(%s));" % last)
    if seed:
        ctx.add_init_script("try {" + "".join(seed) + "} catch (e) {}")

    def handler(route, request):
        seen.append({"method": request.method, "url": request.url, "body": len(request.post_data or "")})
        if serve == "hang":
            return
        s = serve or {}
        route.fulfill(status=s.get("status", 200), content_type=s.get("type", "application/json"),
                      body=s.get("body", manifest()))

    ctx.route(URL, handler)
    page = ctx.new_page()
    errors = []
    # A failed HTTP status makes Chromium itself log "Failed to load resource". No page can
    # suppress that, so it is not counted as a page error. An uncaught exception always is.
    page.on("console", lambda m: errors.append(m.text)
            if m.type == "error" and "Failed to load resource" not in m.text else None)
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.goto(PAGE_FILE.as_uri())
    page.wait_for_selector("#stats:not([hidden])", timeout=10000)
    try:
        page.wait_for_function("document.body.dataset.openCheck !== undefined", timeout=wait)
    except Exception:
        pass
    return page, ctx, seen, errors


def comparator(b):
    p, c, _, _ = load(b, auto="0")

    def cmp(x, y):
        return p.evaluate("window.LogTotalSanitizerUi.cmpVer(%s, %s)" % (json.dumps(x), json.dumps(y)))

    cases = [("0.2.0-beta.10", "0.2.0-beta.9", 1), ("0.2.0-beta.9", "0.2.0-beta.10", -1),
             ("0.2.0", "0.2.0-beta.9", 1), ("0.2.0-beta.2", "0.2.0-beta.2", 0),
             ("1.10.0", "1.9.0", 1), ("2.0.0", "1.1.0", 1), ("1.1.0", "2.0.0", -1),
             ("garbage", "1.0.0", 0)]
    bad = [(x, y, e, cmp(x, y)) for x, y, e in cases if cmp(x, y) != e]
    check("comparator is semver aware, not string aware", not bad, bad)
    check("the switch is off by default", p.is_checked("#autoCheck") is False)
    view(p, "configure")
    p.click("label:has(#aggressive)")
    p.wait_for_timeout(500)
    cfg = p.evaluate("localStorage.getItem('logtotal-sanitizer-ui.v1')")
    check("the saved and exported config never carries the switch",
          cfg and "autoCheck" not in cfg, (cfg or "")[:50])
    c.close()


def default_off(b):
    p, c, seen, errs = load(b)
    check("first open with no stored choice sends nothing", seen == [], seen)
    check("  and reports off", p.evaluate("document.body.dataset.openCheck") == "off")
    check("  and the badge still reads 0 external requests",
          p.text_content("#badgeNet strong").strip() == "0")
    check("  and raises no console error", not errs, errs[:2])
    c.close()


def opted_in(b):
    p, c, seen, errs = load(b, auto="1")
    check("opted in, exactly one request", len(seen) == 1, seen)
    check("  and it is a GET to the pinned url, no body, no query",
          seen and seen[0] == {"method": "GET", "url": URL, "body": 0}, seen)
    check("  and an equal version raises no notice",
          p.is_hidden("#newPageSetup") and p.is_hidden("#updateSetup"))
    check("  and the timestamp was written",
          p.evaluate("localStorage.getItem('logtotal-sanitizer-ui.v1.lastCheck') !== null"))
    c.close()


PAYLOADS = [
    ("a newer page offers the download",
     {"body": manifest(page="2.0.0", url="https://example.test/new.zip")}, "page"),
    ("a newer library offers the update command", {"body": manifest(lib="0.3.0")}, "lib"),
    ("a prerelease step offers the update command", {"body": manifest(lib="0.2.0-beta.10")}, "lib"),
    ("an older published page offers nothing", {"body": manifest(page="1.0.0")}, "none"),
    ("an older published library offers nothing", {"body": manifest(lib="0.2.0-beta.1")}, "none"),
    ("malformed json offers nothing", {"body": "{not json"}, "none"),
    ("an unknown schema offers nothing", {"body": manifest(schema=99, page="9.9.9")}, "none"),
    ("a non https download url is refused",
     {"body": manifest(page="2.0.0", url="http://example.test/n.zip")}, "none"),
    ("404 offers nothing", {"status": 404, "body": "no"}, "none"),
    ("500 offers nothing", {"status": 500, "body": "no"}, "none"),
]


def one_payload(b, name, serve, expect):
    p, c, _, errs = load(b, auto="1", serve=serve)
    # The offer is presented in the configure rail, hidden on the sanitize view the page
    # opens on. Without this switch every payload reads "none" and the seven cases that
    # expect nothing pass vacuously.
    view(p, "configure")
    # Ruling 16 also collapsed the Engine section, so the offer is inside a closed
    # disclosure even on the right destination. Opened by property rather than by
    # clicking the summary, which would toggle it shut on a second call.
    p.evaluate("document.querySelectorAll('details.sec').forEach(d => d.open = true)")
    got = "page" if p.is_visible("#newPageSetup") else ("lib" if p.is_visible("#updateSetup") else "none")
    ok = got == expect
    if expect == "page" and ok:
        ok = p.get_attribute("#newPageLink", "href") == "https://example.test/new.zip"
    check(name, ok, "showed %s, expected %s" % (got, expect))
    check("  and raises no console error", not errs, errs[:2])
    c.close()


def window_cases(b):
    p, c, seen, _ = load(b, auto="1", last="Date.now() - 1000")
    check("a second open inside the day sends nothing", seen == [], seen)
    check("  and reports throttled", p.evaluate("document.body.dataset.openCheck") == "throttled")
    c.close()
    p, c, seen, _ = load(b, auto="1", last="Date.now() - %d" % (DAY + 60000))
    check("an open after the day has passed sends exactly one request", len(seen) == 1, seen)
    c.close()
    p, c, seen, _ = load(b, auto="1", last="Date.now() + %d" % DAY)
    check("a clock moved backwards fails closed and sends nothing", seen == [], seen)
    c.close()


def hostile_cases(b):
    p, c, seen, errs = load(b, auto="1", storage=False)
    check("storage denied sends nothing and the page still redacts",
          seen == [] and p.text_content("#stMatches").strip() == "43",
          (seen, p.text_content("#stMatches")))
    check("  and raises no console error", not errs, errs[:2])
    c.close()
    p, c, seen, errs = load(b, auto="1", serve="hang", wait=1500)
    check("a hung request never blocks redaction", p.text_content("#stMatches").strip() == "43")
    check("  and shows no notice while it hangs",
          p.is_hidden("#newPageSetup") and p.is_hidden("#updateSetup"))
    check("  and raises no console error", not errs, errs[:2])
    c.close()


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        comparator(b)
        default_off(b)
        opted_in(b)
        for name, serve, expect in PAYLOADS:
            one_payload(b, name, serve, expect)
        window_cases(b)
        hostile_cases(b)
        b.close()
    fails = [r for r in results if not r[1]]
    print("\n%d of %d update-check assertions passed" % (len(results) - len(fails), len(results)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
