"""Proves the verify-rules.py assertions can fail. Each leg breaks one mechanism in a scratch copy
of the built page, runs verify-rules.py against that copy, and requires the named assertion to go
red. A leg that stays green means the assertion is decorative. Nothing here touches the real page;
the scratch copies live in a temporary directory and are discarded. Added 2026-09-23."""

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
    (
        "a segwit pattern is lost",
        r'"\\b(?:bc|tb|bcrt)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{8,87}\\b",',
        "",
        "the crypto rule alone redacts all 163 upstream vectors",
    ),
    (
        "a vendor key pattern is lost",
        r'"\\bgsk_[A-Za-z0-9]{20,}\\b",',
        "",
        "the LLM APIs rule alone masks every vendor key",
    ),
    (
        "the Fireworks guard is loosened",
        r'"\\bfw_(?=',
        r'"\\bfw_[A-Za-z0-9_]{10,}|\\bfw_(?=',
        "the LLM APIs rule leaves key lookalikes alone",
    ),
    (
        "a broad pattern joins the crypto rule",
        r'"\\bt?bnb1[',
        r'"\\b[a-z]{7}\\b", "\\bt?bnb1[',
        "crypto_addresses fires on none of the SOC negative lines",
    ),
    (
        "the ENS pattern goes back to the quadratic draft",
        r'"(?<![A-Za-z0-9_.-])(?:[a-z0-9-]{1,63}\\.){0,8}',
        r'"\\b(?:[a-z0-9-]+\\.)*',
        "a 250 KB adversarial line clears the seeded rules in under 1000 ms",
    ),
    (
        "an edited seed is overwritten",
        "if (SHIPPED_SEED_HASHES.includes(h) || (now && seedHash(now) === h)) return;",
        "return;",
        "the reader's edit to a seed is kept, switched off",
    ),
    (
        "retired seeds are matched by name prefix again",
        "const wasSeeded = (id) => RETIRED_SEED_IDS.includes(id);",
        "const wasSeeded = (id) => /^(agent_|crypto_|llm_|stablecoin)/.test(id);",
        "the reader's own crypto_ and llm_ rules survive",
    ),
    (
        "an import no longer refreshes the seeds",
        "applyConfig(parsed); refreshSeeded(); syncControls(); changed();",
        "applyConfig(parsed);",
        "importing a pre-expansion export still yields the shipped seeds",
    ),
]


def run(page_path):
    env = dict(os.environ, SANITIZER_PAGE=str(page_path))
    r = subprocess.run(
        [PY, str(HERE / "verify-rules.py")],
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
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="sanitizer-redleg-rules-"))
    ok = True
    try:
        for name, old, new, must_fail in LEGS:
            assert src.count(old) == 1, "break point not found once: " + name
            broken = tmp / "index.html"
            broken.write_text(src.replace(old, new), encoding="utf-8")
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
                )
            )
            ok = ok and red
        print("\ncontrol: the real page")
        control = failed_names(run(PAGE))
        print(
            "  "
            + (
                "no assertion fails"
                if not control
                else "UNEXPECTED failures: " + str(control)
            )
        )
        ok = ok and not control
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(
        "\n" + ("all legs red and the control green" if ok else "RED LEG PROOF FAILED")
    )
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
