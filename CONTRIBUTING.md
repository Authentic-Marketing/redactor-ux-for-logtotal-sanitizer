# Contributing

Redactor UX is one static HTML file built from `build/ui/`. Issues with the sanitizer engine itself belong in [socprime/logtotal-sanitizer](https://github.com/socprime/logtotal-sanitizer).

## Report a bug

Use synthetic samples only. Never paste real logs, secrets or personal data into an issue. Start from one of the page's bundled samples, or write lines with `example.test` hostnames and documentation or private address ranges. Open an issue with the bug report template and give the page version and your browser.

## Propose a rule

Open an issue that names the value the rule should catch, gives synthetic lines it must redact and lines it must leave untouched, and links the source for the format. For a driver's license or plate format, follow [Changing an ID format](build/README.md#changing-an-id-format).

## Build and run the checks

Run everything from the `build` directory. Edit the page source in `build/ui/`, never in `index.html`.

```
python3 assemble.py ../index.html --public --version-json ../version.json
python3 verify.py
cd bridge && npm install @socprime/logtotal-sanitizer@0.2.0-beta.3 && cd ..
python3 verify-bridge.py
```

After a change to the driver's license or license plate rules:

```
python3 assemble.py ../index.html --public
python3 verify-id-rules.py
python3 redleg-id-rules.py
```

## Security issues

See [SECURITY.md](SECURITY.md).
