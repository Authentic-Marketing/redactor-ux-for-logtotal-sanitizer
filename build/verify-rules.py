"""Proves what the seeded crypto and LLM APIs rules match, in the engine the page ships and in the
page's own default rule order, and proves a returning reader's work survives a seed change.
Fixtures live in build/fixtures/; a missing or short fixture file is a FAIL, never a skip.
Added 2026-09-23 with the rules expansion; redleg-rules.py proves each leg can fail."""

import json, os, pathlib, sys, time
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
PAGE = (
    pathlib.Path(os.environ.get("SANITIZER_PAGE") or HERE.parent / "index.html")
    .resolve()
    .as_uri()
)
FX = HERE / "fixtures"
results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + (": " + str(detail) if detail else ""))


def load(name):
    p = FX / name
    return json.loads(p.read_text()) if p.exists() else None


crypto = load("crypto-vectors.json")
api = load("api-vectors.json")
neg = load("negatives.json")
old = load("seeds-2d7e6ee.json")
check(
    "crypto fixtures present, 163 vectors",
    crypto is not None and len(crypto) == 163,
    crypto and len(crypto),
)
check(
    "api fixtures present, 8 keys and 5 lookalikes",
    api is not None and len(api["must_match"]) == 8 and len(api["must_not_match"]) == 5,
)
check("negative corpus present, 15 lines", neg is not None and len(neg["lines"]) == 15)
check(
    "pre-expansion seeds present",
    old is not None
    and {r["id"] for r in old["rules"]} == {"agent_apis", "crypto_addresses"},
)
if not (crypto and api and neg and old):
    print("\nfixtures missing: HOLD")
    sys.exit(1)

# One rule alone, in the shipped engine: counts matches so a rule-level miss cannot hide
# behind a builtin that happens to catch the same value.
ALONE = """([id, values]) => { const L = window.LogTotalSanitizer; const d = window.LogTotalSanitizerUi.seededRule(id);
  const s = L.createSanitizer({ rules: [L.defineRule(d)], report: { previewBytes: 0 } });
  return values.map((v) => { const r = s.sanitizeText('value ' + v + ' end'); return [v, r.report.totalMatches, r.output.includes(v)]; }); }"""
