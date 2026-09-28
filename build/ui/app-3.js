
// ---------- local bridge ----------
const BRIDGE_SRC = '__BRIDGE_SRC__';
const UPDATE_SRC = '__UPDATE_SRC__';
const REGISTRY = 'https://registry.npmjs.org/@socprime%2flogtotal-sanitizer';
function pagePath() { try { if (location.protocol === 'file:') return decodeURIComponent(location.pathname); } catch (e) { /* no path */ } return ''; }
function updateCmd() { const p = pagePath(); return 'node update-page.mjs "' + (p || '/path/to/sanitizer-ui.html').replace(/"/g, '\\"') + '"'; }
async function checkUpdate() {
  const st = $('#updateStatus'); st.hidden = false; st.classList.remove('solid'); st.textContent = 'Checking'; $('#updateSetup').hidden = true;
  try {
    const r = await fetch(REGISTRY, { headers: { accept: 'application/json' }, cache: 'no-store' }); const j = await r.json();
    const latest = j['dist-tags'] && j['dist-tags'].latest; if (!latest) throw new Error('no latest tag');
    if (latest === LIB.version) { st.classList.add('solid'); st.textContent = 'Up to date'; }
    else { st.textContent = latest + ' available'; $('#updateCmd').textContent = updateCmd(); $('#updateSetup').hidden = false; }
  } catch (e) { st.textContent = 'npm unreachable'; }
  renderEngine();
}

// ---------- optional check when the page opens ----------
// Off unless the user turns it on. Kept out of the exported configuration on purpose, so importing
// someone else's config file can never switch on a network request.
const VERSION_URL = 'https://raw.githubusercontent.com/Authentic-Marketing/logtotal-sanitizer-ui/main/version.json';
const CHECK_EVERY_MS = 86400000;
const AUTO_KEY = STORE + '.autoCheck';
const LAST_KEY = STORE + '.lastCheck';
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return undefined; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
// Semver precedence, prerelease aware. 0.2.0 outranks 0.2.0-beta.9, and beta.10 outranks beta.9.
function cmpVer(a, b) {
  const split = (v) => {
    const m = String(v == null ? '' : v).trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
    return m ? { n: [+m[1], +m[2], +m[3]], p: m[4] ? m[4].split('.') : null } : null;
  };
  const x = split(a), y = split(b);
  if (!x || !y) return 0;
  for (let i = 0; i < 3; i += 1) if (x.n[i] !== y.n[i]) return x.n[i] > y.n[i] ? 1 : -1;
  if (!x.p && !y.p) return 0;
  if (!x.p) return 1;
  if (!y.p) return -1;
  for (let i = 0; i < Math.max(x.p.length, y.p.length); i += 1) {
    const u = x.p[i], v = y.p[i];
    if (u === undefined) return -1;
    if (v === undefined) return 1;
    const un = /^\d+$/.test(u), vn = /^\d+$/.test(v);
    if (un && vn) { if (+u !== +v) return +u > +v ? 1 : -1; }
    else if (un !== vn) return un ? -1 : 1;
    else if (u !== v) return u > v ? 1 : -1;
  }
  return 0;
}
function showVersionInfo(j) {
  if (!j || j.schema !== 1) return false;
  const web = j.web_app || {}, lib = j.library || {};
  const st = $('#updateStatus');
  if (cmpVer(web.version, PAGE.version) > 0 && typeof web.download_url === 'string' && web.download_url.indexOf('https://') === 0) {
    $('#newPageLink').setAttribute('href', web.download_url);
    $('#newPageSetup').hidden = false;
    st.hidden = false; st.classList.remove('solid'); st.textContent = 'Page ' + web.version + ' available';
    return true;
  }
  if (lib.name === LIB.name && cmpVer(lib.version, LIB.version) > 0) {
    $('#updateCmd').textContent = updateCmd();
    $('#updateSetup').hidden = false;
    st.hidden = false; st.classList.remove('solid'); st.textContent = lib.version + ' available';
    return true;
  }
  return false;
}
async function openCheck() {
  if (lsGet(AUTO_KEY) !== '1') return 'off';
  const now = Date.now();
  const last = Number(lsGet(LAST_KEY) || 0);
  if (last && (now - last < CHECK_EVERY_MS || last > now)) return 'throttled';
  if (!lsSet(LAST_KEY, String(now))) return 'no-storage';
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 6000);
    const r = await fetch(VERSION_URL, { cache: 'no-store', signal: c.signal, referrerPolicy: 'no-referrer' });
    clearTimeout(timer);
    if (!r.ok) return 'unavailable';
    showVersionInfo(await r.json());
  } catch (e) { return 'unavailable'; }
  return 'checked';
}
window.LogTotalSanitizerUi = {
  seededIds: () => SEEDED_IDS.slice(),
  seededRule: (id) => JSON.parse(JSON.stringify(SEEDED_RULES.find((d) => d.id === id) || null)),
  seedHash, ruleIds: () => state.rules.map((r) => ({ id: r.id, enabled: r.enabled, hash: r.kind === 'custom' ? seedHash(state.custom[r.id]) : null })),
  sanitizeAsPage: (text) => L.createSanitizer(Object.assign(buildOptions(), { report: { previewBytes: 0 } })).sanitizeText(text).output,
  declaredOrder: () => DEFAULT_ORDER.slice(),
  exportedRules: () => enabledCustom(), recipeSource: () => optionsSource(false),
  builtinCount: () => L.builtinRuleIds.length, updateCmd, cmpVer };
