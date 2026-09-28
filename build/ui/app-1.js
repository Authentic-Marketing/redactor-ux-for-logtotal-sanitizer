(function () {
'use strict';
const L = window.LogTotalSanitizer;
const LIB = { name: '@socprime/logtotal-sanitizer', version: '0.2.0-beta.3', published: '2026-09-23' };
// This page's own version, independent of the library it bundles. update-page.mjs swaps the
// library and never touches this, so the two are compared separately and can differ legitimately.
const PAGE = { version: '1.2.2' };
const STORE = 'logtotal-sanitizer-ui.v1';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtBytes = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const fmtInt = (n) => Number(n).toLocaleString('en-US');

// Plain-language notes for the built-in rules, derived from the package README.
const NOTES = {
  secrets: 'Bearer and JWT tokens, API keys, cloud credentials, and JSON fields such as password, token and secret. Aggressive: high-entropy hex and base64 blobs.',
  sessionCookies: 'Session cookies: sessionid, sid, JSESSIONID, PHPSESSID.',
  paymentInfo: 'Card numbers (Luhn-checked), IBANs (mod-97), CVV and expiry fields, crypto addresses.',
  govIds: 'SSNs, passport, tax and national identifiers.',
  healthInfo: 'Health-record identifiers and context-anchored medical codes (ICD, SNOMED, LOINC, NDC, DEA, MRN), mostly via JSON field names.',
  phoneNumbers: 'International and national phone numbers.',
  ips: 'IPv4, IPv6, MAC addresses and reverse-DNS names.',
  hosts: 'Hostnames and FQDNs, including the syslog host field. Aggressive: WIN- and DESKTOP- NetBIOS names and srv-, web-, db- inventory names.',
  users: 'Usernames, emails, DOMAIN\\user, SIDs, ARNs and LDAP DNs.',
  geoLocation: 'Coordinates, geohashes, plus codes, postcodes and context-anchored addresses.',
  paths: 'The username in home-directory paths. The rest of the path stays readable.'
};

// ---------- state ----------
// Rules the page ships with. DEFAULT_ORDER below sets where they run; a builtin earlier in
// that order wins a tie, which is why vendor hostnames belong to the Hostnames rule.
// Key prefixes verified 2026-09-23 on each vendor's own page. Crypto patterns verified
// 2026-09-23 against upstream test vectors (BIP173/350/352, BOLT11/12, ERC-55, SEP-23,
// ZIP-320, Bitcoin Core, Dogecoin, Litecoin and CashTokens test data), the list and sources
// in the build record's rules-expansion-2026-09-23/SPEC.md. Chains follow the CoinGecko
// top 20 by market cap read 2026-09-23T20:12Z. ICAP is left out: an IBAN-shaped ICAP is
// claimed and rejected by the payment rule before this rule runs.
const SEEDED_RULES = [
  {
    "id": "agent_apis",
    "label": "LLM APIs",
    "description": "Keys for the model vendors: OpenAI, Anthropic, Google, xAI Grok, Perplexity, Azure OpenAI, GitHub Copilot, OpenRouter, Groq, Hugging Face, Replicate and Fireworks. Vendor hostnames are left to the Hostnames rule.",
    "mode": "mask",
    "token": "LLMAPI",
    "patterns": [
      "\\bsk-ant-(?:api|admin)\\d{2}-[A-Za-z0-9_-]{80,140}\\b",
      "\\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,120}T3BlbkFJ[A-Za-z0-9_-]{20,120}\\b",
      "\\bsk-[A-Za-z0-9]{48}\\b",
      "\\bAIza[0-9A-Za-z_-]{35}\\b",
      "\\bAQ\\.[A-Za-z0-9_-]{20,}",
      "\\bxai-[A-Za-z0-9]{80}\\b",
      "\\bpplx-[A-Za-z0-9]{48,56}\\b",
      "\\bgh[osu]_[0-9a-zA-Z]{36}\\b",
      "\\bgithub_pat_[0-9a-zA-Z_]{82}\\b",
      "[Aa][Pp][Ii]-[Kk][Ee][Yy]\\s*[:=]\\s*\"?([0-9a-fA-F]{32})\\b",
      "\\bsk-or-v1-[A-Za-z0-9_-]{20,}",
      "\\bgsk_[A-Za-z0-9]{20,}\\b",
      "\\bhf_[A-Za-z0-9]{20,}\\b",
      "\\br8_[A-Za-z0-9]{37}\\b",
      "\\bfw_(?=[A-Za-z0-9]*\\d)(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]{20,64}\\b"
    ]
  },
  {
    "id": "crypto_addresses",
    "label": "Cryptocurrency addresses",
    "description": "Bitcoin (legacy, P2SH, SegWit and Taproot on every network, silent payments, Lightning), Ethereum and every EVM chain (plus ENS names), Tron, XRP, Solana, Dogecoin, Cardano, Litecoin, TON, Monero, Zcash, Stellar, Bitcoin Cash, Provenance and BNB Beacon: the CoinGecko top 20 by market cap on 2026-09-23 and the tokens issued on them.",
    "mode": "pseudo",
    "token": "CRYPTO",
    "patterns": [
      "\\b(?:bc|tb)1[qp][a-z0-9]{38,58}\\b",
      "\\b[13](?=[a-km-zA-HJ-NP-Z1-9]*[1-9])[a-km-zA-HJ-NP-Z1-9]{25,34}\\b",
      "\\b0x[0-9a-fA-F]{40}\\b",
      "\\bT(?=[a-km-zA-HJ-NP-Z1-9]*[1-9])[a-km-zA-HJ-NP-Z1-9]{33}\\b",
      "\\br(?=[a-km-zA-HJ-NP-Z1-9]*[1-9])[a-km-zA-HJ-NP-Z1-9]{24,34}\\b",
      "\\bX(?=[a-km-zA-HJ-NP-Z1-9]*[1-9])[a-km-zA-HJ-NP-Z1-9]{46}\\b",
      "\\b(?=[a-km-zA-HJ-NP-Z1-9]*[1-9])(?=[a-km-zA-HJ-NP-Z1-9]*[a-z])(?=[a-km-zA-HJ-NP-Z1-9]*[A-Z])[a-km-zA-HJ-NP-Z1-9]{43,44}\\b",
      "\\bD[5-9A-HJ-NP-U][a-km-zA-HJ-NP-Z1-9]{32}\\b",
      "\\baddr(?:_test)?1[a-z0-9]{53,98}\\b",
      "\\bstake(?:_test)?1[a-z0-9]{53}\\b",
      "\\b(?:Ae2|DdzFF)[a-km-zA-HJ-NP-Z1-9]{50,110}\\b",
      "\\bltc1[a-z0-9]{38,58}\\b",
      "\\b[LM](?=[a-km-zA-HJ-NP-Z1-9]*[1-9])[a-km-zA-HJ-NP-Z1-9]{26,33}\\b",
      "\\b(?:EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}\\b",
      "\\b[48][a-km-zA-HJ-NP-Z1-9]{94}\\b",
      "\\b4[a-km-zA-HJ-NP-Z1-9]{105}\\b",
      "\\b(?:bc|tb|bcrt)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{8,87}\\b",
      "\\b(?:BC|TB|BCRT)1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{8,87}\\b",
      "\\b[mn2](?=[a-km-zA-HJ-NP-Z1-9]*[1-9])(?=[a-km-zA-HJ-NP-Z1-9]*[a-z])(?=[a-km-zA-HJ-NP-Z1-9]*[A-Z])[a-km-zA-HJ-NP-Z1-9]{25,34}\\b",
      "\\bt?sp1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{100,}\\b",
      "\\bln(?:bc|tb|bcrt|tbs)\\d*[munp]?1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{50,}\\b",
      "\\bln[oir]1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{20,}\\b",
      "\\b(?:bitcoincash|bchtest|bchreg):[qpzr][qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41,}\\b",
      "\\b[qpzr](?=[qpzry9x8gf2tvdw0s3jn54khce6mua7l]*\\d)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{41}\\b",
      "(?<![A-Za-z0-9_.-])(?:[a-z0-9-]{1,63}\\.){0,8}[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.eth(?![\\w-]|\\.[A-Za-z0-9])",
      "\\bG[A-Z2-7]{55}\\b",
      "\\bM[A-Z2-7]{68}\\b",
      "\\bC[A-Z2-7]{55}\\b",
      "\\bltcmweb1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{100,}\\b",
      "\\bt[13m2](?=[a-km-zA-HJ-NP-Z1-9]*[1-9])(?=[a-km-zA-HJ-NP-Z1-9]*[a-z])(?=[a-km-zA-HJ-NP-Z1-9]*[A-Z])[a-km-zA-HJ-NP-Z1-9]{33}\\b",
      "\\bz(?:s|testsapling)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{75}\\b",
      "\\bu(?:test)?1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{100,}\\b",
      "\\btex1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}\\b",
      "\\bz[ct][a-km-zA-HJ-NP-Z1-9]{93}\\b",
      "\\b[9A](?=[a-km-zA-HJ-NP-Z1-9]*[1-9])(?=[a-km-zA-HJ-NP-Z1-9]*[a-z])(?=[a-km-zA-HJ-NP-Z1-9]*[A-Z])[a-km-zA-HJ-NP-Z1-9]{33}\\b",
      "\\b(?:pb|tp)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,58}\\b",
      "\\bt?bnb1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}\\b"
    ],
    "jsonKeyContains": [
      "btc_addr",
      "bitcoin_addr",
      "btcaddress",
      "bitcoinaddress",
      "eth_addr",
      "evm_addr",
      "ethaddress",
      "erc20",
      "bep20",
      "contract_addr",
      "tron_addr",
      "trx_addr",
      "trc20",
      "xrp_addr",
      "ripple_addr",
      "xrpaddress",
      "sol_addr",
      "solana_addr",
      "spl_addr",
      "doge_addr",
      "dogecoin_addr",
      "ada_addr",
      "cardano_addr",
      "ltc_addr",
      "litecoin_addr",
      "ton_addr",
      "ton_wallet",
      "xmr_addr",
      "monero_addr",
      "zec_addr",
      "zcash_addr",
      "xlm_addr",
      "stellar_addr",
      "bch_addr",
      "cashaddr",
      "ens_name",
      "ln_invoice"
    ]
  }
];
// A content hash of the stored form of a seed, so any change to a shipped rule refreshes a
// saved configuration, and a reader's own edit to a seed can be told apart from an old build.
function seedHash(d) {
  const s = JSON.stringify(materialize(d)); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
const SEED_VERSION = SEEDED_RULES.map((d) => d.id + ':' + seedHash(d)).join('|');
// Every seed id this page ever shipped and later dropped, read from git history 2026-09-23.
// Only these are removed on refresh; a reader's own rule is never matched by name prefix.
const RETIRED_SEED_IDS = ['crypto_bitcoin', 'crypto_evm', 'crypto_tron', 'crypto_xrp', 'crypto_solana', 'crypto_dogecoin', 'crypto_cardano', 'crypto_litecoin', 'crypto_ton', 'crypto_monero', 'stablecoins'];
// seedHash of every seed definition in every shipped version (28 versions in git history,
// read 2026-09-23). A stored seed matching none of these was edited by the reader.
const SHIPPED_SEED_HASHES = ['9236c193', '4857a8a5', '2031fe49', '27fc3acf', '34758dc3', 'bc200c61', 'df1ccb90', '6f9c7e5b', '63d4a3bc', 'a72116e0', '91204586', '9872ce54', 'b432cafa', '9968abe3', '95b32ec7', '28a1a862', '9b7f244e', '868ccfeb'];
// What a masked rule shows in its chip. Plain 'mask' says only how the value is replaced,
// not what was replaced, which is the thing a reader scanning the list wants. Keyed by
// rule id so it works for a builtin too, and kept out of the rule itself so an export
// and re-import cannot lose it.
const CHIP_LABELS = { agent_apis: 'keys', healthInfo: 'PHI', paymentInfo: 'PMT', paths: 'users', govIds: 'GOV', secrets: 'token', sessionCookies: 'cookie' };
const DEFAULT_ORDER = ["ips", "geoLocation", "paths", "secrets", "hosts", "sessionCookies", "users", "healthInfo", "paymentInfo", "crypto_addresses", "govIds", "phoneNumbers", "agent_apis"];
const SEEDED_IDS = SEEDED_RULES.map((d) => d.id);
function defineSeeded() {
  SEEDED_RULES.forEach((d) => { try { L.defineRule(d); } catch (e) { /* a bad seed must not stop the page */ } });
}
function seededCustom() {
  const out = {};
  SEEDED_RULES.forEach((d) => {
    out[d.id] = Object.assign({ aggressivePatterns: [], jsonKeys: [], jsonKeyContains: [], token: '' }, d);
  });
  return out;
}
function defaultState() {
  defineSeeded();
  return {
    // Initial order set by JJ 2026-09-22. Anything not named here is appended, so a
    // library update that adds a builtin cannot silently vanish from the list.
    rules: DEFAULT_ORDER.filter((id) => SEEDED_IDS.includes(id) || L.builtinRuleIds.includes(id))
      .map((id) => ({ id, enabled: true, kind: SEEDED_IDS.includes(id) ? 'custom' : 'builtin' }))
      .concat(SEEDED_IDS.filter((id) => !DEFAULT_ORDER.includes(id)).map((id) => ({ id, enabled: true, kind: 'custom' })))
      .concat(L.builtinRuleIds.filter((id) => !DEFAULT_ORDER.includes(id)).map((id) => ({ id, enabled: true, kind: 'builtin' }))),
    custom: seededCustom(),
    aggressive: false,
    json: 'auto',
    keyEncoding: 'hex',
    always: { values: [], patterns: [], token: 'CUSTOM', mode: 'pseudo' },
    never: { values: [], patterns: [], byRule: [] },
    report: { contextChars: 24, maxReplacementsPerRule: '', replacements: true, previewBytes: 262144 },
    lines: { maxLineChars: 1048576, overlapChars: 1024 },
    ci: { failOnMatch: false, dryRun: false },
    engine: 'bundled',
    bridgeUrl: 'http://127.0.0.1:7412'
  };
}
let state = defaultState();
let key = L.generateKey();
let last = null;
let srcFile = null;
let abort = null;
let pinned = null;
let editingId = null;
let runTimer = null;
const bridge = { ok: false, checked: false, lost: false, version: null, node: null, maxBytes: 0 };
let poll = null;
let netCount = 0, netExternal = 0;

// ---------- helpers ----------
const lines = (s) => String(s || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const csv = (s) => String(s || '').split(',').map((l) => l.trim()).filter(Boolean);
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
function download(name, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); toast((label || 'Copied') + ' to clipboard'); }
  catch (e) { toast('Clipboard blocked. Select and copy the text.'); }
}
function showErr(el, msg) { el.innerHTML = msg ? '<b>Error.</b> ' + esc(msg) : ''; el.classList.toggle('show', Boolean(msg)); }
function errMessage(e) { return (e && e.message) ? e.message : String(e); }

function ruleInfo(r) {
  if (r.kind === 'builtin') {
    const b = L.getBuiltinRule(r.id);
    return { label: b.label, mode: b.mode, token: b.token || r.id.toUpperCase(), note: NOTES[r.id] || '', keys: (b.jsonKeys || []).concat((b.jsonKeyContains || []).map((k) => '*' + k + '*')), custom: false };
  }
  const c = state.custom[r.id] || { label: r.id, mode: 'pseudo', patterns: [] };
  return { label: c.label || r.id, mode: c.mode || 'pseudo', token: c.token || r.id.toUpperCase(), note: c.description || '', keys: (c.jsonKeys || []).concat((c.jsonKeyContains || []).map((k) => '*' + k + '*')), custom: true };
}
function materialize(def) {
  const out = { id: def.id, label: def.label || def.id, description: def.description || def.label || def.id, mode: def.mode || 'pseudo', patterns: def.patterns.slice() };
  if (out.mode === 'pseudo' && def.token) out.token = def.token;
  if (def.aggressivePatterns && def.aggressivePatterns.length) out.aggressivePatterns = def.aggressivePatterns.slice();
  if (def.jsonKeys && def.jsonKeys.length) out.jsonKeys = def.jsonKeys.slice();
  if (def.jsonKeyContains && def.jsonKeyContains.length) out.jsonKeyContains = def.jsonKeyContains.slice();
  return out;
}
function buildOptions(plain) {
  const rules = state.rules.filter((r) => r.enabled).map((r) => r.kind === 'builtin' ? r.id : (plain ? materialize(state.custom[r.id]) : L.defineRule(materialize(state.custom[r.id]))));
  const o = {
    rules, aggressive: state.aggressive, key, keyEncoding: state.keyEncoding,
    json: state.json === 'off' ? false : 'auto',
    report: { contextChars: Number(state.report.contextChars) || 0, replacements: Boolean(state.report.replacements), previewBytes: Math.max(0, Number(state.report.previewBytes) || 0) },
    lines: { maxLineChars: Math.max(1, Number(state.lines.maxLineChars) || 1048576), overlapChars: Math.max(0, Number(state.lines.overlapChars) || 0) }
  };
  if (state.report.maxReplacementsPerRule !== '' && Number(state.report.maxReplacementsPerRule) > 0) o.report.maxReplacementsPerRule = Number(state.report.maxReplacementsPerRule);
  const a = state.always;
  if (a.values.length || a.patterns.length) o.alwaysRedact = { values: a.values, patterns: a.patterns, token: a.token || 'CUSTOM', mode: a.mode || 'pseudo' };
  const n = state.never; const byRule = n.byRule.filter((e) => e.values.length);
  if (n.values.length || n.patterns.length || byRule.length) o.neverRedact = { values: n.values, patterns: n.patterns, byRule };
  return o;
}

// ---------- rules list ----------
// Hand-inlined Lucide paths, 16 px, stroke 1.75, currentColor: grip-vertical, chevron-up, chevron-down, info.
// The kind slot reads in words: mask for a mask-mode rule, and for a pseudo-mode one the token
// prefix the sanitized output actually carries (IP, HOST, PHONE, USER, GEO and the rest). The
// title text is unchanged, so the hover still names the mode itself. One slot, never two: a
// second slot beside a long custom token leaves the name column narrower than its widest word
// and the two run into each other, so custom is said in the row's own detail instead.
const RULE_GLYPH = {
  grip: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
};
function ruleGlyph(name) {
  return '<svg class="ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"' +
    ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    RULE_GLYPH[name] + '</svg>';
}
function renderRules() {
  const ol = $('#ruleList'); ol.replaceChildren();
  state.rules.forEach((r, i) => {
    const info = ruleInfo(r);
    const li = document.createElement('li');
    li.className = 'rule' + (r.enabled ? '' : ' off'); li.draggable = true; li.dataset.id = r.id;
    li.innerHTML =
      '<div class="rule-row">' +
        '<span class="grip" aria-hidden="true">' + ruleGlyph('grip') + '</span>' +
        '<label class="switch"><input type="checkbox" data-act="toggle" aria-label="' + esc(info.label) + '"' + (r.enabled ? ' checked' : '') + '><span class="sw"></span>' +
          '<span class="rule-name" title="' + esc(info.label) + '">' + esc(info.label) + '</span></label>' +
        '<div class="rule-meta">' +
          '<span class="rule-kind" title="' + (info.mode === 'mask' ? 'mask mode: neutral R prefix' : 'pseudo mode: type prefix kept') + '">' + esc(info.mode === 'mask' ? (CHIP_LABELS[r.id] || 'mask') : info.token) + '</span>' +
          '<div class="rule-acts">' +
            '<button class="btn" type="button" data-act="up" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>' + ruleGlyph('up') + '</button>' +
            '<button class="btn" type="button" data-act="down" aria-label="Move down"' + (i === state.rules.length - 1 ? ' disabled' : '') + '>' + ruleGlyph('down') + '</button>' +
            '<button class="btn" type="button" data-act="info" aria-expanded="false" aria-label="Details">' + ruleGlyph('info') + '</button>' +
          '</div></div></div>' +
      '<div class="rule-detail" hidden>' +
        '<p>' + esc(info.note || 'No description.') + '</p>' +
        '<p class="small mut">Priority ' + (i + 1) + ' of ' + state.rules.length + '. Mode <b>' + info.mode + '</b>. Token <code>&lt;' + esc(info.mode === 'mask' ? 'R' : info.token) + ':&hellip;&gt;</code>. Rule id <code>' + esc(r.id) + '</code>.' + (info.custom ? ' Custom rule.' : '') + '</p>' +
        (info.keys.length ? '<p class="keys">JSON keys: ' + esc(info.keys.join(', ')) + '</p>' : '') +
        (info.custom ? '<div class="acts"><button class="btn sm" type="button" data-act="edit">Edit</button><button class="btn sm ghost" type="button" data-act="delete">Delete</button></div>' : '') +
      '</div>';
    ol.appendChild(li);
  });
  $('#rulesOn').textContent = state.rules.filter((r) => r.enabled).length;
  renderNeverRuleSelect();
}
function moveRule(id, delta) {
  const i = state.rules.findIndex((r) => r.id === id); const j = i + delta;
  if (i < 0 || j < 0 || j >= state.rules.length) return;
  const [r] = state.rules.splice(i, 1); state.rules.splice(j, 0, r);
  renderRules(); changed();
}
function placeRule(id, beforeId) {
  const i = state.rules.findIndex((r) => r.id === id); if (i < 0) return;
  const [r] = state.rules.splice(i, 1);
  const j = beforeId ? state.rules.findIndex((x) => x.id === beforeId) : state.rules.length;
  state.rules.splice(j < 0 ? state.rules.length : j, 0, r);
  renderRules(); changed();
}
let dragId = null;
function wireRules() {
  const ol = $('#ruleList');
  ol.addEventListener('change', (e) => {
    const li = e.target.closest('.rule'); if (!li || e.target.dataset.act !== 'toggle') return;
    const r = state.rules.find((x) => x.id === li.dataset.id); r.enabled = e.target.checked;
    li.classList.toggle('off', !r.enabled); $('#rulesOn').textContent = state.rules.filter((x) => x.enabled).length; changed();
  });
  ol.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]'); if (!btn) return;
    const li = btn.closest('.rule'); const id = li.dataset.id; const act = btn.dataset.act;
    if (act === 'up') moveRule(id, -1);
    else if (act === 'down') moveRule(id, 1);
    else if (act === 'info') { const d = $('.rule-detail', li); d.hidden = !d.hidden; btn.setAttribute('aria-expanded', String(!d.hidden)); }
    else if (act === 'edit') openEditor(id);
    else if (act === 'delete') { delete state.custom[id]; state.rules = state.rules.filter((r) => r.id !== id); renderRules(); changed(); toast('Rule deleted'); }
  });
  ol.addEventListener('dragstart', (e) => { const li = e.target.closest('.rule'); if (!li) return; dragId = li.dataset.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {} });
  ol.addEventListener('dragend', () => { dragId = null; $$('.rule', ol).forEach((li) => li.classList.remove('dragging', 'drag-over')); });
  ol.addEventListener('dragover', (e) => { const li = e.target.closest('.rule'); if (!li || !dragId || li.dataset.id === dragId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; $$('.rule', ol).forEach((x) => x.classList.toggle('drag-over', x === li)); });
  ol.addEventListener('drop', (e) => {
    const li = e.target.closest('.rule'); if (!li || !dragId) return; e.preventDefault();
    const rect = li.getBoundingClientRect(); const after = e.clientY > rect.top + rect.height / 2;
    const idx = state.rules.findIndex((r) => r.id === li.dataset.id);
    const beforeId = after ? (state.rules[idx + 1] ? state.rules[idx + 1].id : null) : li.dataset.id;
    placeRule(dragId, beforeId);
  });
  $('#resetOrder').addEventListener('click', () => {
    const customs = state.rules.filter((r) => r.kind === 'custom');
    state.rules = L.builtinRuleIds.map((id) => { const old = state.rules.find((r) => r.id === id); return { id, enabled: old ? old.enabled : true, kind: 'builtin' }; }).concat(customs);
    renderRules(); changed();
  });
}

