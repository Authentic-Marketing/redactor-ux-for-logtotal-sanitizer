# Build

The shipped artifact is one static HTML file, so the build here is a small Python assembler rather than an npm pipeline. Node is used only at runtime, for the optional local bridge and the update script.

Run everything from this directory.

| File | Role |
| --- | --- |
| `assemble.py` | Concatenates `ui/head.frag`, `ui/body.frag` and `ui/app-*.js`, embeds the bundled library, the bridge script, the update script, the logo and the favicon, and writes the page. |
| `ui/` | The page source. Edit here, never in `index.html`. |
| `pkg/sanitizer.iife.js` | `@socprime/logtotal-sanitizer` 0.2.0-beta.3 bundled with esbuild 0.27.7 as an IIFE global. |
| `bridge/` | The loopback bridge and the update script, embedded into the page and downloadable from it. |
| `verify.py` | 51 behavior checks against the built page in headless Chromium. The rule-row counts derive from the page's own seed list, so adding or removing a shipped rule does not need the numbers editing here. |
| `verify-bridge.py` | 36 checks that start the real bridge, including four proving a non-loopback address is refused and nine covering the bridge's allowlist and request cap. |
| `verify-update-check.py` | 40 checks on the optional check when the page opens. The version URL is served by `page.route()` in every case, so the suite never touches the live network. |
| `redleg-update-check.py` | Breaks the comparator, the off switch and the daily window in turn and requires the matching assertion to go red. A leg that stays green means that assertion is decorative. |
| `redleg-bridge.py` | Starts the bridge with its guards widened and shows the refusals stop, which is what makes the checks above worth trusting. |
| `verify-id-rules.py` | 41 checks on the driver's license and license plate rules and the How it works view. They check that the Strict and Loose switch appears on the two ID rows only, Driver's licenses starts Loose and License plates starts Strict, the Identity and vehicle records sample behaves, Loose on one row catches its bare value and turns nothing else loose, the exported rules file and the generated recipe carry the loose patterns, the setting survives a reload and an import, and with Aggressive on both switches read Loose and are held. Also that a rules file exported on Loose imports as Loose, the editor's Test counts the loose tier, no loose pattern is listed twice with Aggressive on, an edited seed's copy keeps its control and setting, the two rows are as tall as their neighbours, and at 390 and 1400 px a click lands on the chip switch and the rule name stays clear of it. Also that the How it works view shows the copy with the diagram between paragraphs 2 and 3 (9 boxes, 11 arrows), with diagram labels 11 px or taller and no sideways page scroll at 390 and 1400 px. |
| `redleg-id-rules.py` | Breaks nineteen mechanisms in turn (a printed format, the short-label ID shape, the unit guard, the atomic value capture, the technical-token list, the rule order, the returning-reader placement, the Loose setting leaking to the other row, the setting not saved, the exported rules file dropping the loose patterns, the recipe dropping them, a rules-file import keeping the loose tier folded in, the editor's Test ignoring the switch, a loose pattern listed twice, an edited copy losing its setting, the control back on a second line, the diagram shrinking to fit a phone, plates starting Loose too, the switch widening so the rule name runs under it) and requires the named check to go red. The control stays green. |
| `fixtures/id-formats.json`, `fixtures/id-vectors.json` | `id-formats.json` holds every license and plate format for 61 jurisdictions, with its source URLs and a confidence grade. `id-vectors.json` holds the synthetic values the checks run, and every false positive found while the rules were built, pinned as a line that must stay untouched. |

```
python3 assemble.py ../index.html --public --version-json ../version.json
python3 verify.py
cd bridge && npm install @socprime/logtotal-sanitizer@0.2.0-beta.3 && cd ..
python3 verify-bridge.py
```

`assemble.py` takes an optional `--public` flag, which omits two build-provenance lines from the page head. The published page is built with it.

## Changing an ID format

To change a driver's license or plate format, or add a jurisdiction:

1. Edit its entry in `fixtures/id-formats.json`, with the source URL and a confidence grade.
2. Add at least one synthetic value per format to `fixtures/id-vectors.json`: repeated or sequential digits and placeholder letters, never a real number. `verify-id-rules.py` fails on any format without a value. Add any false positive you find to the negative lines, which must stay untouched.
3. Change the Driver's licenses or License plates patterns in `SEEDED_RULES` in `ui/app-1.js`. Strict patterns go in `patterns`, loose ones in `aggressivePatterns`.
4. Rebuild the page and run the ID checks.

```
python3 assemble.py ../index.html --public
python3 verify-id-rules.py
python3 redleg-id-rules.py
```

Screenshots and the generated log fixtures land in `shots/`, `small.log` and `big.log`, all gitignored.
