"""Proves what the seeded driver's licence and licence plate rules match, in the engine the page
ships and in the page's own default rule order: every format in fixtures/id-formats.json has a
vector, the strict tier catches labelled and printed values with aggressive mode off, the loose
tier catches the bare shapes with it on, neither tier fires on real-shape log lines, and a
returning reader gets both rules at their declared place. A missing or short fixture is a FAIL,
never a skip. Added 2026-09-27; redleg-id-rules.py proves each leg can fail."""

import json, os, pathlib, re, sys, time
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


fmt = load("id-formats.json")
vec = load("id-vectors.json")
neg = load("negatives.json")
check(
    "format record present, 61 jurisdictions",
    fmt is not None and len(fmt["jurisdictions"]) == 61,
    fmt and len(fmt["jurisdictions"]),
)
check(
    "vectors present, 110 licences, 86 plate shapes, 11 label-only plates, 62 and 31 negatives",
    vec is not None
    and len(vec["license"]["labelled"]) == 110
    and len(vec["plate"]["shapes"]) == 86
    and len(vec["plate"]["label_only"]) == 11
    and len(vec["negatives_strict"]) == 62
    and len(vec["negatives_loose"]) == 31,
)
if not (fmt and vec and neg):
    print("\nfixtures missing: HOLD")
    sys.exit(1)

juris = set(fmt["jurisdictions"])
lic_j = {v["j"] for v in vec["license"]["labelled"]}
pl_j = {v["j"] for v in vec["plate"]["shapes"] + vec["plate"]["label_only"]}
check(
    "every jurisdiction has a licence vector and a plate vector",
    juris <= lic_j and juris <= pl_j,
    sorted((juris - lic_j) | (juris - pl_j)),
)

# One rule alone, in the shipped engine, with the tier chosen by the aggressive flag. Counting
# matches keeps a rule-level miss from hiding behind a builtin that catches the same value.
ALONE = """([id, aggressive, lines]) => { const L = window.LogTotalSanitizer; const d = window.LogTotalSanitizerUi.seededRule(id);
  const s = L.createSanitizer({ rules: [L.defineRule(d)], aggressive, report: { previewBytes: 0 } });
  return lines.map(([line, v]) => { const r = s.sanitizeText(line); return [line, r.report.totalMatches, v ? r.output.includes(v) : false]; }); }"""
AS_PAGE = """(pairs) => pairs.map(([line, v]) => { const o = window.LogTotalSanitizerUi.sanitizeAsPage(line); return [line, o.includes(v)]; })"""


def labelled(values, labels):
    return [
        ["evt " + t.replace("{v}", v) + " ok", v] for v in values for t in labels
    ]


# A short label (DL, tag, LPR) takes only an ID-shaped value, so it is tested only with those.
def id_shaped(v):
    return bool(re.match(r"^(?:[A-Za-z]{0,3}\d{5}|[A-Z][A-Z*]{4,6}\d{3}|[A-Z]\d{3}[- ]|[A-Z]-\d{3})", v)) and not re.match(r"^(?:19|20)\d\d$", v)


def plate_shaped(v):
    return bool(re.search(r"[A-Z]", v) and re.search(r"\d", v) and re.match(r"^[A-Z0-9 .\u00b7-]+$", v) and len(re.sub(r"[ .\u00b7-]", "", v)) >= 4)


# The loose tier reads plates as they are stored, without the printed space or hyphen, except
# the county-coded plates whose hyphen is part of the number.
def compact(v):
    return v if re.match(r"^\d{1,2}[A-Z]?-", v) else re.sub(r"[ .-]", "", v)


def missed(page, rid, aggressive, pairs):
    return [
        line
        for line, n, left in page.evaluate(ALONE, [rid, aggressive, pairs])
        if n == 0 or left
    ]


