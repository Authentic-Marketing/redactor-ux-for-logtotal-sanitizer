"""Checks the two workflows and the version decision, then proves each check can fail.

    python3 verify-workflows.py

Part 1 asserts the safety properties of .github/workflows/*.yml. Part 2 runs upstream_check.decide
over known cases. Part 3 breaks each property in a copy held in memory and requires the matching
check to go red; a leg that stays green means that check is decorative.
"""

import copy
import pathlib
import sys

import yaml

HERE = pathlib.Path(__file__).resolve().parent
WF = HERE.parent / ".github" / "workflows"
sys.path.insert(0, str(HERE))
import upstream_check  # noqa: E402


def load(name):
    doc = yaml.safe_load((WF / name).read_text(encoding="utf-8"))
    doc["on"] = doc.pop(True, doc.get("on"))  # PyYAML reads the key `on` as True
    return doc


def runs(job):
    return "\n".join(s.get("run", "") for s in job.get("steps", []))


def text(obj):
    return yaml.safe_dump(obj)


def actions_pinned(doc):
    for job in doc["jobs"].values():
        for step in job.get("steps", []):
            uses = step.get("uses")
            if uses and len(uses.split("@")[-1]) != 40:
                return False
    return True


def common_checks(doc):
    t = text(doc)
    return {
        "triggers are schedule and manual only": set(doc["on"])
        == {"schedule", "workflow_dispatch"},
        "no default token permissions at the top": doc.get("permissions") == {},
        "every action pinned to a commit": actions_pinned(doc),
        "never merges": "gh pr merge" not in t and "merge --auto" not in t,
    }


def sync_checks(doc):
    j = doc["jobs"]
    s = j["sync"]
    r = runs(s)
    return {
        "sync job holds no GITHUB_TOKEN permissions": s.get("permissions") == {},
        "sync refuses a fork that is ahead of upstream": "ahead_by" in r
        and '"$ahead" != "0"' in r,
        "sync accepts only fast-forward or none": "fast-forward|none) ;;" in r,
        "sync reads back both tips and compares them": '"$fork" != "$upstream"' in r,
        "sync token only in the sync job": all(
            "FORK_SYNC_TOKEN" not in text(v) for k, v in j.items() if k != "sync"
        ),
        "failure opens an issue": j["report"].get("if") == "failure()"
        and "gh issue create" in runs(j["report"]),
    }


def pr_runs_only_copies(pr):
    """Every line that touches the artifact directory copies or reads it; none executes it."""
    for line in pr.splitlines():
        if "$SRC" not in line:
            continue
        if not line.strip().startswith(("cp ", "status=$(cat", 'cat "$SRC/checks.md"')):
            return False
    return True


def watch_checks(doc):
    j = doc["jobs"]
    b = j["build"]
    pr = runs(j["pr"])
    checkouts = [
        s for s in b["steps"] if str(s.get("uses", "")).startswith("actions/checkout@")
    ]
    return {
        "build job token is read-only": b.get("permissions") == {"contents": "read"},
        "build job sees no secrets": "secrets." not in text(b),
        "build job does not persist credentials": bool(checkouts)
        and all(
            s.get("with", {}).get("persist-credentials") is False for s in checkouts
        ),
        "pr job runs nothing from the artifact": pr_runs_only_copies(pr),
        "pr job refuses an unexpected change set": "Unexpected change set" in pr,
        "at most one open upstream pull request": "gh pr close" in pr
        and "Superseded by" in pr,
        "failed checks fail the run": 'if [ "$status" != "0" ]' in pr,
        "detect skips a version that already has a pull request": '--head "upstream/$bump"'
        in runs(j["detect"]),
        "failure opens an issue": j["report"].get("if") == "failure()"
        and "gh issue create" in runs(j["report"]),
    }


def all_checks(sync, watch):
    out = {}
    for name, doc, own in (
        ("sync-fork", sync, sync_checks),
        ("upstream-watch", watch, watch_checks),
    ):
        for k, v in {**common_checks(doc), **own(doc)}.items():
            out[name + ": " + k] = v
    return out


DECIDE_CASES = [
    ("0.2.0-beta.2", "0.2.0-beta.3", "0.2.0-beta.3"),
    ("0.2.0-beta.3", "0.2.0-beta.3", ""),
    ("0.2.0-beta.3", "0.2.0-beta.2", ""),
    ("0.2.0-beta.9", "0.2.0-beta.10", "0.2.0-beta.10"),
    ("0.2.0-beta.3", "0.2.0", "0.2.0"),
    ("0.2.0", "0.2.0-beta.9", ""),
    ("0.2.0", "0.10.0", "0.10.0"),
]


def decide_checks(decide):
    out = {}
    for cur, latest, want in DECIDE_CASES:
        try:
            got = decide(cur, latest)
        except ValueError:
            got = None
        out["decide %s vs %s -> %r" % (cur, latest, want)] = got == want
    try:
        decide("0.2.0", "0.3.0; rm -rf /")
        out["decide rejects a non-version"] = False
    except ValueError:
        out["decide rejects a non-version"] = True
    return out


