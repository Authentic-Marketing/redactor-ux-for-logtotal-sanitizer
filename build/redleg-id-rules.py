"""Proves the verify-id-rules.py assertions can fail. Each leg breaks one mechanism of the driver's
licence and plate rules in a scratch copy of the built page, runs verify-id-rules.py against that
copy, and requires the named assertion to go red. A leg that stays green means the assertion is
decorative. Nothing here touches the real page. Added 2026-09-27."""

import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
PAGE = HERE.parent / "index.html"
PY = sys.executable


def swap(old, new, times=1):
    def f(src):
        assert src.count(old) == times, "break point not found %d times: %s" % (times, old[:60])
        return src.replace(old, new)

    return f


def non_atomic(src):
    # The short-label plate value, (?=(V))\1, becomes a plain (V) that backtracking can shorten.
    head = "(?=((?!0x)(?![A-Z]{1,3}00)"
    assert src.count(head) == 1, "short-label plate value not found once"
    start = src.index(head)
    end = src.index("))\\\\1", start)
    return src[:start] + "(" + src[start + 4: end] + ")" + src[end + len("))\\\\1"):]


LEGS = [
    (
        "the Florida printed format is lost",
        swap("[A-Z]\\\\d{3}-\\\\d{3}-\\\\d{2}-\\\\d{3}-\\\\d(?!", "[A-Z]ZZZZ(?!"),
        "the strict licence tier catches every printed format bare",
    ),
    (
        "a short licence label takes any value",
        swap(
            "(?=[A-Za-z]{0,3}\\\\d{5}|[A-Z][A-Z*]{4,6}\\\\d{3})",
            "",
        ),
        "drivers_license strict fires on none of the SOC negative lines",
    ),
    (
        "the unit guard forgets bytes",
        swap("bytes?\\\\b|", "", times=5),
        "drivers_license strict fires on none of the SOC negative lines",
    ),
    (
        "a short-label plate value is no longer atomic",
        non_atomic,
        "license_plates strict fires on none of the SOC negative lines",
    ),
    (
        "the technical-token list loses SHA and AES",
        swap("(?!(?:SHA|AES|", "(?!(?:ZZZQ|ZZZR|"),
        "license_plates loose fires on none of the technical negative lines",
    ),
    (
        "the rules run after the payment rule",
        swap(
            '"drivers_license", "license_plates", "paymentInfo"',
            '"paymentInfo", "drivers_license", "license_plates"',
        ),
        "no labelled licence or plate survives the page in its default order",
    ),
    (
        "a new seed lands at the top of a returning reader's list",
        swap(
            "const at = DEFAULT_ORDER.includes(id) && next ? state.rules.findIndex((r) => r.id === next) : 0;",
            "const at = 0;",
        ),
        "a returning reader gets both rules, on, between the health rule and the payment rule",
    ),
    (
        "one row's Loose switch turns the other row loose too",
        swap(
            "  return typeof r.loose === 'boolean' ? r.loose : LOOSE_BY_DEFAULT.includes(String(r.id).replace(/_custom_*$/, ''));",
            "  return state.rules.some((x) => x.loose === true && x.id !== r.id) || (typeof r.loose === 'boolean' ? r.loose : LOOSE_BY_DEFAULT.includes(String(r.id).replace(/_custom_*$/, '')));",
        ),
        "Loose on the licence row catches its bare value and nothing else turns loose",
    ),
    (
        "the Loose setting is not saved",
        swap("looseCapable(r.id, st.custom) ? { loose: looseOn(r, st.custom) } : {})),", "{})),"),
        "the Loose setting survives a reload and an import",
    ),
    (
        "the exported rules file drops the loose patterns",
        swap(
            "function enabledCustom() { return state.rules.filter((r) => r.enabled && r.kind === 'custom').map(ruleDef); }",
            "function enabledCustom() { return state.rules.filter((r) => r.enabled && r.kind === 'custom').map((r) => materialize(state.custom[r.id])); }",
        ),
        "the exported rules file carries the loose patterns",
    ),
    (
        "the generated recipe drops the loose patterns",
        swap("(withCustomConsts ? r.id : js(ruleDef(r))));", "(withCustomConsts ? r.id : js(materialize(state.custom[r.id]))));"),
        "the generated recipe carries the loose patterns once, folded into patterns",
    ),
    (
        "an imported rules file keeps its loose tier folded in",
        swap("function unfold(d) {", "function unfold(d) { return false;"),
        "a rules file exported on Loose imports as Loose and Strict still turns the tier off",
    ),
    (
        "the editor's Test ignores the Loose switch",
        swap(
            "const rule = L.defineRule(fold(materialize(def), looseOn(row, Object.assign({}, state.custom, { [def.id]: def }))));",
            "const rule = L.defineRule(materialize(def));",
        ),
        "the editor's Test counts the loose tier when the row is Loose",
    ),
    (
        "folding leaves the loose patterns in aggressivePatterns too",
        swap("delete d.aggressivePatterns; ", ""),
        "with Aggressive and Loose both on, no loose pattern is listed twice",
    ),
    (
        "an edited seed's copy loses the Loose setting",
        swap(
            "Object.assign({ id: copy, enabled: false, kind: 'custom' }, typeof was.loose === 'boolean' ? { loose: was.loose } : {})",
            "{ id: copy, enabled: false, kind: 'custom' }",
        ),
        "an edited seed kept as a copy keeps its Loose switch and setting",
    ),
    (
        "the control goes back to a second line under the name",
        lambda src: swap("          '</div></div></div>' +", "          '</div></div></div>' + (looseCapable(r.id) ? '<div class=\"rule-tier\" style=\"height:44px\"></div>' : '') +")(src),
        "the licence and plate rows are as tall as their neighbours",
    ),
    (
        "plates start Loose too",
        swap("const LOOSE_BY_DEFAULT = ['drivers_license'];", "const LOOSE_BY_DEFAULT = ['drivers_license', 'license_plates'];"),
        "by default licences start Loose and plates Strict (JJ, 2026-09-28)",
    ),
    (
        # Amended 2026-09-28: the Settings view widened to 1120 px, so a wider switch no longer
        # reached the name in its column and this leg stayed green. The name now runs on under
        # the switch, which is the defect the check exists to catch at any column width.
        "the rule name runs under the switch",
        swap(".rule-name{font-size:.85rem;font-weight:600;min-width:6.6rem;line-height:1.25}", ".rule-name{font-size:.85rem;font-weight:600;min-width:6.6rem;line-height:1.25;white-space:nowrap;letter-spacing:1.5em}"),
        "a click on either switch lands on it and the rule name stays clear of it, at 390 and 1400 px",
    ),
    (
        "the diagram shrinks to fit a phone",
        swap("width:75%;min-width:750px;height:auto;margin:0 auto}", "width:75%;height:auto;margin:0 auto}"),
        "the diagram labels render 11 px or taller and the page never scrolls sideways, at 390 and 1400 px",
    ),
]


