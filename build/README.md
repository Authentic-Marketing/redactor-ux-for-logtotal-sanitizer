# Build

The shipped artifact is one static HTML file, so the build here is a small Python assembler rather than an npm pipeline. Node is used only at runtime, for the optional local bridge and the update script.

Run everything from this directory.

| File | Role |
| --- | --- |
| `assemble.py` | Concatenates `ui/head.frag`, `ui/body.frag` and `ui/app-*.js`, embeds the bundled library, the bridge script, the update script, the logo and the favicon, and writes the page. |
| `ui/` | The page source. Edit here, never in `index.html`. |
| `pkg/sanitizer.iife.js` | `@socprime/logtotal-sanitizer` 0.2.0-beta.2 bundled with esbuild 0.27.7 as an IIFE global. |
| `bridge/` | The loopback bridge and the update script, embedded into the page and downloadable from it. |
| `verify.py` | 51 behavior checks against the built page in headless Chromium. The rule-row counts derive from the page's own seed list, so adding or removing a shipped rule does not need the numbers editing here. |
| `verify-bridge.py` | 35 checks that start the real bridge, including four proving a non-loopback address is refused and nine covering the bridge's allowlist and request cap. |
| `verify-update-check.py` | 40 checks on the optional check when the page opens. The version URL is served by `page.route()` in every case, so the suite never touches the live network. |
| `redleg-update-check.py` | Breaks the comparator, the off switch and the daily window in turn and requires the matching assertion to go red. A leg that stays green means that assertion is decorative. |
| `redleg-bridge.py` | Starts the bridge with its guards widened and shows the refusals stop, which is what makes the checks above worth trusting. |

```
python3 assemble.py ../index.html --public --version-json ../version.json
python3 verify.py
cd bridge && npm install @socprime/logtotal-sanitizer@0.2.0-beta.2 && cd ..
python3 verify-bridge.py
```

`assemble.py` takes an optional `--public` flag, which omits two build-provenance lines from the page head. The published page is built with it.

Screenshots and the generated log fixtures land in `shots/`, `small.log` and `big.log`, all gitignored.