def fired(page, rid, aggressive, lines):
    return [
        line[:60]
        for line, n, _ in page.evaluate(ALONE, [rid, aggressive, [[l, ""] for l in lines]])
        if n
    ]


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

    ids = page.evaluate("window.LogTotalSanitizerUi.seededIds()")
    check(
        "both rules ship as seeds",
        "drivers_license" in ids and "license_plates" in ids,
        ids,
    )
    compiled = page.evaluate(
        """() => ['drivers_license', 'license_plates'].map((id) => { try { window.LogTotalSanitizer.defineRule(window.LogTotalSanitizerUi.seededRule(id)); return [id, true]; } catch (e) { return [id, String(e.message)]; } })"""
    )
    check(
        "both rules compile in the shipped engine",
        all(ok is True for _, ok in compiled),
        compiled,
    )

    lic = vec["license"]
    lic_pairs = labelled([v["v"] for v in lic["labelled"]], lic["labels"])
    m = missed(page, "drivers_license", False, lic_pairs)
    check(
        "the strict licence tier catches every labelled licence (%d lines)" % len(lic_pairs),
        not m,
        "%d missed %s" % (len(m), m[:3]),
    )
    short = labelled([v["v"] for v in lic["labelled"] if id_shaped(v["v"])], lic["labels_short"])
    short += labelled([v["v"] for v in lic["labelled"] if re.match(r"^[A-Za-z]{1,3}\d{5}", v["v"])], lic["labels_licence_short"])
    m = missed(page, "drivers_license", False, short)
    check(
        "the strict licence tier catches every ID-shaped licence after a short label (%d lines)" % len(short),
        not m,
        "%d missed %s" % (len(m), m[:3]),
    )
    m = missed(page, "drivers_license", False, [["scan " + v + " ok", v] for v in lic["bare_strict"]])
    check("the strict licence tier catches every printed format bare", not m, m)
    m = missed(page, "drivers_license", True, [["scan " + v + " ok", v] for v in lic["bare_loose"]])
    check("the loose licence tier catches every bare letter-bearing format", not m, m)
    loose_only = [v for v in lic["bare_loose"] if v not in lic["bare_strict"]]
    f = fired(page, "drivers_license", False, ["scan " + v + " ok" for v in loose_only])
    check("the strict licence tier leaves the bare loose-only formats alone", not f, f)

    pl = vec["plate"]
    pl_pairs = labelled([v["v"] for v in pl["shapes"] + pl["label_only"]], pl["labels"])
    m = missed(page, "license_plates", False, pl_pairs)
    check(
        "the strict plate tier catches every labelled plate (%d lines)" % len(pl_pairs),
        not m,
        "%d missed %s" % (len(m), m[:3]),
    )
    short_pl = labelled([v["v"] for v in pl["shapes"] + pl["label_only"] if plate_shaped(v["v"])], pl["labels_short"])
    m = missed(page, "license_plates", False, short_pl)
    check(
        "the strict plate tier catches every letter-and-digit plate after a short label (%d lines)" % len(short_pl),
        not m,
        "%d missed %s" % (len(m), m[:3]),
    )
    shape_pairs = [["seen " + compact(v["v"]) + " at gate 4", compact(v["v"])] for v in pl["shapes"]]
    m = missed(page, "license_plates", True, shape_pairs)
    check("the loose plate tier catches every standard serial shape", not m, m[:4])
    f = fired(page, "license_plates", False, [l for l, _ in shape_pairs])
    check("the strict plate tier leaves bare plate shapes alone", not f, f[:4])
    f = fired(page, "license_plates", True, ["seen " + v["v"] + " at gate 4" for v in pl["label_only"]])
    check("the loose plate tier leaves all-digit and code-like plates to a label", not f, f[:4])

    strict_neg = neg["lines"] + vec["negatives_strict"]
    for rid in ("drivers_license", "license_plates"):
        f = fired(page, rid, False, strict_neg)
        check("%s strict fires on none of the SOC negative lines" % rid, not f, f)
        f = fired(page, rid, True, vec["negatives_loose"])
        check("%s loose fires on none of the technical negative lines" % rid, not f, f)

    leaked = [l for l, left in page.evaluate(AS_PAGE, lic_pairs + short + pl_pairs + short_pl) if left]
    check("no labelled licence or plate survives the page in its default order", not leaked, leaked[:3])
    tokens = page.evaluate(
        """() => ['{"driverLicenseNumber":"A1234567"}', '{"license_plate":"8ABC123"}', '{"vehicle":{"plateNumber":"ABC-1234"}}']
          .map((l) => window.LogTotalSanitizerUi.sanitizeAsPage(l))"""
    )
    check(
        "JSON fields named for a licence or plate get their own tokens",
        "<DLN:" in tokens[0] and "<PLATE:" in tokens[1] and "<PLATE:" in tokens[2],
        tokens,
    )

    # Linear-time tripwire, the same 1000 ms bar verify-rules.py holds the other seeds to, with
    # label runs added so the context patterns are exercised too.
    ADV = (
        "'a.'.repeat(50000) + ' x-'.repeat(20000) + ' ' + '1aB'.repeat(30000) + ' ' + 'A1-'.repeat(30000)"
        " + ' driver license ' + '1 '.repeat(30000) + ' plate: ' + 'AB '.repeat(30000)"
    )
    t = time.time()
    page.evaluate(
        "() => { const L = window.LogTotalSanitizer, U = window.LogTotalSanitizerUi;"
        " L.createSanitizer({ rules: ['drivers_license', 'license_plates'].map((i) => L.defineRule(U.seededRule(i))), aggressive: true, report: { previewBytes: 0 } })"
        ".sanitizeText(" + ADV + "); }"
    )
    ms = int((time.time() - t) * 1000)
    check("a 478 KB adversarial line clears both rules, loose tier on, in under 1000 ms", ms < 1000, "%d ms" % ms)

    # Returning reader: a configuration saved by the build before these rules. Both must arrive,
    # switched on, at their declared place rather than at the top of the list.
    order = page.evaluate("window.LogTotalSanitizerUi.declaredOrder()")
    before = [i for i in order if i not in ("drivers_license", "license_plates")]
    builtin = page.evaluate("window.LogTotalSanitizer.builtinRuleIds")
    olds = [page.evaluate("(i) => window.LogTotalSanitizerUi.seededRule(i)", i) for i in ("agent_apis", "crypto_addresses")]
    cfg = {
        "logtotalSanitizerUi": 1,
        "seedVersion": "pre-id-rules",
        "customRules": olds,
        "rules": [
            {"id": i, "enabled": True, "kind": "builtin" if i in builtin else "custom"}
            for i in before
        ],
    }
    page.evaluate("(c) => localStorage.setItem('logtotal-sanitizer-ui.v1', JSON.stringify(c))", cfg)
    page.reload()
    page.wait_for_selector("#stats:not([hidden])", timeout=10000)
    page.wait_for_timeout(300)
    rows = page.evaluate("window.LogTotalSanitizerUi.ruleIds()")
    got = [r["id"] for r in rows]
    want = order[order.index("healthInfo"): order.index("paymentInfo") + 1]
    at = got.index("healthInfo") if "healthInfo" in got else -1
    check(
        "a returning reader gets both rules, on, between the health rule and the payment rule",
        got[at: at + len(want)] == want
        and all(r["enabled"] for r in rows if r["id"] in ("drivers_license", "license_plates")),
        got[at: at + len(want)] if at >= 0 else got[:6],
    )

    check("no page errors", not errors, errors[:3])
    check("no non-file network requests", not reqs, reqs[:3])
    b.close()
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)} of {len(results)} checks passed")
sys.exit(1 if fails else 0)