def run(page_path):
    env = dict(os.environ, SANITIZER_PAGE=str(page_path))
    r = subprocess.run(
        [PY, str(HERE / "verify-id-rules.py")],
        cwd=HERE,
        env=env,
        capture_output=True,
        text=True,
        timeout=900,
    )
    return r.stdout


def failed_names(out):
    return {
        re.sub(r"^FAIL\s+", "", l).split(":")[0].strip()
        for l in out.split("\n")
        if l.startswith("FAIL")
    }


def main():
    src = PAGE.read_text(encoding="utf-8")
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="sanitizer-redleg-id-rules-"))
    ok = True
    try:
        for name, brk, must_fail in LEGS:
            broken = tmp / "index.html"
            broken.write_text(brk(src), encoding="utf-8")
            fails = failed_names(run(broken))
            red = must_fail in fails
            print(
                ("RED  " if red else "GREEN")
                + "  "
                + name
                + "  ->  "
                + (
                    "'" + must_fail + "' went red as required"
                    if red
                    else "'" + must_fail + "' STAYED GREEN, the assertion is decorative"
                    + ("; red instead: " + str(sorted(fails)) if fails else "")
                )
            )
            ok = ok and red
        print("\ncontrol: the real page")
        control = failed_names(run(PAGE))
        print("  " + ("no assertion fails" if not control else "UNEXPECTED failures: " + str(control)))
        ok = ok and not control
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("\n" + ("all legs red and the control green" if ok else "RED LEG PROOF FAILED"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
