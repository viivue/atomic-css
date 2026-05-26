#!/usr/bin/env node

/**
 * @viivue/atomic-css — minify script
 *
 * Minifies dist/atomic.css → dist/atomic.min.css using csso.
 * Called by `npm run optimize` as the final step of the prod build pipeline.
 *
 * Usage:
 *   node bin/optimize.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const csso = require('csso');

// ── Paths ─────────────────────────────────────────────────────────────────────
const input  = path.resolve(process.cwd(), 'dist/atomic.css');
const output = path.resolve(process.cwd(), 'dist/atomic.min.css');

// ── Read ──────────────────────────────────────────────────────────────────────
if (!fs.existsSync(input)) {
    console.error(`[optimize] Input file not found: ${path.relative(process.cwd(), input)}`);
    console.error('  Run "npm run sass:build" first.');
    process.exit(1);
}

const source = fs.readFileSync(input, 'utf8');
const original = Buffer.byteLength(source, 'utf8');

if (original === 0) {
    console.error('[optimize] Input file is empty.');
    process.exit(1);
}

// ── Minify ────────────────────────────────────────────────────────────────────
let css;
const start = Date.now();

try {
    ({ css } = csso.minify(source));
} catch (err) {
    console.error(`[optimize] Minification failed: ${err.message}`);
    process.exit(1);
}

const elapsed = Date.now() - start;

// ── Write ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(output, css);

// ── Stats ─────────────────────────────────────────────────────────────────────
const compressed = Buffer.byteLength(css, 'utf8');
const saving     = original - compressed;

console.log(`\nSource:     ${path.relative(process.cwd(), input)}`);
console.log(`Original:   ${original.toLocaleString()} bytes`);
console.log(`Compressed: ${compressed.toLocaleString()} bytes (${(compressed / original * 100).toFixed(2)}%)`);
console.log(`Saving:     ${saving.toLocaleString()} bytes (${(saving / original * 100).toFixed(2)}%)`);
console.log(`Time:       ${elapsed} ms`);
