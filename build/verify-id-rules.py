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

    # The per-rule Loose switch, added 2026-09-28. It must reach only its own rule, survive a reload
    # and an import, reach the exported rules file, the generated recipes and the editor's Test, and
    # never run a loose pattern twice. Every wait is on a finished run, never a fixed sleep.
    SEQ = "() => window.LogTotalSanitizerUi.resultSeq()"

    def settle(action):
        before = page.evaluate(SEQ)
        page.evaluate(action)
        page.wait_for_function("(n) => window.LogTotalSanitizerUi.resultSeq() > n", arg=before, timeout=15000)

    def fresh():
        page.evaluate("() => localStorage.clear()")
        page.reload()
        page.wait_for_selector("#stats:not([hidden])", timeout=10000)

    def load_ids():
        settle("() => { document.querySelector('#sampleSel').value = 'ids'; document.querySelector('#loadSample').click(); }")

    def press(rid):
        settle("() => document.querySelector('.rule[data-id=\"" + rid + "\"] [data-act=loose]').click()")

    def set_tier(rid, loose):
        now = page.evaluate("(i) => document.querySelector('.rule[data-id=\"' + i + '\"] [data-act=loose]').getAttribute('aria-checked')", rid)
        if now != ("true" if loose else "false"):
            press(rid)

    def import_json(name, obj):
        before = page.evaluate(SEQ)
        page.set_input_files("#importFile", {"name": name, "mimeType": "application/json", "buffer": json.dumps(obj).encode()})
        page.wait_for_function("(n) => window.LogTotalSanitizerUi.resultSeq() > n", arg=before, timeout=15000)

    # The recipe as the Node integration writes it: the drivers_license definition, parsed.
    def recipe_rule(rid):
        rec = page.evaluate("() => window.LogTotalSanitizerUi.recipeSource()")
        at = rec.index('"id": "' + rid + '"')
        i = rec.rindex("{", 0, at)
        depth = 0
        for j in range(i, len(rec)):
            depth += {"{": 1, "}": -1}.get(rec[j], 0)
            if depth == 0:
                return json.loads(rec[i: j + 1])

    OUT = "() => document.querySelector('#outPre').textContent"
    PRESSED = "[...document.querySelectorAll('#ruleList [data-act=loose]')].map((b) => [b.closest('.rule').dataset.id, b.getAttribute('aria-checked')])"
    LOOSE_PAT = "\\bSA\\d{7}\\b"

    fresh()
    SW = "[...document.querySelectorAll('#ruleList [data-act=loose]')].map((b) => b.closest('.rule').dataset.id)"
    check("the Loose switch sits on the licence and plate rows only", sorted(page.evaluate(SW)) == ["drivers_license", "license_plates"], page.evaluate(SW))
    check(
        "by default licences start Loose and plates Strict (JJ, 2026-09-28)",
        dict(page.evaluate(PRESSED)) == {"drivers_license": "true", "license_plates": "false"},
        page.evaluate(PRESSED),
    )
    # The switch sits in the chip slot, so the two rows stay one line, as tall as their
    # neighbours. It is what a pointer hits, 44 px or more, and the rule name never runs under it,
    # at phone and desktop widths. Amended 2026-09-28: the name's text is measured as well as its
    # box, because the grid keeps the box clear even when the text itself spills under the switch.
    GEOM = """() => { const q = (id) => document.querySelector('.rule[data-id="' + id + '"]');
      q('drivers_license').scrollIntoView({ block: 'center' });
      const hs = ['drivers_license', 'license_plates', 'paymentInfo', 'phoneNumbers'].map((id) => Math.round(q(id).getBoundingClientRect().height));
      const hit = ['drivers_license', 'license_plates'].map((id) => { const b = q(id).querySelector('[data-act=loose]'); const r = b.getBoundingClientRect(); const ne = q(id).querySelector('.rule-name'); const n = ne.getBoundingClientRect();
        const rg = document.createRange(); rg.selectNodeContents(ne); const t = rg.getBoundingClientRect();
        return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) && r.height >= 44 && r.width >= 44 && n.right <= r.left + 0.5 && t.right <= r.left + 0.5; });
      return { heights: hs, hit }; }"""
    geo = []
    for w in (390, 1400):
        page.set_viewport_size({"width": w, "height": 900})
        page.click('.viewtabs [data-view="configure"]')
        geo.append([w, page.evaluate(GEOM)])
    page.set_viewport_size({"width": 1280, "height": 720})
    check(
        "the licence and plate rows are as tall as their neighbours",
        all(len(set(g["heights"])) == 1 for _, g in geo),
        [[w, g["heights"]] for w, g in geo],
    )
    check(
        "a click on either switch lands on it and the rule name stays clear of it, at 390 and 1400 px",
        all(g["hit"] == [True, True] for _, g in geo),
        geo,
    )
    set_tier("drivers_license", False)
    load_ids()
    o = page.evaluate(OUT)
    check(
        "the identity sample fires both rules strict and leaves bare values and lookalikes alone",
        o.count("<DLN:") >= 3 and o.count("<PLATE:") >= 2
        and all(v in o for v in ("6DEF456", "B7654321", "OPS-1234", "DL: 150.2 Mbps", "VRM: OK")),
        o[-400:],
    )
    press("drivers_license")
    o = page.evaluate(OUT)
    agg = page.evaluate("(l) => window.LogTotalSanitizerUi.sanitizeAsPage(l)", "ref 1234567890 end")
    check(
        "Loose on the licence row catches its bare value and nothing else turns loose",
        "B7654321" not in o and "6DEF456" in o and "1234567890" in agg
        and all(v in o for v in ("OPS-1234", "DL: 150.2 Mbps", "VRM: OK")),
        o[-300:],
    )
    ex = page.evaluate("() => window.LogTotalSanitizerUi.exportedRules().find((d) => d.id === 'drivers_license')")
    check("the exported rules file carries the loose patterns", LOOSE_PAT in ex["patterns"], len(ex["patterns"]))
    rr = recipe_rule("drivers_license")
    check(
        "the generated recipe carries the loose patterns once, folded into patterns",
        LOOSE_PAT in rr["patterns"] and "aggressivePatterns" not in rr and rr["patterns"].count(LOOSE_PAT) == 1,
        sorted(rr),
    )

    # The editor's Test counts what the page runs: more with the row on Loose than on Strict.
    TEST = """() => { const li = document.querySelector('.rule[data-id="drivers_license"]'); li.querySelector('[data-act=edit]').click();
      document.querySelector('#rf-test').click(); const t = document.querySelector('#rf-testOut').textContent;
      document.querySelector('#rf-cancel').click(); return parseInt(t, 10); }"""
    loose_n = page.evaluate(TEST)
    press("drivers_license")
    strict_n = page.evaluate(TEST)
    check("the editor's Test counts the loose tier when the row is Loose", loose_n > strict_n, [loose_n, strict_n])
    # A state that differs from the defaults (plates start Strict), so a lost setting shows.
    set_tier("drivers_license", True)
    set_tier("license_plates", True)

    page.reload()
    page.wait_for_selector("#stats:not([hidden])", timeout=10000)
    after_reload = dict(page.evaluate(PRESSED))
    exported = page.evaluate("() => JSON.parse(localStorage.getItem('logtotal-sanitizer-ui.v1'))")
    rules_file = page.evaluate("() => window.LogTotalSanitizerUi.exportedRules()")
    fresh()
    import_json("sanitizer-config.json", exported)
    after_import = dict(page.evaluate(PRESSED))
    check(
        "the Loose setting survives a reload and an import",
        after_reload == {"drivers_license": "true", "license_plates": "true"} and after_import == after_reload,
        [after_reload, after_import],
    )

    # A rules file exported with the row on Loose carries the loose tier folded into patterns. Its
    # import must split it back out and set the row Loose, so Strict still turns the tier off.
    fresh()
    import_json("custom-rules.json", rules_file)
    imported = dict(page.evaluate(PRESSED))
    load_ids()
    # A missing switch is a failure of this check, not a crash of the suite.
    if "drivers_license" in imported:
        press("drivers_license")
    o = page.evaluate(OUT)
    check(
        "a rules file exported on Loose imports as Loose and Strict still turns the tier off",
        imported.get("drivers_license") == "true" and "B7654321" in o,
        [imported, o[-160:]],
    )

    # Aggressive on with a row on Loose: every loose pattern runs once, and the switches are held.
    fresh()
    set_tier("drivers_license", True)
    settle("() => { const a = document.querySelector('#aggressive'); a.checked = true; a.dispatchEvent(new Event('change', { bubbles: true })); }")
    btn = page.evaluate("[...document.querySelectorAll('#ruleList [data-act=loose]')].map((b) => [b.getAttribute('aria-checked'), b.getAttribute('aria-disabled')])")
    check("with Aggressive on, both switches read Loose and are held", btn == [["true", "true"], ["true", "true"]], btn)
    ex = page.evaluate("() => window.LogTotalSanitizerUi.exportedRules().find((d) => d.id === 'drivers_license')")
    check(
        "with Aggressive and Loose both on, no loose pattern is listed twice",
        ex["patterns"].count(LOOSE_PAT) == 1 and LOOSE_PAT not in (ex.get("aggressivePatterns") or []),
        sorted(ex),
    )

    # A reader's edit to a seed, set Loose, is kept as a copy with its switch and its setting when a
    # later build replaces the seed.
    fresh()
    edited = page.evaluate("() => window.LogTotalSanitizerUi.seededRule('drivers_license')")
    edited["patterns"] = edited["patterns"] + ["\\bMYDL-[0-9]{6}\\b"]
    olds = [page.evaluate("(i) => window.LogTotalSanitizerUi.seededRule(i)", i) for i in ("agent_apis", "crypto_addresses", "license_plates")]
    page.evaluate(
        "(c) => localStorage.setItem('logtotal-sanitizer-ui.v1', JSON.stringify(c))",
        {
            "logtotalSanitizerUi": 1,
            "seedVersion": "an-older-build",
            "customRules": olds + [edited],
            "rules": [{"id": i, "enabled": True, "kind": "custom"} for i in ("agent_apis", "crypto_addresses", "license_plates")]
            + [{"id": "drivers_license", "enabled": True, "kind": "custom", "loose": False}],
        },
    )
    page.reload()
    page.wait_for_selector("#stats:not([hidden])", timeout=10000)
    pressed = dict(page.evaluate(PRESSED))
    check(
        "an edited seed kept as a copy keeps its Loose switch and setting",
        # Strict, the opposite of the licence default, so a dropped setting shows.
        pressed.get("drivers_license_custom") == "false" and pressed.get("drivers_license") == "false",
        pressed,
    )
    # The How it works view, handed over in #soc-prime post 1597 on 2026-09-28: the tab copy, the
    # diagram between the copy's second and third paragraphs, and labels that stay legible
    # without the page scrolling sideways.
    page.set_viewport_size({"width": 1400, "height": 900})
    page.click('.viewtabs [data-view="how"]')
    how = page.evaluate("""() => { const c = document.querySelector('#howCard .how-body'); const kids = [...c.children].map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 24));
      const svg = c.querySelector('svg.hiw-diagram'); return { kids: kids.slice(0, 5), boxes: svg ? svg.querySelectorAll('.box').length : 0, arrows: svg ? svg.querySelectorAll('.flow').length : 0,
        shown: [...document.querySelectorAll('.main > .card')].filter((x) => x.offsetParent).map((x) => x.id) }; }""")
    check(
        "the How it works view shows the tab copy with the diagram between its second and third paragraphs",
        len(how["kids"]) == 5
        and all(k.startswith(e) for k, e in zip(how["kids"], ["H2:How it works", "P:Redactor UX runs", "P:Three requests stay off", "FIGURE:", "H3:Rules scan each line"]))
        and how["boxes"] == 9 and how["arrows"] == 11 and how["shown"] == ["howCard"],
        how,
    )
    legible = []
    for w in (390, 1400):
        page.set_viewport_size({"width": w, "height": 900})
        page.click('.viewtabs [data-view="how"]')
        legible.append([w, page.evaluate("""() => ({ label: Math.min(...[...document.querySelectorAll('#howCard .hiw-diagram .lbl')].map((t) => t.getBoundingClientRect().height)),
          overflow: document.documentElement.scrollWidth > innerWidth })""")])
    page.set_viewport_size({"width": 1280, "height": 720})
    check(
        "the diagram labels render 11 px or taller and the page never scrolls sideways, at 390 and 1400 px",
        all(m["label"] >= 11 and not m["overflow"] for _, m in legible),
        legible,
    )

    check("no page errors", not errors, errors[:3])
    check("no non-file network requests", not reqs, reqs[:3])
    b.close()
fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)} of {len(results)} checks passed")
sys.exit(1 if fails else 0)
