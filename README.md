# Redactor UX for LogTotal Sanitizer, by Authentic Marketing

Redactor UX is a single-file browser tool by Authentic Marketing that redacts secrets and PII from logs. It is built using SOC Prime's open source LogTotal Sanitizer library, bundles version 0.2.0-beta.3 unmodified, and adds four rules of its own. Both projects are licensed under Apache-2.0, and Redactor UX is not affiliated with or endorsed by SOC Prime.

One HTML file that runs [`@socprime/logtotal-sanitizer`](https://github.com/socprime/logtotal-sanitizer) in your browser tab. Open it from disk. Your logs stay in the page.

## Quick start

Get the page one of three ways:

- **From authenticmarketing.xyz.** Download [redactor-ux.html](https://authenticmarketing.xyz/wp-content/uploads/2026/09/redactor-ux.html) and open it in your browser.
- **From GitHub Releases.** Download `redactor-ux.html` or `logtotal-sanitizer-web-app.zip` from [Releases](https://github.com/Authentic-Marketing/redactor-ux-for-logtotal-sanitizer/releases) and check it against `SHA256SUMS`.
- **From source.** Clone this repository and open `index.html`. To rebuild it, see [Rebuild and verify](#rebuild-and-verify).

First use:

1. Load a synthetic sample: pick one from the sample list and press Load sample.
2. Paste your own log, or press Open file.
3. Press Sanitize.
4. Review the result in the Before and after tab and the Report tab. Hover a token to see every occurrence.
5. Download the result with Download sanitized log, in the Sanitized output tab.

The report JSON holds the original values. Keep it private.

## What it covers

- 15 rules: 11 upstream rules plus 4 added by this page, in priority order, with enable and reorder. The four added rules are driver's licenses (`DLN`), license plates (`PLATE`), LLM API keys (`LLMAPI`) and cryptocurrency addresses (`CRYPTO`).
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

Driver's licenses (`DLN`) and License plates (`PLATE`) cover the 50 US states, DC and the 10 Canadian provinces, are on by default, and each has a strict tier and a loose tier chosen with a Strict | Loose switch on its row. The formats and their sources, confidence grades, tests and known limits are in [docs/id-rules.md](docs/id-rules.md).

## Two engines

- **Bundled.** Version 0.2.0-beta.3 is inside the page. Nothing is fetched to sanitize.
- **Local installation.** A loopback bridge to the package installed on your machine, so the page runs whatever version you have. The page refuses any bridge address that is not 127.0.0.1 or localhost, and the bridge refuses any page it does not know.

## Releases and downloads

The primary download is on authenticmarketing.xyz: the HTML file at https://authenticmarketing.xyz/wp-content/uploads/2026/09/redactor-ux.html, and a zip. Each GitHub Release in this repository also carries `redactor-ux.html`, `logtotal-sanitizer-web-app.zip` and `SHA256SUMS`.

The authenticmarketing.xyz copy updates itself from each published GitHub Release, at least 20 minutes after publishing, and checks the checksums first. Trust in either download therefore rests on who can publish releases in this repository.

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

Redactor UX is licensed under Apache-2.0. It bundles SOC Prime's `@socprime/logtotal-sanitizer` 0.2.0-beta.3, also licensed under Apache-2.0, bundled with esbuild, source files not modified. Built by Authentic Marketing. Not affiliated with or endorsed by SOC Prime. LogTotal and SOC Prime are trademarks of SOC Prime.