// ---------- custom rule editor ----------
function openEditor(id) {
  const f = $('#ruleEditor'); f.hidden = false; editingId = id || null;
  const d = id ? state.custom[id] : { id: '', label: '', description: '', mode: 'pseudo', token: '', patterns: [], aggressivePatterns: [], jsonKeys: [], jsonKeyContains: [] };
  $('#rf-title').textContent = id ? 'Edit custom rule' : 'New custom rule';
  $('#rf-id').value = d.id; $('#rf-id').disabled = Boolean(id);
  $('#rf-label').value = d.label || ''; $('#rf-desc').value = d.description || '';
  $('#rf-mode').value = d.mode || 'pseudo'; $('#rf-token').value = d.token || '';
  $('#rf-patterns').value = (d.patterns || []).join('\n'); $('#rf-aggr').value = (d.aggressivePatterns || []).join('\n');
  $('#rf-jsonKeys').value = (d.jsonKeys || []).join(', '); $('#rf-jsonContains').value = (d.jsonKeyContains || []).join(', ');
  showErr($('#rf-err'), ''); $('#rf-testOut').textContent = '';
  $('#rf-id').focus();
}
function readEditor() {
  return {
    id: $('#rf-id').value.trim(), label: $('#rf-label').value.trim(), description: $('#rf-desc').value.trim(),
    mode: $('#rf-mode').value, token: $('#rf-token').value.trim().toUpperCase(),
    patterns: lines($('#rf-patterns').value), aggressivePatterns: lines($('#rf-aggr').value),
    jsonKeys: csv($('#rf-jsonKeys').value), jsonKeyContains: csv($('#rf-jsonContains').value)
  };
}
function validateDef(def) {
  if (!def.id) throw new Error('Enter an identifier, for example acme_ticket.');
  if (!editingId && (state.custom[def.id] || L.getBuiltinRule(def.id))) throw new Error('A rule with id "' + def.id + '" already exists.');
  if (!def.patterns.length && !def.jsonKeys.length && !def.jsonKeyContains.length) throw new Error('Add at least one pattern or one JSON key.');
  return L.defineRule(materialize(def));
}
function wireEditor() {
  $('#addRuleBtn').addEventListener('click', () => openEditor(null));
  $('#rf-cancel').addEventListener('click', () => { $('#ruleEditor').hidden = true; editingId = null; });
  $('#ruleEditor').addEventListener('submit', (e) => {
    e.preventDefault(); const def = readEditor();
    try { validateDef(def); } catch (err) { showErr($('#rf-err'), errMessage(err)); return; }
    state.custom[def.id] = def;
    if (!state.rules.some((r) => r.id === def.id)) state.rules.push({ id: def.id, enabled: true, kind: 'custom' });
    $('#ruleEditor').hidden = true; editingId = null; renderRules(); changed(); toast('Rule saved');
  });
  $('#rf-test').addEventListener('click', () => {
    const def = readEditor(); const out = $('#rf-testOut');
    try {
      const rule = validateDef(def);
      const text = srcFile ? '' : $('#inputText').value;
      if (!text) { out.textContent = 'Paste or load a log first.'; return; }
      const r = L.createSanitizer({ key, keyEncoding: state.keyEncoding, rules: [rule], aggressive: state.aggressive, report: { previewBytes: 0 } }).sanitizeText(text);
      out.textContent = r.report.totalMatches + ' match' + (r.report.totalMatches === 1 ? '' : 'es') + ', ' + r.report.replacements.length + ' distinct value' + (r.report.replacements.length === 1 ? '' : 's') + ' on this input.';
      showErr($('#rf-err'), '');
    } catch (err) { showErr($('#rf-err'), errMessage(err)); out.textContent = ''; }
  });
}

