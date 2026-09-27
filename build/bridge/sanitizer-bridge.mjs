#!/usr/bin/env node
// sanitizer-bridge.mjs
// Loopback HTTP bridge so the LogTotal Sanitizer page can use the copy of
// @socprime/logtotal-sanitizer installed on this machine instead of the copy bundled in the page.
// Binds 127.0.0.1 only, so nothing outside this machine can reach it. No auth, no TLS, no logging
// of content. Stop it with Ctrl+C.
//
//   npm install @socprime/logtotal-sanitizer   (in the folder where this script lives)
//   node sanitizer-bridge.mjs                  (optional port: node sanitizer-bridge.mjs 7412)
//   node sanitizer-bridge.mjs --allow-origin https://example.test   (add an origin)
//
// Only pages from a known origin may call it. A page opened from disk sends the origin
// "null" and is allowed. Anything else is refused with 403 and no CORS headers, so an
// unknown page cannot even tell the bridge is here. Requests are capped per second.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';

const PKG = '@socprime/logtotal-sanitizer';
const args = process.argv.slice(2);
const flagValues = (name) => args.reduce((acc, a, i) => (a === name && args[i + 1] ? acc.concat(args[i + 1]) : acc), []);
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--allow-origin' && args[i - 1] !== '--max-rps');
const PORT = Number(positional[0] || process.env.PORT || 7412);
const MAX_BYTES = 64 * 1024 * 1024;
const MAX_RPS = Number(flagValues('--max-rps')[0] || process.env.SANITIZER_BRIDGE_MAX_RPS || 20);

// Origins allowed to call this bridge. "null" is a page opened straight from disk.
const ALLOWED_ORIGINS = new Set([
  'null',
  'https://authentic-marketing.github.io',
  'https://authenticmarketing.xyz',
  'https://www.authenticmarketing.xyz'
]
  .concat(flagValues('--allow-origin'))
  .concat(String(process.env.SANITIZER_BRIDGE_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)));

let lib;
let version = 'unknown';
try {
  lib = await import(PKG);
  version = createRequire(import.meta.url)(PKG + '/package.json').version;
} catch (e) {
  console.error('Cannot load ' + PKG + ' from ' + process.cwd());
  console.error('Install it next to this script, then start the bridge again:');
  console.error('  npm install ' + PKG);
  process.exit(1);
}
const { createSanitizer, defineRule } = lib;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Private-Network': 'true',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };
}
const BARE_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
function send(res, status, body, origin) {
  res.writeHead(status, origin ? corsHeaders(origin) : BARE_HEADERS);
  res.end(JSON.stringify(body));
}
// A request with no Origin header is not a browser page: curl, a script, the CLI. Those
// already run on this machine and the allowlist exists to stop other pages, not tools.
const refused = new Set();
function originAllowed(origin) { return origin === undefined || ALLOWED_ORIGINS.has(origin); }
function noteRefusal(origin) {
  if (refused.has(origin)) return;
  refused.add(origin);
  console.log('Refused a request from ' + origin + '. Allow it with: --allow-origin ' + origin);
}
let windowStart = 0;
let windowCount = 0;
function overRate() {
  const now = Date.now();
  if (now - windowStart >= 1000) { windowStart = now; windowCount = 0; }
  windowCount += 1;
  return windowCount > MAX_RPS;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > MAX_BYTES) { reject(new Error('Body over ' + MAX_BYTES + ' bytes. Use the CLI for a file this large.')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function toOptions(o) {
  const opts = Object.assign({}, o || {});
  if (Array.isArray(opts.rules)) opts.rules = opts.rules.map((r) => (typeof r === 'string' ? r : defineRule(r)));
  if (Array.isArray(opts.extraRules)) opts.extraRules = opts.extraRules.map(defineRule);
  return opts;
}
const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (!originAllowed(origin)) {
    noteRefusal(origin);
    res.writeHead(403, BARE_HEADERS);
    res.end(JSON.stringify({ error: 'Origin not allowed.' }));
    return;
  }
  // Preflight is answered before the cap. A refused preflight reads to the browser as a
  // CORS failure with no explanation, so capping it would hide a 429 behind a wrong message.
  if (req.method === 'OPTIONS') { res.writeHead(204, origin ? corsHeaders(origin) : BARE_HEADERS); res.end(); return; }
  if (overRate()) {
    res.writeHead(429, Object.assign({ 'Retry-After': '1' }, origin ? corsHeaders(origin) : BARE_HEADERS));
    res.end(JSON.stringify({ error: 'Over ' + MAX_RPS + ' requests per second.' }));
    return;
  }
  if (req.method === 'GET' && req.url === '/health') { send(res, 200, { name: PKG, version, node: process.version, pid: process.pid, maxBytes: MAX_BYTES }, origin); return; }
  if (req.method === 'POST' && req.url === '/sanitize') {
    try {
      const body = JSON.parse(await readBody(req));
      if (typeof body.text !== 'string') { send(res, 400, { error: 'text must be a string' }, origin); return; }
      const t0 = performance.now();
      const { output, report } = createSanitizer(toOptions(body.options)).sanitizeText(body.text);
      send(res, 200, { output, report, ms: performance.now() - t0, version }, origin);
    } catch (e) { send(res, 400, { error: e && e.message ? e.message : String(e), code: e && e.code ? e.code : undefined }, origin); }
    return;
  }
  send(res, 404, { error: 'Unknown route. GET /health or POST /sanitize.' }, origin);
});
server.on('error', (e) => { console.error('Bridge could not start on port ' + PORT + ': ' + e.message); process.exit(1); });
server.listen(PORT, '127.0.0.1', () => {
  console.log('Sanitizer bridge: http://127.0.0.1:' + PORT + '  (' + PKG + ' ' + version + ', Node ' + process.version + ')');
  console.log('Loopback only. Nothing is written to disk. Ctrl+C to stop.');
  console.log('Allowed origins: ' + [...ALLOWED_ORIGINS].join(', ') + '  (cap ' + MAX_RPS + ' requests per second)');
});