def setrun(job, needle, repl):
    for st in job["steps"]:
        if "run" in st and needle in st["run"]:
            st["run"] = st["run"].replace(needle, repl)


W, S = "upstream-watch: ", "sync-fork: "
# (label, check that must go red, file, mutation)
LEGS = [
    (
        "pull_request_target trigger added",
        W + "triggers are schedule and manual only",
        "w",
        lambda d: d["on"].update({"pull_request_target": None}),
    ),
    (
        "top permissions widened",
        S + "no default token permissions at the top",
        "s",
        lambda d: d.update({"permissions": {"contents": "write"}}),
    ),
    (
        "action pinned to a tag",
        W + "every action pinned to a commit",
        "w",
        lambda d: d["jobs"]["build"]["steps"][0].update(
            {"uses": "actions/checkout@v7"}
        ),
    ),
    (
        "auto-merge added",
        W + "never merges",
        "w",
        lambda d: d["jobs"]["pr"]["steps"].append({"run": "gh pr merge --squash"}),
    ),
]
LEGS += [
    (
        "build job given write",
        W + "build job token is read-only",
        "w",
        lambda d: d["jobs"]["build"].update({"permissions": {"contents": "write"}}),
    ),
    (
        "secret handed to build job",
        W + "build job sees no secrets",
        "w",
        lambda d: d["jobs"]["build"]["env"].update({"T": "${{ secrets.X }}"}),
    ),
    (
        "build job persists credentials",
        W + "build job does not persist credentials",
        "w",
        lambda d: d["jobs"]["build"]["steps"][0]["with"].update(
            {"persist-credentials": True}
        ),
    ),
    (
        "pr job executes the artifact",
        W + "pr job runs nothing from the artifact",
        "w",
        lambda d: d["jobs"]["pr"]["steps"].append(
            {"run": 'node "$SRC/build/ui/app-1.js"'}
        ),
    ),
    (
        "change-set guard removed",
        W + "pr job refuses an unexpected change set",
        "w",
        lambda d: setrun(d["jobs"]["pr"], "Unexpected change set", "changes"),
    ),
    (
        "supersede removed",
        W + "at most one open upstream pull request",
        "w",
        lambda d: setrun(d["jobs"]["pr"], "gh pr close", "echo"),
    ),
    (
        "failed checks no longer fail",
        W + "failed checks fail the run",
        "w",
        lambda d: setrun(d["jobs"]["pr"], 'if [ "$status" != "0" ]', "if false"),
    ),
]
LEGS += [
    (
        "sync token leaks to report job",
        S + "sync token only in the sync job",
        "s",
        lambda d: d["jobs"]["report"]["steps"][0]["env"].update(
            {"T": "${{ secrets.FORK_SYNC_TOKEN }}"}
        ),
    ),
    (
        "ahead guard removed",
        S + "sync refuses a fork that is ahead of upstream",
        "s",
        lambda d: setrun(d["jobs"]["sync"], '"$ahead" != "0"', "false"),
    ),
    (
        "merge accepted",
        S + "sync accepts only fast-forward or none",
        "s",
        lambda d: setrun(
            d["jobs"]["sync"], "fast-forward|none) ;;", "fast-forward|none|merge) ;;"
        ),
    ),
    (
        "read-back removed",
        S + "sync reads back both tips and compares them",
        "s",
        lambda d: setrun(d["jobs"]["sync"], '"$fork" != "$upstream"', "false"),
    ),
    (
        "failure issue removed",
        S + "failure opens an issue",
        "s",
        lambda d: d["jobs"]["report"].update({"if": "always()"}),
    ),
]

BROKEN_DECIDERS = [
    ("decide proposes a downgrade", lambda c, l: l if l != c else ""),
    ("decide compares versions as strings", lambda c, l: l if l > c else ""),
]


def main():
    sync, watch = load("sync-fork.yml"), load("upstream-watch.yml")
    results = {**all_checks(sync, watch), **decide_checks(upstream_check.decide)}
    for k, v in results.items():
        print(("PASS " if v else "FAIL ") + k)
    passed = sum(results.values())
    print("%d of %d workflow checks passed" % (passed, len(results)))

    legs = []
    for label, key, which, mutate in LEGS:
        s, w = copy.deepcopy(sync), copy.deepcopy(watch)
        mutate(s if which == "s" else w)
        legs.append((label, all_checks(s, w)[key] is False))
    for label, broken in BROKEN_DECIDERS:
        legs.append((label, not all(decide_checks(broken).values())))
    for label, red in legs:
        print(("RED   " if red else "GREEN ") + "leg: " + label)
    reds = sum(r for _, r in legs)
    print("%d of %d red legs went red" % (reds, len(legs)))
    sys.exit(0 if passed == len(results) and reds == len(legs) else 1)


if __name__ == "__main__":
    main()
