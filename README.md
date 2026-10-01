# Redactor UX for LogTotal Sanitizer, by Authentic Marketing

One HTML file that runs [`@socprime/logtotal-sanitizer`](https://github.com/socprime/logtotal-sanitizer) in your browser tab. Open it from disk. Your logs stay in the page.

## What it covers

- All eleven built-in rules in priority order, with enable and reorder
- Driver's licenses and license plates for the 50 US states, DC and the 10 Canadian provinces, on by default
- Aggressive and JSON modes
- Key generate, paste, encoding and rotate
- Always-redact and never-redact lists
- Custom rules through `defineRule`, with the library's own validation messages
- Paste, drop or stream a file, with progress and stop
- Before-and-after view with token correlation on hover
- Report with counts and distinct values
- CI mode: fail on match, or report only
- Import and export of config, rules file, list file, key, output and report, in the CLI's file formats
- Recipes for the CLI, Node, the browser, GitHub Actions, pre-commit and the local bridge, generated from the live configuration
- A How it works tab: a plain-language walk-through of the page with a diagram of its pipeline

## Driver's licenses and license plates

Two rules ship in the page, on by default: Driver's licenses (token `DLN`) and License plates (token `PLATE`). They cover all 50 US states, DC and the 10 Canadian provinces.

Each rule has two tiers. The strict tier is always on. It catches a value after a label that names the document, such as `driver's license`, `OLN` or `plate number`. After a short label such as `DL` or `tag:`, it takes only an ID-shaped value. It also catches printed license formats no other value shares, such as Florida `A123-456-78-901-0`.

The loose tier adds bare letter-and-digit license formats, such as California `A1234567` and `CA1111111`, and bare plate serials such as `8ABC123`. Aggressive mode runs every loose tier and also switches on the built-in rules' aggressive patterns.

On the two ID rows, the chip slot holds a Strict | Loose switch. It reads Strict or Loose, outlined when Strict and filled when Loose, and keeps one width in both states so the row never shifts. Each row's detail panel, which the info button opens, names its `DLN` or `PLATE` token. Driver's licenses starts on Loose and License plates starts on Strict. A reader's own choice is saved and kept, including in exports, imports and an edited copy of a seed. Loose turns on that rule's loose tier alone, without Aggressive mode and without the built-in rules' aggressive patterns. It folds the rule's loose patterns into its always-on patterns. The saved configuration, exports, the exported rules file and every generated recipe (CLI, Node, GitHub Actions, pre-commit) carry the same setting and give the same tokens. With Aggressive mode on, both switches read Loose and are held, and their hover text gives the reason. Built-in rules keep only the Aggressive switch.

The "Identity and vehicle records" sample shows both tiers on synthetic lines. It has labelled values for the strict tier, a printed Florida number, a plate in a JSON field and an AAMVA DAQ field, bare values that only Loose catches, and lookalikes that stay untouched: `OPS-1234`, `DL: 150.2 Mbps` and `VRM: OK`.

Some values match only after a label: all-digit licenses (Texas, Pennsylvania, New York and more than 20 others), all-digit plates (Delaware, New Hampshire, Rhode Island), vanity plates, and plates written with a space or hyphen, such as `ABC-1234`. Ticket keys, issue numbers and prose are written the same way. Vanity plate rules could not be verified for most jurisdictions and are not encoded.

Every format, its source URLs and a confidence grade are in `build/fixtures/id-formats.json`. The test values in `build/fixtures/id-vectors.json` are synthetic, built from repeated or sequential digits and placeholder letters, never a real license or plate number. `verify-id-rules.py` also runs both rules, with Loose on, over a 478 KB adversarial line and fails if the pass takes 1000 ms or more, which catches a pattern that backtracks badly.

Known limits:

- The loose tier cannot be free of false positives. `ABC1234` is both a New York plate and a build ID. Keep License plates on Strict and Aggressive off unless recall matters more than precision.
- The loose tier skips bare Missouri numbers that end in A to F, which read as hex. They still match after a label.
- Formats were read on 2026-09-27, mostly from secondary sources. License formats come largely from compiled format tables and screening and legal-reference sites, with a DMV or provincial page where one was found. Of the 61 license entries, 25 are HIGH confidence, 33 MEDIUM and 3 LOW (Rhode Island, South Dakota, Vermont). Plate formats rest on each jurisdiction's Wikipedia article, so none is above MEDIUM: 56 are MEDIUM and 5 LOW (Idaho, Pennsylvania, South Carolina, Washington, West Virginia). Unresolved source conflicts sit in `id-formats.json` with their confidence.
- Fields named `dl`, `tag` or `registration` are not keyed on. They usually hold download counts and version tags.
- No rule covers commercial driver's license labels (`CDL`), learner's permits, temporary, dealer or military plates, vehicle identification numbers (VINs), or IDs from Mexico or any other country outside the US and Canada.

## Two engines

- **Bundled.** Version 0.2.0-beta.3 is inside the page. Nothing is fetched to sanitize.
- **Local installation.** A loopback bridge to the package installed on your machine, so the page runs whatever version you have. The page refuses any bridge address that is not 127.0.0.1 or localhost, and the bridge refuses any page it does not know.

## Quick start

Download `index.html` and open it. Or clone this repository and open `index.html`.

## What talks to the network

The page makes no request on its own. Four things can send one, all of them started by you:

| Action | Where it goes | What it carries |
| --- | --- | --- |
| Check for update, in the Engine panel | `registry.npmjs.org` | Nothing about your logs. It reads the published version list. |
| Check when this page opens, if you switch it on | `raw.githubusercontent.com` | Nothing about your logs. One GET for a version number, at most once a day. |
| Selecting the Local engine | your own machine, `127.0.0.1` | A health poll every 3 seconds while Local is selected. |
| Sanitizing in Local mode | your own machine, `127.0.0.1` | The text you are sanitizing and the HMAC key, over plain HTTP on loopback, so the local package can do the work. |

In Bundled mode nothing leaves the page at all. The badge in the header counts external requests, and it stays at zero unless you press Check for update or switch on the check on open.

### The check when the page opens

Off unless you turn it on, under Engine. It exists because a downloaded file has no other way to
tell you it has been superseded. What it does when enabled: one GET for a small JSON file holding
the current page version and the current library version, at most once every 24 hours, and a line
in the Engine panel if either is newer than what you have. It never sends anything. It is silent
on failure: no endpoint, no network, a proxy in the way, or a malformed answer all mean the page
says nothing and carries on.

Three things worth knowing before you enable it:

- It reveals to GitHub, by IP and timing, that this tool is in use and roughly when. If that
  metadata is sensitive where you work, leave it off.
- The 24-hour limit is per browser profile. Clearing site data, a private window, or another
  browser each start their own clock.
- The notice is advisory and unauthenticated. If it points you at a download, verify that download
  the same way you verified this page.

The switch is stored separately from your configuration on purpose, so importing someone else's
config file can never switch on a network request.

## Local installation

Needs Node 20 or newer and npm.

```
npm install @socprime/logtotal-sanitizer@0.2.0-beta.3
node sanitizer-bridge.mjs
```

Get `sanitizer-bridge.mjs` from the Engine panel, the Export menu, or `build/bridge/`.

The bridge answers only pages it knows: one opened straight from disk, plus the addresses this
project publishes the page at. Anything else gets a flat refusal with no cross-origin headers, so
an unknown page cannot even tell the bridge is running, and the bridge prints the refused address
in your terminal with the flag that would allow it. Requests are capped per second.

```
node sanitizer-bridge.mjs --allow-origin https://your-intranet.example
node sanitizer-bridge.mjs --max-rps 50
```

`SANITIZER_BRIDGE_ORIGINS` and `SANITIZER_BRIDGE_MAX_RPS` do the same thing from the environment.

## Versions

Bundled and tested: 0.2.0-beta.3, published 2026-09-23. Minimum supported: 0.2.0-beta.2. Pin the same version everywhere, because tokens only match across machines when the key, the library version and the rule set all match.

To move the bundled copy to a newer release, use the Engine panel's update command. It runs `build/bridge/update-page.mjs`, which needs Node and npm, downloads the version you name (or the newest published one if you name none), rebundles it with esbuild, prints the version it is about to write, and saves a timestamped backup beside the page.

## Keys

The HMAC key lives in page memory only. The saved configuration never includes it. Exporting a key file is a deliberate, separately named action. Keep that file out of version control. In Local mode the key travels to your own bridge with each request and the bridge does not store it. The key matters most for the Driver's licenses and License plates rules. Without the key, a token cannot be turned back into its value. With it, anyone can compute the token for every value a license or plate format allows and look tokens up. A California license, one letter and seven digits, has 260 million possible values, few enough for a laptop to try them all.

## Token stability

Same key, same library version and same rule set on every node give the same tokens. Change any of the three and the tokens change.

## Samples

The bundled samples are synthetic: `example.test` hostnames with documentation and private address ranges (RFC 5737, RFC 1918). No real log data.

## Rebuild and verify

Everything runs from the `build` directory.

```
cd build
python3 assemble.py ../index.html
pip install playwright && playwright install chromium
python3 verify.py
python3 verify-id-rules.py
python3 redleg-id-rules.py
cd bridge && npm install @socprime/logtotal-sanitizer@0.2.0-beta.3 && cd ..
python3 verify-bridge.py
```

`verify-id-rules.py` runs 41 checks on the driver's license and license plate rules. `redleg-id-rules.py` proves those checks can fail: it breaks nineteen mechanisms one at a time, from a printed format to the saved Loose setting, and requires the matching check to go red while the control stays green.

`verify.py` runs 51 behavior checks against `../index.html` from `file://`. `verify-bridge.py` starts the bridge and runs 36 checks, including four proving the page refuses a bridge address that is not loopback and nine covering the bridge's own allowlist and request cap. `redleg-bridge.py` proves those last checks can fail, by starting the bridge with the guards widened and showing the refusals stop. Both verifiers write screenshots to `build/shots/`.

## Design

Dark and light themes, no webfont, 44 px touch targets.

## License

Apache-2.0, the same license as the library. Built by Authentic Marketing. Not affiliated with or endorsed by SOC Prime. LogTotal and SOC Prime are trademarks of SOC Prime.
