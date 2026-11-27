#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - run every verification suite
   ---------------------------------------------------------------------
   One command that runs the checks in a fixed order and prints a single
   summary. It does not replace them: each suite keeps its own output, its
   own assertions and its own exit code, and this runner only reports what
   those suites said.

     node tools/verify-all.js              every suite
     node tools/verify-all.js --static     skip the browser suites
     node tools/verify-all.js --only=nav   one suite, by short name

   Exit code 0 only when every suite that ran exited 0.
   ===================================================================== */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const SUITES = [
  { short: 'nav', file: 'tools/verify-nav.js', kind: 'static' },
  { short: 'story', file: 'tools/verify-story.js', kind: 'static' },
  { short: 'lamplight', file: 'tools/verify-lamplight.js', kind: 'static' },
  { short: 'signal-path', file: 'tools/verify-signal-path.js', kind: 'static' },
  { short: 'gallery', file: 'tools/verify-gallery.js', kind: 'static' },
  { short: 'social-room', file: 'tools/verify-social-room.js', kind: 'static' },
  { short: 'archive', file: 'tools/verify-archive.js', kind: 'static' },
  { short: 'creator-studio', file: 'tools/verify-creator-studio.js', kind: 'static' },
  { short: 'media', file: 'tools/verify-media.js', kind: 'static' },
  { short: 'archive-ui', file: 'tools/verify-archive-ui.cjs', kind: 'browser' },
  { short: 'gallery-ui', file: 'tools/verify-gallery-ui.cjs', kind: 'browser' },
  { short: 'social-room-ui', file: 'tools/verify-social-room-ui.cjs', kind: 'browser' },
  { short: 'creator-studio-ui', file: 'tools/verify-creator-studio-ui.cjs', kind: 'browser' }
];

const args = process.argv.slice(2);
const staticOnly = args.indexOf('--static') !== -1;
const onlyArg = args.find(function (a) { return a.indexOf('--only=') === 0; });
const only = onlyArg ? onlyArg.slice('--only='.length) : null;

const selected = SUITES.filter(function (suite) {
  if (only && suite.short !== only) { return false; }
  if (staticOnly && suite.kind === 'browser') { return false; }
  return true;
});

if (!selected.length) {
  console.log('No suite matched. Known names: ' + SUITES.map(function (s) { return s.short; }).join(', '));
  process.exit(1);
}

const fs = require('fs');
const rows = [];

selected.forEach(function (suite) {
  const full = path.join(ROOT, suite.file);
  process.stdout.write('\n=== ' + suite.short + ' (' + suite.file + ') ===\n');

  if (!fs.existsSync(full)) {
    console.log('MISSING');
    rows.push({ short: suite.short, status: 'MISSING' });
    return;
  }

  const run = spawnSync(process.execPath, [full], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });

  const output = (run.stdout || '') + (run.stderr || '');
  console.log(output.trim());

  rows.push({
    short: suite.short,
    status: run.status === 0 ? 'PASS' : 'FAIL',
    code: run.status
  });
});

const passed = rows.filter(function (r) { return r.status === 'PASS'; }).length;
const failed = rows.filter(function (r) { return r.status !== 'PASS'; });

console.log('\n================ summary ================');
rows.forEach(function (row) {
  console.log((row.status + '      ').slice(0, 8) + row.short + (row.code !== undefined && row.code !== 0 ? '  (exit ' + row.code + ')' : ''));
});
console.log('=========================================');
console.log(passed + ' of ' + rows.length + ' suites passed');

if (failed.length) {
  console.log('RESULT some suites failed: ' + failed.map(function (f) { return f.short; }).join(', '));
  process.exit(1);
}
console.log('RESULT every suite passed');
