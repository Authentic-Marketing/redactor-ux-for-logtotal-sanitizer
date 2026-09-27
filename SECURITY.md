# Security notes

## The page

Open `index.html` from disk. In Bundled mode, as shipped, it makes no network request, and the header badge shows that count. Your logs and your HMAC key stay in the tab.

That is true of the default configuration and is meant to stay checkable rather than taken on trust: `build/verify.py` asserts zero non-file requests and a badge reading zero, and `build/verify-update-check.py` asserts that a page with no stored choice sends nothing at all.

One optional feature can make the page send a request without you pressing a button: **Check when this page opens**, under Engine, off unless you switch it on. Enabled, it sends one GET to `raw.githubusercontent.com` for a version number, at most once every 24 hours, carrying nothing about your logs, your configuration or your key. It fails silently in every direction: a 404, a 500, a timeout, a blocked or intercepted request, a malformed answer, or storage it cannot write all mean the page shows nothing and does nothing further. It does not retry, and a failed attempt still counts against the 24-hour limit, so a dead endpoint cannot turn into a request on every open. If your system clock moves backwards it stops checking rather than checking repeatedly.

Enabling it discloses to GitHub, through IP address and request timing, that this tool is in use and roughly when. In an air-gapped or closely monitored estate that may itself be the thing you do not want, which is why it is off by default and why the badge keeps counting.

The key is never written to `localStorage`, never logged, and never included in the saved configuration. The only way a key leaves the page is the key export in the Export menu, which is a separate, separately named file you choose to save.

## The local bridge

`build/bridge/sanitizer-bridge.mjs` is a convenience for people who would rather run the package they installed than the copy bundled in the page. Know what it is before you run it.

- It binds `127.0.0.1` only, so nothing off your machine can reach it.
- It answers only pages whose origin it knows: one opened straight from disk, and the addresses this project publishes the page at. Every other page gets 403 with no cross-origin headers, which the browser will not let that page read, so an unknown site cannot even confirm the bridge is running. The refused address is printed in your terminal along with the flag that would allow it.
- It caps requests per second, twenty by default, and answers past that with 429. Preflight is answered before the cap, so a burst reports itself honestly instead of looking like a broken connection.
- It accepts up to 64 MB per request.
- It writes nothing to disk and keeps no key.
- It has no password and no TLS, because it is loopback only. The origin allowlist is what stands between it and the other tabs in your browser, so add to it deliberately.

Start it when you need it and stop it when you are done. `--allow-origin` and `--max-rps` adjust both guards, and `SANITIZER_BRIDGE_ORIGINS` and `SANITIZER_BRIDGE_MAX_RPS` do the same from the environment.

One thing deliberately absent from the allowlist: `github.com`. A repository page there shows the file as source rather than running it, so allowing that origin would buy nothing and would hand every page on GitHub a working bridge. The published page runs from a Pages address, and that is what is allowed.

The page will only talk to a bridge on `127.0.0.1` or `localhost`. Any other address is refused in the Engine panel and no request is sent. Thirteen checks in `build/verify-bridge.py` cover that guard and the bridge's own two, and `build/redleg-bridge.py` proves they can fail by starting the bridge with the guards widened.

## The update path

The Engine panel's update command runs `build/bridge/update-page.mjs`. It runs `npm pack` for the version you name, bundles it with `npx --yes esbuild@0.27.7`, prints the version it is about to write, backs up the page, and rewrites the bundle block in place. With no version argument it takes the newest published release. Name the version explicitly if you want a specific one. This runs code downloaded from npm on your machine, which is the same trust you extend by installing the package at all, but it happens without a prompt, so read the command before you paste it.

## Reporting

Issues with this UI belong here. Issues with the sanitizer engine itself belong in [socprime/logtotal-sanitizer](https://github.com/socprime/logtotal-sanitizer).