function wireEngine() {
  $('#bundledVersion').textContent = LIB.version + ', ' + LIB.published;
  $('#checkUpdate').addEventListener('click', checkUpdate);
  $('#autoCheck').checked = lsGet(AUTO_KEY) === '1';
  $('#autoCheck').addEventListener('change', (e) => { lsSet(AUTO_KEY, e.target.checked ? '1' : '0'); });
  $('#updateCopy').addEventListener('click', () => copy(updateCmd(), 'Copied'));
  $('#updateDownload').addEventListener('click', () => EXPORTS.update());
  $('#startCopy').addEventListener('click', () => copy($('#startCmd').textContent, 'Copied'));
  $$('input[name="engine"]').forEach((r) => r.addEventListener('change', async () => {
    if (!r.checked) return; state.engine = r.value; if (state.engine !== 'local') { stopPolling(); bridge.lost = false; } renderEngine();
    if (state.engine === 'local') await bridgeHealth();
    changed();
  }));
  $('#bridgeConnect').addEventListener('click', async () => { state.bridgeUrl = $('#bridgeUrl').value.trim() || 'http://127.0.0.1:7412'; await bridgeHealth(); changed(); });
  $('#bridgeUrl').addEventListener('change', () => { state.bridgeUrl = $('#bridgeUrl').value.trim() || 'http://127.0.0.1:7412'; bridge.ok = false; bridge.checked = false; bridge.lost = false; renderEngine(); persist(); });
  $('#bridgeDownload').addEventListener('click', () => EXPORTS.bridge());
  $('#localPanel').addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copy(b.dataset.copy, 'Copied'); });
}

