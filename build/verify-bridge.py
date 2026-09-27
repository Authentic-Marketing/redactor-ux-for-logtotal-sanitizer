import base64, json, os, re, signal, subprocess, sys, tempfile, time, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
import pathlib

PAGE_PATH = str(pathlib.Path(__file__).resolve().parent.parent / "index.html")
PAGE = "file://" + PAGE_PATH
HERE = os.path.dirname(os.path.abspath(__file__))
# The library version the bridge reports is whatever is installed beside it.
with open(os.path.join(HERE, "bridge", "node_modules", "@socprime", "logtotal-sanitizer", "package.json"), encoding="utf-8") as f:
    BRIDGE_LIB = json.load(f)["version"]
OUT = os.path.join(HERE, "shots")
os.makedirs(OUT, exist_ok=True)
# Expected bundled version comes from the build source, never from the page under test, so this
# stays true across a library bump and still fails when a page is built from stale parts.
_lib = re.search(
    r"const LIB = \{ name: '[^']+', version: '([^']+)', published: '([^']+)' \};",
    open(os.path.join(HERE, "ui", "app-1.js"), encoding="utf-8").read(),
)
assert _lib, "LIB constant not found in ui/app-1.js"
EXPECT_LIB = _lib.group(1) + ", " + _lib.group(2)
BRIDGE_SRC = open(
    os.path.join(HERE, "bridge", "sanitizer-bridge.mjs"), encoding="utf-8"
).read()
UPDATE_SRC = open(
    os.path.join(HERE, "bridge", "update-page.mjs"), encoding="utf-8"
).read()
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


def configure(page):
    """Reach the engine and rule controls: switch to the configure destination, then open
    the collapsed sections. Ruling 14 moved these into a rail hidden on the other two
    destinations and ruling 16 collapsed the Engine section, so a click needs both."""
    view(page, "configure")
    page.evaluate("document.querySelectorAll('details.sec').forEach(d => d.open = true)")
    page.wait_for_timeout(100)


def healthy():
    try:
        return json.load(
            urllib.request.urlopen("http://127.0.0.1:7412/health", timeout=0.5)
        )
    except Exception:
        return None


def wait_health(seconds):
    for _ in range(int(seconds * 4)):
        h = healthy()
        if h:
            return h
        time.sleep(0.25)
    return None