AS_PAGE = """(values) => values.map((v) => { const o = window.LogTotalSanitizerUi.sanitizeAsPage('value ' + v + ' end'); return [v, o.includes(v)]; })"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context()
    page = ctx.new_page()
    errors = []
    reqs = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "request",
        lambda r: reqs.append(r.url) if not r.url.startswith("file://") else None,
    )
    page.goto(PAGE)
    page.wait_for_selector("#stats:not([hidden])", timeout=10000)

    compiled = page.evaluate(
        """() => window.LogTotalSanitizerUi.seededIds().map((id) => { try { window.LogTotalSanitizer.defineRule(window.LogTotalSanitizerUi.seededRule(id)); return [id, true]; } catch (e) { return [id, String(e.message)]; } })"""
    )
    check(
        "every seeded rule compiles in the shipped engine",
        all(ok is True for _, ok in compiled),
        compiled,
    )

    vals = [f["value"] for f in crypto]
    alone = page.evaluate(ALONE, ["crypto_addresses", vals])
    missed = [
        f["family"] + " " + v[:24]
        for f, (v, n, left) in zip(crypto, alone)
        if n == 0 or left
    ]
    check(
        "the crypto rule alone redacts all 163 upstream vectors",
        not missed,
        "%d missed %s" % (len(missed), missed[:4]),
    )
    leaked = [v[:24] for v, left in page.evaluate(AS_PAGE, vals) if left]
    check(
        "no crypto vector survives the page in its default order",
        not leaked,
        leaked[:4],
    )

    keys = [k["value"] for k in api["must_match"]]
    alone = page.evaluate(ALONE, ["agent_apis", keys])
    missed = [
        k["vendor"]
        for k, (v, n, left) in zip(api["must_match"], alone)
        if n == 0 or left
    ]
    check("the LLM APIs rule alone masks every vendor key", not missed, missed)
    leaked = [v[:14] for v, left in page.evaluate(AS_PAGE, keys) if left]
    check("no vendor key survives the page in its default order", not leaked, leaked)
    fired = [
        v
        for v, n, _ in page.evaluate(ALONE, ["agent_apis", api["must_not_match"]])
        if n
    ]
    check("the LLM APIs rule leaves key lookalikes alone", not fired, fired)

    for rid in ("crypto_addresses", "agent_apis"):
        fired = [v[:40] for v, n, _ in page.evaluate(ALONE, [rid, neg["lines"]]) if n]
        check("%s fires on none of the SOC negative lines" % rid, not fired, fired)

    # Linear-time tripwire on the two seeded rules, which this page owns. The ENS pattern as
    # first drafted took 11.6 s on this input. The 1000 ms threshold was proposed by the author
    # and ratified by JJ on 2026-09-23.
    ADV = "'a.'.repeat(50000) + ' x-'.repeat(20000) + ' ' + '1aB'.repeat(30000)"
    t = time.time()
    page.evaluate(
        "() => { const L = window.LogTotalSanitizer, U = window.LogTotalSanitizerUi;"
        " L.createSanitizer({ rules: U.seededIds().map((i) => L.defineRule(U.seededRule(i))), report: { previewBytes: 0 } })"
        ".sanitizeText(" + ADV + "); }"
    )
    ms = int((time.time() - t) * 1000)
    check(
        "a 250 KB adversarial line clears the seeded rules in under 1000 ms",
        ms < 1000,
        "%d ms" % ms,
    )
    # Report only, never asserted: the same line through the whole page. The library's own users
    # and secrets builtins take tens of seconds here (measured 2026-09-23, before and after this
    # change alike); that is an upstream finding, not something the seeded rules can fix.
    t = time.time()
    page.evaluate("() => window.LogTotalSanitizerUi.sanitizeAsPage(" + ADV + ")")
    print(
        "INFO the same line through the whole page: %d ms"
        % int((time.time() - t) * 1000)
    )

    # Returning reader: a configuration saved by the pre-expansion build, carrying the reader's
    # own work. The shipped seeds must refresh and every piece of the reader's work must survive.
    stale = {r["id"]: r for r in old["rules"]}
    edited = dict(
        stale["agent_apis"],
        patterns=stale["agent_apis"]["patterns"] + ["\\bMYCORP-KEY-[0-9]{8}\\b"],
    )
    cfg = {
        "logtotalSanitizerUi": 1,
        "seedVersion": "pre-expansion",
        "customRules": [
            stale["crypto_addresses"],
            edited,
            {
                "id": "crypto_mine",
                "label": "Mine",
                "description": "x",
                "mode": "pseudo",
                "token": "MINE",
                "patterns": ["\\bMINE-[0-9]{4}\\b"],
            },
            {
                "id": "llm_api_keys",
                "label": "Form example",
                "description": "x",
                "mode": "mask",
                "patterns": ["\\bllmkey_[a-z]{8}\\b"],
            },
            {
                "id": "crypto_bitcoin",
                "label": "Bitcoin, edited",
                "description": "x",
                "mode": "pseudo",
                "token": "BTC",
                "patterns": ["\\bBTCX[0-9]{6}\\b"],
            },
        ],
        "rules": [
            {"id": "crypto_addresses", "enabled": False, "kind": "custom"},
            {"id": "agent_apis", "enabled": True, "kind": "custom"},
            {"id": "crypto_mine", "enabled": True, "kind": "custom"},
            {"id": "llm_api_keys", "enabled": True, "kind": "custom"},
            {"id": "crypto_bitcoin", "enabled": True, "kind": "custom"},
        ],
    }
    page.evaluate(
        "(c) => localStorage.setItem('logtotal-sanitizer-ui.v1', JSON.stringify(c))",
        cfg,
    )
    page.reload()
    page.wait_for_selector("#stats:not([hidden])", timeout=10000)
    page.wait_for_timeout(300)
    rows = {r["id"]: r for r in page.evaluate("window.LogTotalSanitizerUi.ruleIds()")}
    shipped = {
        i: page.evaluate(
            "(i) => window.LogTotalSanitizerUi.seedHash(window.LogTotalSanitizerUi.seededRule(i))",
            i,
        )
        for i in ("crypto_addresses", "agent_apis")
    }
    check(
        "both seeds refresh to the shipped definitions",
        all(rows.get(i, {}).get("hash") == h for i, h in shipped.items()),
        {i: rows.get(i, {}).get("hash") for i in shipped},
    )
    check(
        "the reader's switch-off of a seed survives",
        rows.get("crypto_addresses", {}).get("enabled") is False,
        rows.get("crypto_addresses"),
    )
    check(
        "an unedited old seed leaves no copy behind",
        "crypto_addresses_custom" not in rows,
        sorted(rows)[:8],
    )
    check(
        "the reader's edit to a seed is kept, switched off",
        rows.get("agent_apis_custom", {}).get("enabled") is False,
        rows.get("agent_apis_custom"),
    )
    check(
        "the reader's own crypto_ and llm_ rules survive",
        "crypto_mine" in rows and "llm_api_keys" in rows,
        sorted(rows)[:8],
    )
    check(
        "a retired seed goes, an edited retired seed is kept as a copy",
        "crypto_bitcoin" not in rows
        and rows.get("crypto_bitcoin_custom", {}).get("enabled") is False,
        sorted(rows)[:8],
    )

    # Import: an export from the pre-expansion build must not pin the old seeds.
    page.evaluate("() => localStorage.clear()")
    page.reload()
    page.wait_for_selector("#stats:not([hidden])", timeout=10000)
    exp = {
        "logtotalSanitizerUi": 1,
        "customRules": old["rules"],
        "rules": [
            {"id": "crypto_addresses", "enabled": True, "kind": "custom"},
            {"id": "agent_apis", "enabled": True, "kind": "custom"},
        ],
    }
    page.set_input_files(
        "#importFile",
        {
            "name": "sanitizer-config.json",
            "mimeType": "application/json",
            "buffer": json.dumps(exp).encode(),
        },
    )
    page.wait_for_timeout(600)
    rows = {r["id"]: r for r in page.evaluate("window.LogTotalSanitizerUi.ruleIds()")}
    check(
        "importing a pre-expansion export still yields the shipped seeds",
        all(rows.get(i, {}).get("hash") == h for i, h in shipped.items()),
        {i: rows.get(i, {}).get("hash") for i in shipped},
    )

    check("no page errors", not errors, errors[:3])
    check("no non-file network requests", not reqs, reqs[:3])
    b.close()
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)} of {len(results)} checks passed")
sys.exit(1 if fails else 0)
