"""Proves the check-on-open assertions can fail. Each leg breaks one mechanism in a scratch copy
of the built page, runs verify-update-check.py against that copy, and requires the named assertion
to go red. A leg that stays green means the assertion is decorative. Nothing here touches the real
page; the scratch copies live in a temporary directory and are discarded."""

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

LEGS = [
    ("comparator always says equal",
     "function cmpVer(a, b) {",
     "function cmpVer(a, b) { return 0;",
     "a newer page offers the download"),
    ("the off switch is ignored",
     "if (lsGet(AUTO_KEY) !== '1') return 'off';",
     "if (false) return 'off';",
     "first open with no stored choice sends nothing"),
    ("the once-a-day window is ignored",
     "if (last && (now - last < CHECK_EVERY_MS || last > now)) return 'throttled';",
     "if (false) return 'throttled';",
     "a second open inside the day sends nothing"),
]


def run(page_path):
    env = dict(os.environ, SANITIZER_PAGE=str(page_path))
    r = subprocess.run([PY, str(HERE / "verify-update-check.py")], cwd=HERE, env=env,
                       capture_output=True, text=True, timeout=900)
    return r.stdout


def failed_names(out):
    return {re.sub(r"^FAIL\s+", "", l).split(":")[0].strip()
            for l in out.split("\n") if l.startswith("FAIL")}


def main():
    src = PAGE.read_text(encoding="utf-8")
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="sanitizer-redleg-"))
    ok = True
    try:
        for name, old, new, must_fail in LEGS:
            assert src.count(old) == 1, "break point not found once: " + name
            broken = tmp / "index.html"
            broken.write_text(src.replace(old, new), encoding="utf-8")
            fails = failed_names(run(broken))
            red = must_fail in fails
            print(("RED  " if red else "GREEN") + "  " + name +
                  "  ->  " + ("'" + must_fail + "' went red as required"
                              if red else "'" + must_fail + "' STAYED GREEN, the assertion is decorative"))
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