def start_bridge():
    p = subprocess.Popen(
        ["node", "sanitizer-bridge.mjs", "7412"],
        cwd=os.path.join(HERE, "bridge"),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    assert wait_health(10), "bridge did not start"
    return p


def stop(p):
    try:
        os.killpg(os.getpgid(p.pid), signal.SIGTERM)
    except Exception:
        pass
    p.wait(timeout=10)
    for _ in range(20):
        if not healthy():
            return
        time.sleep(0.25)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(
        viewport={"width": 1440, "height": 900},
        color_scheme="dark",
        accept_downloads=True,
    )
    page = ctx.new_page()
    errors = []
    page.on(
        "console",
        lambda m: (
            errors.append(m.text)
            if m.type == "error" and "ERR_CONNECTION_REFUSED" not in m.text
            else None
        ),
    )
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(PAGE)
    page.wait_for_selector("#stats:not([hidden])")
    html = page.content()
    check(
        "old descriptions removed",
        "nothing to install" not in html
        and "loopback bridge on this machine" not in html
        and "Needs Node.js" not in html,
    )
    check(
        "no engine chips",
        page.locator("#engineChip").count() == 0
        and page.locator("#resultEngine").count() == 0,
    )
    check(
        "bundled version line",
        page.text_content("#bundledVersion") == EXPECT_LIB,
        page.text_content("#bundledVersion"),
    )
    check(
        "badge counts external requests only",
        page.text_content("#badgeNet strong") == "0",
    )
    configure(page)
    page.click("#checkUpdate")
    page.wait_for_function(
        "document.querySelector('#updateStatus').textContent !== 'Checking'",
        timeout=20000,
    )
    st = page.text_content("#updateStatus")
    check(
        "update check answers",
        st in ("Up to date", "npm unreachable") or st.endswith(" available"),
        st,
    )
    check(
        "update command names this page",
        page.evaluate("window.LogTotalSanitizerUi.updateCmd()")
        == 'node update-page.mjs "' + PAGE_PATH + '"',
    )
    view(page, "sanitize")
    with page.expect_download() as dl:
        page.click("#exportBtn")
        page.click('[data-export="update"]')
    check(
        "exported update script byte-identical",
        open(dl.value.path(), encoding="utf-8").read() == UPDATE_SRC,
    )
    configure(page)
    page.screenshot(path=OUT + "/12-engine-update.png")
    page.click('label.radio:has(input[value="local"])')
    page.wait_for_timeout(3300)
    check(
        "status reads not detected",
        page.text_content("#bridgeStatus") == "Not detected",
        page.text_content("#bridgeStatus"),
    )
    check(
        "two command lines shown",
        not page.is_hidden("#bridgeSetup")
        and page.locator("#bridgeSetup .cmdrow").count() == 2
        and page.text_content("#startCmd") == "node sanitizer-bridge.mjs",
    )
    check(
        "install line present",
        "npm install @socprime/logtotal-sanitizer" in page.text_content("#bridgeSetup"),
    )
    check("panel prose gone", page.locator("#localPanel p:not(.status)").count() == 0)
    page.screenshot(path=OUT + "/10-engine-not-detected.png")
    with page.expect_download() as dl:
        page.click("#bridgeDownload")
    check(
        "downloaded bridge script byte-identical",
        open(dl.value.path(), encoding="utf-8").read() == BRIDGE_SRC,
    )
    bp = start_bridge()
    page.wait_for_function(
        "document.querySelector('#bridgeStatus').textContent.startsWith('Connected')",
        timeout=15000,
    )
    check(
        "auto-connected without pressing Connect",
        page.text_content("#bridgeStatus").startswith("Connected " + BRIDGE_LIB + ", Node v"),
        page.text_content("#bridgeStatus"),
    )
    check(
        "badge reads runs on this machine",
        "Runs on this machine" in page.text_content(".local")
        and "127.0.0.1:7412" in page.text_content(".local"),
    )
    check("setup hidden once connected", page.is_hidden("#bridgeSetup"))
    page.wait_for_function(
        "document.querySelector('#stMatches').textContent === '43'", timeout=8000
    )
    # Ruling 14 removed the Add custom rule button from every view and left the editor
    # open on load, so the fields are filled directly with no button to click first.
    configure(page)
    page.fill("#rf-id", "acme_ticket")
    page.fill("#rf-token", "TICKET")
    page.fill("#rf-patterns", r"\bCASE-\d{6}\b")
    page.click("#rf-save")
    page.wait_for_timeout(300)
    view(page, "sanitize")
    page.fill("#inputText", page.input_value("#inputText") + "\nopened CASE-123456")
    page.wait_for_timeout(900)
    check(
        "custom rule runs through the bridge",
        "<TICKET:" in page.text_content("#paneAfter")
        and page.text_content("#stMatches") == "44",
    )
    page.screenshot(path=OUT + "/11-engine-connected.png")
    view(page, "integrate")
    page.click('#integrateCard [data-int="bridge"]')
    check(
        "local bridge tab shows the script",
        "createServer" in page.text_content("#intCode"),
    )
    stop(bp)
    view(page, "sanitize")
    page.click("#runBtn")
    page.wait_for_timeout(1500)
    check(
        "bridge loss falls back with a short message",
        page.text_content("#cfgErr").endswith(
            "Bridge not answering. Result from the bundled copy."
        )
        and page.text_content("#stMatches") == "44",
    )
    # is_hidden is a visibility question, and the setup panel lives in the configure rail,
    # so this has to be asked on the destination that shows it.
    configure(page)
    check(
        "status reads stopped and commands return",
        page.text_content("#bridgeStatus") == "Stopped"
        and not page.is_hidden("#bridgeSetup"),
    )
    bp = start_bridge()
    page.wait_for_function(
        "document.querySelector('#bridgeStatus').textContent.startsWith('Connected')",
        timeout=15000,
    )
    check("reconnects on its own after a restart", True)

    # The allowlist and the rate cap, tested against the server directly so the result
    # does not depend on what a browser chooses to show. A second bridge on its own port,
    # so the burst below cannot spend the rate budget of the one the page is using.
    alt = subprocess.Popen(
        ["node", "sanitizer-bridge.mjs", "7413"],
        cwd=os.path.join(HERE, "bridge"),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    time.sleep(1.5)

    def ask(origin=None, path="/health"):
        rq = urllib.request.Request("http://127.0.0.1:7413" + path)
        if origin is not None:
            rq.add_header("Origin", origin)
        try:
            with urllib.request.urlopen(rq, timeout=3) as r:
                return r.status, dict(r.headers)
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers)

    st, hd = ask("null")
    check(
        "a page opened from disk is allowed",
        st == 200 and hd.get("Access-Control-Allow-Origin") == "null",
        st,
    )
    st, hd = ask("https://authentic-marketing.github.io")
    check(
        "the published page origin is allowed",
        st == 200
        and hd.get("Access-Control-Allow-Origin")
        == "https://authentic-marketing.github.io",
        st,
    )
    st, hd = ask("https://socprime.github.io")
    check("an origin we do not control is refused", st != 200, st)
    st, hd = ask("https://authenticmarketing.xyz")
    check("the tools page origin is allowed", st == 200, st)
    st, hd = ask("https://evil.example")
    check("an unknown origin is refused", st == 403, st)
    check(
        "a refused origin gets no CORS header, so it cannot even see the bridge",
        "Access-Control-Allow-Origin" not in hd,
        sorted(hd),
    )
    st, hd = ask("https://github.com")
    check("github.com is not an allowed origin", st == 403, st)
    st, _ = ask(None)
    check("a local tool with no origin still works", st == 200, st)
    codes = [ask("null")[0] for _ in range(40)]
    check("a burst past the cap is refused with 429", 429 in codes, codes.count(429))
    time.sleep(1.1)
    check("the cap clears after a second", ask("null")[0] == 200)
    stop(alt)
    stop(bp)
    offhost = []
    page.on(
        "request", lambda r: offhost.append(r.url) if "evil.example" in r.url else None
    )
    configure(page)
    page.fill("#bridgeUrl", "http://evil.example:7412")
    page.dispatch_event("#bridgeUrl", "change")
    page.wait_for_timeout(400)
    check(
        "a non-loopback bridge address is refused in the panel",
        page.text_content("#bridgeStatus").startswith("Address refused"),
    )
    page.click("#bridgeConnect")
    page.wait_for_timeout(600)
    view(page, "sanitize")
    page.click("#runBtn")
    page.wait_for_timeout(1200)
    check(
        "no request and no key reach a non-loopback address", not offhost, offhost[:3]
    )
    check(
        "sanitizing still works, from the bundled copy",
        page.text_content("#stMatches") == "44",
    )
    configure(page)
    page.fill("#bridgeUrl", "http://127.0.0.1:7412")
    page.dispatch_event("#bridgeUrl", "change")
    page.wait_for_timeout(300)
    check(
        "a loopback address is accepted again",
        not page.text_content("#bridgeStatus").startswith("Address refused"),
    )
    page.click('label.radio:has(input[value="bundled"])')
    page.wait_for_timeout(300)
    check(
        "back to bundled hides the panel",
        page.is_hidden("#localPanel")
        and "External requests" in page.text_content(".local"),
    )
    check("no console errors", not errors, errors[:3])
    b.close()
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)} of {len(results)} bridge checks passed")
sys.exit(1 if fails else 0)
