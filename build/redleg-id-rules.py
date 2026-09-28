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
            "function looseOn(r) { return Boolean(r && r.loose && LOOSE_IDS.includes(r.id)); }",
            "function looseOn(r) { return Boolean(r && LOOSE_IDS.includes(r.id) && state.rules.some((x) => x.loose)); }",
        ),
        "Loose on the licence row catches its bare value and nothing else turns loose",
    ),
    (
        "the Loose setting is not saved",
        swap("looseOn(r) ? { loose: true } : {})),", "{})),"),
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
        "the generated recipe carries the loose patterns",
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