// ---------- option controls ----------
function renderNeverRuleSelect() {
  const sel = $('#neverRuleSel'); const cur = sel.value;
  sel.replaceChildren(...state.rules.map((r) => { const o = document.createElement('option'); o.value = r.id; o.textContent = ruleInfo(r).label; return o; }));
  if (cur && state.rules.some((r) => r.id === cur)) sel.value = cur;
  const entry = state.never.byRule.find((e) => e.ruleId === sel.value);
  $('#neverRuleValues').value = entry ? entry.values.join(', ') : '';
}
function syncControls() {
  $('#aggressive').checked = state.aggressive; $('#jsonMode').value = state.json;
  $('#keyInput').value = key; $('#keyEnc').value = state.keyEncoding;
  $('#alwaysValues').value = state.always.values.join('\n'); $('#alwaysPatterns').value = state.always.patterns.join('\n');
  $('#alwaysToken').value = state.always.token; $('#alwaysMode').value = state.always.mode;
  $('#neverValues').value = state.never.values.join('\n'); $('#neverPatterns').value = state.never.patterns.join('\n');
  $('#collectRepl').checked = state.report.replacements; $('#ctxChars').value = state.report.contextChars;
  $('#maxPerRule').value = state.report.maxReplacementsPerRule; $('#previewBytes').value = state.report.previewBytes;
  $('#maxLine').value = state.lines.maxLineChars; $('#overlap').value = state.lines.overlapChars;
  $('#dryRun').checked = state.ci.dryRun; $('#failOnMatch').checked = state.ci.failOnMatch;
  renderRules(); updateCounts();
}
function updateCounts() {
  $('#alwaysCount').textContent = state.always.values.length + state.always.patterns.length;
  $('#neverCount').textContent = state.never.values.length + state.never.patterns.length + state.never.byRule.reduce((n, e) => n + e.values.length, 0);
}
function wireControls() {
  const on = (sel, ev, fn) => $(sel).addEventListener(ev, fn);
  on('#aggressive', 'change', (e) => { state.aggressive = e.target.checked; changed(); });
  on('#jsonMode', 'change', (e) => { state.json = e.target.value; changed(); });
  on('#keyInput', 'input', (e) => { key = e.target.value.trim(); showErr($('#keyErr'), ''); changed(); });
  on('#keyEnc', 'change', (e) => { state.keyEncoding = e.target.value; changed(); });
  on('#keyGen', 'click', () => { key = L.generateKey(); state.keyEncoding = 'hex'; $('#keyInput').value = key; $('#keyEnc').value = 'hex'; showErr($('#keyErr'), ''); changed(); toast('New key'); });
  on('#keyCopy', 'click', () => copy(key, 'Key copied'));
  on('#keyShow', 'click', (e) => { const i = $('#keyInput'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; e.currentTarget.setAttribute('aria-pressed', String(show)); e.currentTarget.setAttribute('aria-label', show ? 'Hide key' : 'Show key'); });
  on('#alwaysValues', 'input', (e) => { state.always.values = lines(e.target.value); updateCounts(); changed(); });
  on('#alwaysPatterns', 'input', (e) => { state.always.patterns = lines(e.target.value); updateCounts(); changed(); });
  on('#alwaysToken', 'input', (e) => { state.always.token = e.target.value.trim().toUpperCase() || 'CUSTOM'; changed(); });
  on('#alwaysMode', 'change', (e) => { state.always.mode = e.target.value; changed(); });
  on('#neverValues', 'input', (e) => { state.never.values = lines(e.target.value); updateCounts(); changed(); });
  on('#neverPatterns', 'input', (e) => { state.never.patterns = lines(e.target.value); updateCounts(); changed(); });
  on('#neverRuleSel', 'change', () => renderNeverRuleSelect());
  on('#neverRuleValues', 'input', (e) => {
    const id = $('#neverRuleSel').value; const vals = csv(e.target.value);
    state.never.byRule = state.never.byRule.filter((x) => x.ruleId !== id); if (vals.length) state.never.byRule.push({ ruleId: id, values: vals });
    updateCounts(); changed();
  });
  const loadList = (inputSel, apply) => on(inputSel, 'change', async (e) => { const f = e.target.files[0]; if (!f) return; apply(lines(await f.text())); e.target.value = ''; syncControls(); changed(); toast('List loaded: ' + f.name); });
  loadList('#alwaysFile', (v) => { state.always.values = Array.from(new Set(state.always.values.concat(v))); });
  loadList('#neverFile', (v) => { state.never.values = Array.from(new Set(state.never.values.concat(v))); });
  on('#collectRepl', 'change', (e) => { state.report.replacements = e.target.checked; changed(); });
  on('#ctxChars', 'input', (e) => { state.report.contextChars = e.target.value; changed(); });
  on('#maxPerRule', 'input', (e) => { state.report.maxReplacementsPerRule = e.target.value; changed(); });
  on('#previewBytes', 'input', (e) => { state.report.previewBytes = e.target.value; changed(); });
  on('#maxLine', 'input', (e) => { state.lines.maxLineChars = e.target.value; changed(); });
  on('#overlap', 'input', (e) => { state.lines.overlapChars = e.target.value; changed(); });
  on('#dryRun', 'change', (e) => { state.ci.dryRun = e.target.checked; changed(); });
  on('#failOnMatch', 'change', (e) => { state.ci.failOnMatch = e.target.checked; changed(); });
  on('#resetAll', 'click', () => { state = defaultState(); key = L.generateKey(); syncControls(); changed(); toast('Defaults restored'); });
}
