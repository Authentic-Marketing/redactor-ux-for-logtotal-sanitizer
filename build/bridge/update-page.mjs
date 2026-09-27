#!/usr/bin/env node
// update-page.mjs
// Replaces the copy of @socprime/logtotal-sanitizer bundled inside the LogTotal Sanitizer page
// with a newer published version, in place, and writes a backup next to the page.
//
//   node update-page.mjs <path-to-page.html> [version]
//
// Needs Node 20 or newer, npm, tar, and network access to npm. Nothing else is changed in the page.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PKG = '@socprime/logtotal-sanitizer';
const ESBUILD = 'esbuild@0.27.7';
const [page, wanted] = process.argv.slice(2);
if (!page || !existsSync(page)) { console.error('Usage: node update-page.mjs <page.html> [version]'); process.exit(2); }
const win = process.platform === 'win32';
function run(cmd, args) { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell: win, maxBuffer: 64 * 1024 * 1024 }); }

const html = readFileSync(page, 'utf8');
const START = '<!-- bundle:start ';
const END = '<!-- bundle:end -->';
const s = html.indexOf(START);
const e = html.indexOf(END);
const libMatch = html.match(/const LIB = \{ name: '([^']+)', version: '([^']+)', published: '([^']+)' \};/);
if (s < 0 || e < 0 || e < s || !libMatch) { console.error('This file does not look like the LogTotal Sanitizer page: bundle markers not found.'); process.exit(2); }
const current = libMatch[2];
const spec = PKG + '@' + (wanted || 'latest');
console.log('Page bundles ' + PKG + ' ' + current + '. Fetching ' + spec + ' from npm.');
const dir = mkdtempSync(join(tmpdir(), 'logtotal-update-'));
run('npm', ['pack', spec, '--pack-destination', dir, '--silent']);
const tgz = readdirSync(dir).find((f) => f.endsWith('.tgz'));
if (!tgz) { console.error('npm pack produced no tarball.'); process.exit(1); }
run('tar', ['-xzf', join(dir, tgz), '-C', dir]);
const pkgDir = join(dir, 'package');
const version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
if (version === current && !wanted) { console.log('Already at the latest version (' + current + '). Nothing changed.'); process.exit(0); }
let published = 'unknown';
try {
  const times = JSON.parse(run('npm', ['view', PKG + '@' + version, 'time', '--json']));
  const stamp = typeof times === 'string' ? times : (times && times[version]) || '';
  published = String(stamp).slice(0, 10) || published;
} catch (err) { /* the date is cosmetic */ }
console.log('Bundling ' + version + ' with ' + ESBUILD + '.');
const bundle = run('npx', ['--yes', ESBUILD, join(pkgDir, 'index.js'), '--bundle', '--format=iife', '--global-name=LogTotalSanitizer', '--minify', '--target=es2022', '--log-level=warning']).trim();
if (!bundle.includes('LogTotalSanitizer') || bundle.includes('</scr' + 'ipt')) { console.error('The bundle does not look right. Page left unchanged.'); process.exit(1); }
const block = START + PKG + ' ' + version + ' -->\n<scr' + 'ipt>\n' + bundle + '\n</scr' + 'ipt>\n';
const next = (html.slice(0, s) + block + html.slice(e)).replace(libMatch[0], "const LIB = { name: '" + PKG + "', version: '" + version + "', published: '" + published + "' };");
console.log('Replacing ' + current + ' with ' + version + ' in ' + page + '.');
const backup = page + '.bak-' + current + '-' + Date.now();
copyFileSync(page, backup);
writeFileSync(page, next, 'utf8');
console.log('Updated ' + page + ' to ' + version + ' (published ' + published + '). Backup: ' + backup);