// ---------- integrations ----------
function enabledCustom() { return state.rules.filter((r) => r.enabled && r.kind === 'custom').map(ruleDef); }
function enabledBuiltin() { return state.rules.filter((r) => r.enabled && r.kind === 'builtin').map((r) => r.id); }
function isDefaultRules() { return enabledBuiltin().join(',') === L.builtinRuleIds.join(',') && !enabledCustom().length; }
function js(v) { return JSON.stringify(v, null, 2); }
function optionsSource(withCustomConsts) {
  const l = [];
  l.push("  key: process.env.SANITIZER_KEY, // " + (state.keyEncoding === 'hex' ? '64 hex characters from generateKey(); keep it to correlate tokens across files' : 'passphrase; keep it to correlate tokens across files'));
  if (state.keyEncoding === 'utf8') l.push("  keyEncoding: 'utf8',");
  if (!isDefaultRules()) {
    const order = state.rules.filter((r) => r.enabled).map((r) => r.kind === 'builtin' ? "'" + r.id + "'" : (withCustomConsts ? r.id : js(ruleDef(r))));
    l.push('  rules: [' + order.join(', ') + '],');
  } else l.push('  // rules: omitted, so every built-in rule runs in the documented order');
  if (state.aggressive) l.push('  aggressive: true,');
  if (state.json === 'off') l.push('  json: false,');
  const a = state.always; if (a.values.length || a.patterns.length) l.push('  alwaysRedact: ' + js({ values: a.values, patterns: a.patterns, token: a.token, mode: a.mode }).replace(/\n/g, '\n  ') + ',');
  const n = state.never; const byRule = n.byRule.filter((e) => e.values.length);
  if (n.values.length || n.patterns.length || byRule.length) l.push('  neverRedact: ' + js({ values: n.values, patterns: n.patterns, byRule }).replace(/\n/g, '\n  ') + ',');
  const rep = {}; if (Number(state.report.contextChars) > 0) rep.contextChars = Number(state.report.contextChars); if (!state.report.replacements) rep.replacements = false; if (state.report.maxReplacementsPerRule !== '' && Number(state.report.maxReplacementsPerRule) > 0) rep.maxReplacementsPerRule = Number(state.report.maxReplacementsPerRule);
  if (Object.keys(rep).length) l.push('  report: ' + JSON.stringify(rep) + ',');
  if (Number(state.lines.maxLineChars) !== 1048576 || Number(state.lines.overlapChars) !== 1024) l.push('  lines: ' + JSON.stringify({ maxLineChars: Number(state.lines.maxLineChars), overlapChars: Number(state.lines.overlapChars) }) + ',');
  return '{\n' + l.join('\n') + '\n}';
}
function customConsts() { return enabledCustom().map((d) => 'const ' + d.id + ' = defineRule(' + js(d) + ');').join('\n\n'); }
function cliFlags(ci) {
  const f = []; const b = enabledBuiltin();
  if (b.join(',') !== L.builtinRuleIds.join(',')) f.push(b.length ? '--rules ' + b.join(',') : '--exclude-rules ' + L.builtinRuleIds.join(','));
  if (enabledCustom().length) f.push('--rules-file ./custom-rules.json');
  if (state.aggressive) f.push('--aggressive');
  if (state.always.values.length) f.push('--redact-file ./always-redact.txt');
  if (state.never.values.length) f.push('--exclude-file ./never-redact.txt');
  if (!ci) f.push('--key-file ./sanitizer.key' + (state.keyEncoding === 'utf8' ? ' --key-encoding utf8' : ''));
  if (ci) { f.push('--dry-run', '--fail-on-match', '--quiet'); }
  else { f.push('--report ./report.json --report-format json'); if (state.ci.dryRun) f.push('--dry-run'); if (state.ci.failOnMatch) f.push('--fail-on-match'); }
  return f;
}
function cliNotes() {
  const n = [];
  if (enabledCustom().length) n.push('In the CLI, --rules-file rules run after the built-ins.');
  if (state.always.patterns.length) n.push('The CLI takes always-redact values only. Patterns need the API.');
  if (state.never.patterns.length || state.never.byRule.some((e) => e.values.length)) n.push('The CLI takes never-redact values only. Patterns and per-rule allowlists need the API.');
  return n;
}
const INT = {
  install: () => ({ file: 'shell', note: 'No runtime dependencies. Node 20 or newer for the CLI.', code: [
    '# add to a project', 'npm install ' + LIB.name, '', '# or install the CLI globally', 'npm install -g ' + LIB.name, '', '# or run it once without installing', 'npx ' + LIB.name + ' ./app.log -o ./app.sanitized.log'].join('\n'),
    steps: [['1', 'Node 20 or newer', 'The CLI and Node helpers need Node.js 20+. Browsers need crypto.getRandomValues.'], ['2', 'Pick where it runs', 'Browser before an upload, CLI before a ticket, CI before a merge, or your own pipeline. No network calls.'], ['3', 'Keep the key', 'One key across files keeps tokens comparable. Rotate it to break correlation.']] }),
  cli: () => { const flags = cliFlags(false); return { file: 'shell', note: 'Referenced files come from the Export menu.' + (cliNotes().length ? ' ' + cliNotes().join(' ') : ''), code: [
    'logtotal-sanitize ./app.log -o ./app.sanitized.log \\', '  ' + flags.join(' \\\n  '), '', '# stdin to stdout', 'cat app.log | logtotal-sanitize - --stdout ' + flags.filter((x) => !x.startsWith('--report') && !x.startsWith('--dry-run')).join(' ') + ' > app.sanitized.log', '', '# correlate tokens across files: print the key once, then reuse it', 'logtotal-sanitize a.log -o a.out --print-key', 'logtotal-sanitize b.log -o b.out --key "$KEY"', '', '# exit codes: 0 ok, 1 runtime error or --fail-on-match, 2 usage error'].join('\n'),
    steps: [['--report', 'JSON or text summary', 'JSON lists every distinct value and its token. Contains originals, keep it local.'], ['--dry-run', 'Report only', 'No output written. With --fail-on-match it is a check that changes nothing.'], ['--progress', 'Live progress', 'On by default on a terminal. --quiet silences the summary.']] }; },
  node: () => ({ file: 'sanitize.mjs', note: 'ESM shown. CommonJS works the same.', code: [
    "import { createSanitizer, defineRule } from '" + LIB.name + "';", "import { sanitizeFile } from '" + LIB.name + "/node';", '',
    customConsts() ? customConsts() + '\n' : '',
    'const options = ' + optionsSource(true) + ';', '',
    '// a file on disk, streamed', "const report = await sanitizeFile({ input: './app.log', output: './app.sanitized.log', ...options });", 'console.log(report.totalMatches, report.counts);', '',
    '// in-memory text, same key, same tokens', 'const sanitizer = createSanitizer(options);', "const { output } = sanitizer.sanitizeText('user alice@example.test from 10.0.0.1');", 'console.log(output);'].join('\n'),
    steps: [['createSanitizer', 'Compile once, reuse', 'Rules compile once. Reuse the instance.'], ['defineRule', 'Validated custom rules', 'A malformed rule fails at load with a message, not as a silent miss.'], ['mergeReports', 'Concurrent parts', 'planLineAlignedRanges splits on line boundaries. mergeReports folds the reports back.']] }),
  browser: () => ({ file: 'sanitize-in-tab.js', note: 'The file is read in chunks and never leaves the tab.', code: [
    "import { createSanitizer, defineRule, fromBlob, toStringSink } from '" + LIB.name + "';", '',
    customConsts() ? customConsts() + '\n' : '',
    'const options = ' + optionsSource(true).replace('process.env.SANITIZER_KEY', 'sessionKey /* generateKey() once per session; the library never persists it */') + ';',
    'const sanitizer = createSanitizer(options);', '',
    "const picker = document.querySelector('input[type=file]');", "picker.addEventListener('change', async () => {", '  const file = picker.files[0];', '  const sink = toStringSink();', '  const report = await sanitizer.sanitizeStream(fromBlob(file), sink, {', '    onProgress: (p) => console.log(p.charsRead, p.report.totalMatches),', '  });', '  upload(sink.text);            // your transport', '  review(report.replacements);  // originals stay in this tab', '});'].join('\n'),
    steps: [['fromBlob', 'Chunked reads', 'Multi-byte characters split across a chunk boundary decode correctly.'], ['toStringSink', 'Or a stream', 'toWebStream streams output to fetch or a download.'], ['signal', 'Cancelable', 'An AbortSignal stops a run between lines.']] }),
  actions: () => { const flags = cliFlags(true); return { file: '.github/workflows/log-check.yml', note: 'Fails the job when any tracked log file needs redaction.', code: [
    'name: Fail if a secret reaches a log', 'on: [pull_request]', 'jobs:', '  sanitize-check:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: actions/setup-node@v4', '        with:', "          node-version: '20'", '      - name: Check every tracked .log file', '        run: |', '          set -e', '          status=0', "          for f in $(git ls-files '*.log'); do", '            npx --yes ' + LIB.name + ' "$f" ' + flags.join(' ') + ' || status=1', '          done', '          exit $status'].join('\n'),
    steps: [['--fail-on-match', 'Exit 1 on any match', 'With --dry-run the run changes nothing and fails the job on any match.'], ['git ls-files', 'One file per call', 'The CLI takes one input path. The loop runs per file and keeps the worst exit code.'], ['Artifacts', 'Sanitize before upload', 'For logs you keep, drop --dry-run and upload the .sanitized.log.']] }; },
  precommit: () => { const flags = cliFlags(true); return { file: '.pre-commit-config.yaml', note: 'Refuses a commit while a log file needs redaction.', code: [
    'repos:', '  - repo: local', '    hooks:', '      - id: logtotal-sanitize', '        name: Refuse log files that need redaction', '        language: system', "        files: '\\.log$'", "        entry: bash -c 'status=0; for f in \"$@\"; do npx --yes " + LIB.name + ' "$f" ' + flags.join(' ') + " || status=1; done; exit $status' --"].join('\n'),
    steps: [['language: system', 'No extra install', 'npx fetches the package on first use. Pin a version for reproducibility.'], ['files', 'Scope the hook', 'Widen the pattern if .txt or .json exports carry log data.'], ['Fixing a refusal', 'Sanitize, then commit', 'Run the CLI without --dry-run, commit the .sanitized.log, drop the original.']] }; },
  pipeline: () => ({ file: 'sanitize-stream.mjs', note: 'stdin to stdout, for any shell pipeline or shipper exec stage.', code: [
    "import { createSanitizer, defineRule } from '" + LIB.name + "';", "import { fromNodeStream, toNodeStream } from '" + LIB.name + "/node';", '',
    customConsts() ? customConsts() + '\n' : '',
    'const options = ' + optionsSource(true) + ';', '',
    'const report = await createSanitizer(options).sanitizeStream(fromNodeStream(process.stdin), toNodeStream(process.stdout));', 'process.stderr.write(`${report.totalMatches} values redacted across ${report.lineCount} lines\\n`);', '', '// usage', '//   tail -F /var/log/app.log | node sanitize-stream.mjs | your-forwarder', '//   SANITIZER_KEY=$(cat sanitizer.key) node sanitize-stream.mjs < app.log > app.sanitized.log'].join('\n'),
    steps: [['Stable tokens', 'Same key on every host', 'One key on every forwarder gives a host or user the same token everywhere.'], ['Line aware', 'Long lines bounded', 'Lines past Max line characters run in overlapping segments. Memory stays flat.'], ['Air-gapped', 'Nothing to call home', 'Zero dependencies, no network code. Vendor it where the network is closed.']] })
};
INT.bridge = () => ({ file: 'sanitizer-bridge.mjs', note: 'Loopback bridge to the installed package. Binds 127.0.0.1 only.', code: BRIDGE_SRC,
  steps: [['1', 'Install', 'npm install ' + LIB.name + ' in a folder of its own. A global install is not importable from a script. The setup line under Engine does this for you.'], ['2', 'Run', 'node sanitizer-bridge.mjs, optionally with a port. It refuses to start without the package and prints the install command.'], ['3', 'Connect', 'Under Engine, choose Local installation. The panel connects on its own and the result header reads local with the installed version.']] });
