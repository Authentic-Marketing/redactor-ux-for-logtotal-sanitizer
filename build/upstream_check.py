"""Decide whether upstream has a newer library than the one this repo bundles.

    python3 upstream_check.py <npm-latest-version>

Prints `bump=<version>` when npm's latest is newer than the bundled version, `bump=` otherwise.
An older npm latest (a dist-tag moved backwards) is reported and never proposed as a bump.
"""

import pathlib
import re
import sys

APP = pathlib.Path(__file__).resolve().parent / "ui" / "app-1.js"
LIB_RE = re.compile(
    r"const LIB = \{ name: '[^']+', version: '([^']+)', published: '[^']+' \};"
)
VERSION_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$")


def key(v):
    """Semver precedence: a release outranks its prereleases; numeric ids compare numerically."""
    m = VERSION_RE.match(v)
    if not m:
        raise ValueError("not a version: " + repr(v))
    major, minor, patch, pre = m.groups()
    core = (int(major), int(minor), int(patch))
    if pre is None:
        return core + ((1,),)
    ids = tuple((0, int(p), "") if p.isdigit() else (1, 0, p) for p in pre.split("."))
    return core + ((0,) + ids,)


def bundled():
    m = LIB_RE.search(APP.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit("LIB constant not found in " + str(APP))
    return m.group(1)


def decide(current, latest):
    if key(latest) > key(current):
        return latest
    if key(latest) < key(current):
        print(
            "npm latest " + latest + " is older than bundled " + current + "; ignored",
            file=sys.stderr,
        )
    return ""


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    print("bump=" + decide(bundled(), sys.argv[1].strip()))
