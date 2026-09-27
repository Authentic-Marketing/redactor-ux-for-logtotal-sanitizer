#!/usr/bin/env node
// bump-library.mjs
// Moves the repo's sources to a published version of @socprime/logtotal-sanitizer: rewrites
// pkg/sanitizer.iife.js and the LIB constant in ui/app-1.js. Run assemble.py afterwards.
// Same fetch and bundle steps as bridge/update-page.mjs, which patches a built page instead.
//
//   node bump-library.mjs <version>
//
// Run from the build directory. Needs Node 20 or newer, npm, tar, and network access to npm.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PKG = '@socprime/logtotal-sanitizer';
const ESBUILD = 'esbuild@0.27.7';
const APP = 'ui/app-1.js';
const OUT = 'pkg/sanitizer.iife.js';
const wanted = process.argv[2];
if (!wanted) { console.error('Usage: node bump-library.mjs <version>'); process.exit(2); }
function run(cmd, args) { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 }); }

const app = readFileSync(APP, 'utf8');
const LIB_RE = /const LIB = \{ name: '([^']+)', version: '([^']+)', published: '([^']+)' \};/;
const lib = app.match(LIB_RE);
if (!lib) { console.error('LIB constant not found in ' + APP + '.'); process.exit(1); }

const dir = mkdtempSync(join(tmpdir(), 'logtotal-bump-'));
run('npm', ['pack', PKG + '@' + wanted, '--pack-destination', dir, '--silent']);
const tgz = readdirSync(dir).find((f) => f.endsWith('.tgz'));
if (!tgz) { console.error('npm pack produced no tarball.'); process.exit(1); }
run('tar', ['-xzf', join(dir, tgz), '-C', dir]);
const pkgDir = join(dir, 'package');
const version = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
if (version !== wanted) { console.error('Asked for ' + wanted + ', npm gave ' + version + '.'); process.exit(1); }

const times = JSON.parse(run('npm', ['view', PKG, 'time', '--json']));
const published = String(times[version] || '').slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) { console.error('No publish date on npm for ' + version + '.'); process.exit(1); }

const bundle = run('npx', ['--yes', ESBUILD, join(pkgDir, 'index.js'), '--bundle', '--format=iife', '--global-name=LogTotalSanitizer', '--minify', '--target=es2022', '--log-level=warning']).trim();
if (!bundle.startsWith('var LogTotalSanitizer=') || bundle.includes('</scr' + 'ipt')) { console.error('The bundle does not look right. Nothing written.'); process.exit(1); }

writeFileSync(OUT, bundle + '\n', 'utf8');
writeFileSync(APP, app.replace(lib[0], "const LIB = { name: '" + PKG + "', version: '" + version + "', published: '" + published + "' };"), 'utf8');
console.log('Library ' + lib[2] + ' -> ' + version + ' (published ' + published + ').');