let intKey = 'install';
function renderIntegration() {
  const r = INT[intKey](); $('#intFile').textContent = r.file; $('#intNote').textContent = r.note; $('#intCode').textContent = r.code;
}
function wireIntegration() {
  $$('#integrateCard [data-int]').forEach((b) => b.addEventListener('click', () => { intKey = b.dataset.int; $$('#integrateCard [data-int]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); renderIntegration(); }));
  $('#copyInt').addEventListener('click', () => copy($('#intCode').textContent, 'Snippet copied'));
}

// ---------- samples ----------
const SAMPLES = {
  incident: { label: 'Incident export, every rule fires', text: [
    'Sep 19 10:01:02 srv-app-01 sshd[1122]: Accepted publickey for alice@example.test from 10.20.4.15 port 51522 ssh2',
    'Sep 19 10:01:05 srv-app-01 sudo: alice : TTY=pts/0 ; PWD=/home/alice/deploy ; USER=root ; COMMAND=/usr/bin/systemctl restart api',
    'Sep 19 10:02:11 srv-app-01 sshd[1140]: Failed password for invalid user admin from 203.0.113.77 port 40122 ssh2',
    'Sep 19 10:02:14 srv-app-01 sshd[1140]: Failed password for invalid user admin from 203.0.113.77 port 40122 ssh2',
    'Sep 19 10:03:40 db-primary-02 postgres[884]: connection authorized: user=svc_reporting database=ledger host=10.20.4.15',
    'Sep 19 10:04:01 srv-app-01 api[2201]: POST https://billing.internal.example.test/v2/charge Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImlhdCI6MTc1ODI3ODQwMH0.k3pT9x2mQ7vB1nL4sR8wY6uZ0aE5cD3fG2hJ9iK8lM',
    'Sep 19 10:04:02 srv-app-01 api[2201]: charge ok card=4111111111111111 exp=09/28 iban=GB82WEST12345698765432 amount=129.00',
    'Sep 19 10:04:03 srv-app-01 api[2201]: customer alice@example.test phone +1 415 555 0134 ssn 123-45-6789 geo 37.7749,-122.4194',
    'Sep 19 10:04:04 srv-app-01 api[2201]: Set-Cookie: JSESSIONID=8F1C2B3A4D5E6F70A1B2C3D4E5F60718; Path=/; HttpOnly',
    '{"ts":"2026-09-19T10:05:00Z","service":"patient-portal","patientId":"P-4482910","mrn":"4482910","diagnosis":"E11.9","icd10":"E11.9","user":"alice@example.test","clientIp":"10.20.4.15"}',
    '{"ts":"2026-09-19T10:05:07Z","service":"gateway","x-api-key":"sk_live_9f8e7d6c5b4a39281706f5e4d3c2b1a0","remoteAddr":"2001:db8:85a3::8a2e:370:7334","mac":"00:1A:2B:3C:4D:5E"}',
    'Sep 19 10:06:00 WIN-7QK2P9 winlogbeat: EventID=4624 TargetUserName=bwallace TargetDomainName=CORP IpAddress=10.20.7.31 WorkstationName=DESKTOP-4H2K1QZ',
    'Sep 19 10:06:30 srv-app-01 api[2201]: session refresh for alice@example.test from 10.20.4.15, upload from C:\\Users\\bwallace\\Downloads\\export.csv'].join('\n') },
  windows: { label: 'Windows Security events, JSON lines', text: [
    '{"EventID":4624,"TimeCreated":"2026-09-19T09:12:04Z","Computer":"WIN-7QK2P9.corp.example.test","SubjectUserName":"SYSTEM","TargetUserName":"bwallace","TargetDomainName":"CORP","LogonType":10,"IpAddress":"10.20.7.31","WorkstationName":"DESKTOP-4H2K1QZ"}',
    '{"EventID":4625,"TimeCreated":"2026-09-19T09:12:41Z","Computer":"WIN-7QK2P9.corp.example.test","TargetUserName":"svc_backup","TargetDomainName":"CORP","Status":"0xC000006D","IpAddress":"203.0.113.9","WorkstationName":"KALI-01"}',
    '{"EventID":4688,"TimeCreated":"2026-09-19T09:13:10Z","Computer":"DC01.corp.example.test","SubjectUserName":"bwallace","SubjectDomainName":"CORP","NewProcessName":"C:\\\\Windows\\\\System32\\\\cmd.exe","CommandLine":"cmd.exe /c whoami","ParentProcessName":"C:\\\\Windows\\\\explorer.exe"}',
    '{"EventID":4720,"TimeCreated":"2026-09-19T09:14:22Z","Computer":"DC01.corp.example.test","SubjectUserName":"bwallace","TargetUserName":"helpdesk2","TargetSid":"S-1-5-21-3623811015-3361044348-30300820-1013","SamAccountName":"helpdesk2","UserPrincipalName":"helpdesk2@corp.example.test"}',
    '{"EventID":4624,"TimeCreated":"2026-09-19T09:15:03Z","Computer":"FS02.corp.example.test","TargetUserName":"bwallace","TargetDomainName":"CORP","LogonType":3,"IpAddress":"10.20.7.31","WorkstationName":"DESKTOP-4H2K1QZ"}'].join('\n') },
  api: { label: 'API gateway, JSON lines with credentials', text: [
    '{"ts":"2026-09-19T11:00:01Z","level":"info","msg":"request","method":"POST","path":"/v1/login","email":"dana.reyes@example.test","clientIp":"198.51.100.24","userAgent":"Mozilla/5.0"}',
    '{"ts":"2026-09-19T11:00:01Z","level":"debug","msg":"upstream","headers":{"authorization":"Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImsxIn0.eyJzdWIiOiJkYW5hIiwiZXhwIjoxNzU4Mjc4NDAwfQ.Q2xhaW1zU2lnbmF0dXJlRmFrZUJ1dFNoYXBlZExpa2VBUlNBU2lnbmF0dXJlMTIzNDU2Nzg5MA","x-api-key":"sk_live_9f8e7d6c5b4a39281706f5e4d3c2b1a0"}}',
    '{"ts":"2026-09-19T11:00:02Z","level":"info","msg":"session issued","sessionId":"b2f7c1e94a6d4f0e8c3a1b5d7e9f2a4c","email":"dana.reyes@example.test","phone":"+44 20 7946 0958"}',
    '{"ts":"2026-09-19T11:00:09Z","level":"warn","msg":"payment retry","cardNumber":"5555555555554444","cvv":"123","expiryDate":"11/27","accountNumber":"12345678","routingNumber":"021000021"}',
    '{"ts":"2026-09-19T11:00:15Z","level":"error","msg":"aws call failed","awsSecretAccessKey":"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY","region":"eu-west-1","actor":"arn:aws:iam::123456789012:user/dana"}',
    '{"ts":"2026-09-19T11:00:20Z","level":"info","msg":"request","method":"GET","path":"/v1/me","email":"dana.reyes@example.test","clientIp":"198.51.100.24","sessionId":"b2f7c1e94a6d4f0e8c3a1b5d7e9f2a4c"}'].join('\n') },
  k8s: { label: 'Kubernetes ingress and pod logs', text: [
    '10.244.1.17 - - [19/Sep/2026:12:30:01 +0000] "GET /api/orders?token=eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjQ0MjF9.b0dyRmFrZVNpZ25hdHVyZUZvckRlbW9Pbmx5MTIzNA HTTP/1.1" 200 812 "-" "curl/8.4.0" host=shop.example.test',
    '10.244.1.17 - - [19/Sep/2026:12:30:02 +0000] "POST /api/checkout HTTP/1.1" 500 0 "-" "curl/8.4.0" host=shop.example.test upstream=pod-checkout-7d9f8-x2k1q:8080',
    'I0919 12:30:02.114 pod-checkout-7d9f8-x2k1q checkout: db connect user=svc_checkout host=db-primary-02.internal.example.test port=5432',
    'I0919 12:30:02.118 pod-checkout-7d9f8-x2k1q checkout: SMTP relay mail.example.test from noreply@example.test to jordan.lee@example.test',
    'W0919 12:30:05.220 node-worker-03 kubelet: pod pod-checkout-7d9f8-x2k1q restarting, node IP 192.0.2.44, iface mac 3c:22:fb:9a:1e:07',
    'E0919 12:30:06.001 pod-checkout-7d9f8-x2k1q checkout: panic at /home/jordan/src/checkout/main.go:118 request from 2001:db8::1'].join('\n') },
  cef: { label: 'Firewall and EDR, CEF', text: [
    'CEF:0|Example|NGFW|9.1|100|Traffic allowed|3|src=10.20.4.15 spt=51522 dst=203.0.113.77 dpt=443 suser=alice@example.test shost=srv-app-01 dhost=cdn.example.test proto=TCP',
    'CEF:0|Example|NGFW|9.1|200|Traffic denied|7|src=203.0.113.77 spt=40122 dst=10.20.4.15 dpt=22 shost=KALI-01 dhost=srv-app-01 proto=TCP cs1=brute-force cs1Label=signature',
    'CEF:0|Example|EDR|4.2|300|Credential access|9|suser=CORP\\\\bwallace shost=DESKTOP-4H2K1QZ fname=lsass.dmp filePath=C:\\\\Users\\\\bwallace\\\\AppData\\\\Local\\\\Temp\\\\lsass.dmp dhost=DC01.corp.example.test',
    'CEF:0|Example|EDR|4.2|301|Outbound beacon|8|src=10.20.7.31 dst=198.51.100.200 dpt=8443 shost=DESKTOP-4H2K1QZ suser=CORP\\\\bwallace request=https://198.51.100.200/gate.php?id=4H2K1',
    'CEF:0|Example|NGFW|9.1|100|Traffic allowed|3|src=10.20.4.15 spt=51530 dst=203.0.113.77 dpt=443 suser=alice@example.test shost=srv-app-01 dhost=cdn.example.test proto=TCP'].join('\n') },
  ids: { label: 'Identity and vehicle records', text: [
    'Sep 28 09:14:02 intake-01 dmv[3301]: applicant verified, Driver License: D1234567 state=CA',
    'Sep 28 09:14:03 intake-01 dmv[3301]: renewal queued for FL A123-456-78-901-0',
    '{"ts":"2026-09-28T09:14:05Z","service":"parking","license_plate":"8ABC123","plate_state":"CA","gate":"B2"}',
    'Sep 28 09:14:07 cam-03 alpr[811]: ALPR hit: 7XYZ123 lane 2 confidence 0.97',
    'Sep 28 09:14:09 kiosk-2 pdf417[77]: DCSSAMPLE DACALEX DAQD1234567',
    'Sep 28 09:15:00 valet-1 tickets[45]: car 6DEF456 parked, holder B7654321 on file',
    'Sep 28 09:15:02 runner-4 ci[902]: OPS-1234 fixed in release 4.2, DL: 150.2 Mbps UL: 50.1 Mbps',
    'Sep 28 09:15:04 bmc-7 sensors[12]: VRM: OK, fan 3 at 4200 rpm'].join('\n') }
};
function loadSample(id) {
  const s = SAMPLES[id]; if (!s) return;
  setFile(null); $('#inputText').value = s.text; updateInputMeta(); $('#sampleSel').value = id;
  clearTimeout(runTimer); run();
}

// ---------- page chrome ----------
function applyTheme(t) { document.documentElement.dataset.theme = t; $('#themeBtn').innerHTML = (t === 'dark' ? 'Light' : 'Dark') + '<span class="l"> theme</span>'; $('#themeBtn').setAttribute('aria-label', t === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'); }
function initTheme() {
  let t = null; try { t = localStorage.getItem(STORE + '.theme'); } catch (e) { /* no storage */ }
  if (t !== 'dark' && t !== 'light') t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(t);
  $('#themeBtn').addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(n); try { localStorage.setItem(STORE + '.theme', n); } catch (e) { /* no storage */ } });
}
function initNet() {
  const upd = () => { const entries = performance.getEntriesByType('resource'); netCount = entries.length; netExternal = entries.filter((e) => !/^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(e.name)).length; if (engineActive() === 'bundled') renderEngine(); };
  upd(); window.addEventListener('load', upd);
  try { new PerformanceObserver(upd).observe({ type: 'resource', buffered: true }); } catch (e) { /* observer unsupported */ }
}
function wireChrome() {
  $$('.viewtabs [data-view]').forEach((b) => b.addEventListener('click', () => { document.body.dataset.view = b.dataset.view; $$('.viewtabs [data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
  $$('#resultTabs [role="tab"]').forEach((b) => b.addEventListener('click', () => selectTab(b.id)));
  const card = $('#inputCard'); let depth = 0;
  card.addEventListener('dragenter', (e) => { e.preventDefault(); depth += 1; card.classList.add('over'); });
  card.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  card.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) card.classList.remove('over'); });
  card.addEventListener('drop', async (e) => { e.preventDefault(); depth = 0; card.classList.remove('over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) await importFile(f); });
  const ta = $('#inputText');
  ta.addEventListener('input', () => { updateInputMeta(); scheduleRun(); });
  ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); clearTimeout(runTimer); run(); } });
  $('#openFile').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) await importFile(f); e.target.value = ''; });
  $('#clearInput').addEventListener('click', () => { setFile(null); ta.value = ''; updateInputMeta(); last = null; renderResults(); ta.focus(); });
  $('#srcRemove').addEventListener('click', () => { if (abort) abort.abort(); setFile(null); });
  $('#runBtn').addEventListener('click', () => { clearTimeout(runTimer); run(); });
  $('#stopBtn').addEventListener('click', () => { if (abort) abort.abort(); });
  const sel = $('#sampleSel'); sel.replaceChildren(...Object.keys(SAMPLES).map((k) => { const o = document.createElement('option'); o.value = k; o.textContent = SAMPLES[k].label; return o; }));
  $('#loadSample').addEventListener('click', () => loadSample(sel.value));
  $('#emptySample').addEventListener('click', () => loadSample('incident'));
  $('#libLine').textContent = LIB.name + ' ' + LIB.version + ', published to npm ' + LIB.published + ', bundled in this page';
}

// ---------- init ----------
function init() {
  if (!L) { document.body.innerHTML = '<p style="padding:24px">The bundled library failed to load.</p>'; return; }
  wireRules(); wireEditor(); wireControls(); wirePanes(); wireImportExport(); wireIntegration(); wireEngine(); wireChrome(); initTheme(); initNet();
  syncControls();
  restore();
  renderEngine(); renderIntegration();
  if (!$('#inputText').value) loadSample('incident'); else run();
  updateInputMeta();
  if (state.engine === 'local') bridgeHealth().then((ok) => { if (ok) run(); });
  openCheck().then((r) => { document.body.dataset.openCheck = r; });
}
init();
})();
